-- Refined Stock Management Trigger V2
-- Ensuring stock is only deducted when transaction status is 'paid' or 'completed'

-- 1. Ensure Stocks have a price column for retail sales
ALTER TABLE public.stocks 
ADD COLUMN IF NOT EXISTS price DECIMAL(12, 2) DEFAULT 0;

-- 2. Add tracking column to transaction_items
ALTER TABLE public.transaction_items 
ADD COLUMN IF NOT EXISTS is_stock_deducted BOOLEAN DEFAULT FALSE;

-- 3. Core Stock Deduction Function
CREATE OR REPLACE FUNCTION process_stock_deduction(item_id UUID)
RETURNS VOID AS $$
DECLARE
    item_record RECORD;
    trans_record RECORD;
    current_qty DECIMAL(10, 2);
BEGIN
    -- Fetch item and transaction data
    SELECT * INTO item_record FROM public.transaction_items WHERE id = item_id;
    SELECT * INTO trans_record FROM public.transactions WHERE id = item_record.transaction_id;

    -- Only proceed if:
    -- - It's a product (product_id is NOT NULL)
    -- - Hasn't been deducted yet
    -- - Transaction is 'completed' or 'paid'
    IF item_record.product_id IS NOT NULL 
       AND item_record.is_stock_deducted = FALSE 
       AND (trans_record.status = 'completed' OR trans_record.status = 'paid') THEN
        
        -- Check and Deduct
        SELECT current_stock INTO current_qty FROM public.stocks WHERE id = item_record.product_id FOR UPDATE;
        
        IF current_qty < item_record.quantity THEN
            RAISE EXCEPTION 'Insufficient stock for product % (Current: %, Needed: %)', 
                (SELECT name FROM public.stocks WHERE id = item_record.product_id), 
                current_qty, item_record.quantity;
        END IF;

        UPDATE public.stocks
        SET current_stock = current_stock - item_record.quantity,
            updated_at = now()
        WHERE id = item_record.product_id;

        -- Mark as deducted
        UPDATE public.transaction_items SET is_stock_deducted = TRUE WHERE id = item_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger Function for transaction_items (INSERT/UPDATE)
CREATE OR REPLACE FUNCTION trg_fn_transaction_item_stock()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM process_stock_deduction(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger Function for transactions (UPDATE status)
CREATE OR REPLACE FUNCTION trg_fn_transaction_status_stock()
RETURNS TRIGGER AS $$
DECLARE
    item RECORD;
BEGIN
    -- Only if status changed to completed/paid
    IF (NEW.status = 'completed' OR NEW.status = 'paid') 
       AND (OLD.status IS DISTINCT FROM NEW.status) THEN
        FOR item IN SELECT id FROM public.transaction_items WHERE transaction_id = NEW.id LOOP
            PERFORM process_stock_deduction(item.id);
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Attach Triggers
DROP TRIGGER IF EXISTS trg_item_stock_sync ON public.transaction_items;
CREATE TRIGGER trg_item_stock_sync
AFTER INSERT OR UPDATE OF product_id, quantity ON public.transaction_items
FOR EACH ROW EXECUTE FUNCTION trg_fn_transaction_item_stock();

DROP TRIGGER IF EXISTS trg_trans_stock_sync ON public.transactions;
CREATE TRIGGER trg_trans_stock_sync
AFTER UPDATE OF status ON public.transactions
FOR EACH ROW EXECUTE FUNCTION trg_fn_transaction_status_stock();

-- Cleanup old trigger if exists
DROP TRIGGER IF EXISTS trigger_reduce_item_stock ON public.transaction_items;
DROP TRIGGER IF EXISTS trigger_reduce_stock ON public.transactions;
