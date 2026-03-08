-- Migration script for Smart POS Integration

-- 1. Patient Packages (Tracking remaining sessions)
CREATE TABLE IF NOT EXISTS public.patient_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    package_id UUID REFERENCES public.packages(id) ON DELETE CASCADE,
    total_sessions INTEGER NOT NULL,
    remaining_sessions INTEGER NOT NULL,
    purchase_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    expiry_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Package Redemptions (History of use)
CREATE TABLE IF NOT EXISTS public.package_redemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
    patient_package_id UUID REFERENCES public.patient_packages(id) ON DELETE CASCADE,
    sessions_used INTEGER DEFAULT 1,
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Improved Stock Deduction Trigger
-- This trigger will now listen to transaction_items to decrement stock correctly for each item
CREATE OR REPLACE FUNCTION handle_item_stock_reduction()
RETURNS TRIGGER AS $$
DECLARE
    current_qty DECIMAL(10, 2);
BEGIN
    -- Only reduce stock if it's a product (stock_id is not null)
    IF NEW.product_id IS NOT NULL THEN
        -- Check current stock
        SELECT current_stock INTO current_qty FROM public.stocks WHERE id = NEW.product_id;
        
        IF current_qty < NEW.quantity THEN
            RAISE EXCEPTION 'Insufficient stock for product id %', NEW.product_id;
        END IF;

        -- Deduct stock
        UPDATE public.stocks
        SET current_stock = current_stock - NEW.quantity,
            updated_at = now()
        WHERE id = NEW.product_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remove old trigger if it exists and create new one on transaction_items
DROP TRIGGER IF EXISTS trigger_reduce_item_stock ON public.transaction_items;
CREATE TRIGGER trigger_reduce_item_stock
AFTER INSERT ON public.transaction_items
FOR EACH ROW EXECUTE FUNCTION handle_item_stock_reduction();

-- 4. RLS Configuration
ALTER TABLE public.patient_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_redemptions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Patient packages viewable by staff" ON public.patient_packages FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Redemptions viewable by staff" ON public.package_redemptions FOR ALL USING (auth.role() = 'authenticated');
