CREATE OR REPLACE FUNCTION process_payment(
    p_invoice_ids UUID[],
    p_payments JSONB
) RETURNS TEXT AS $$
DECLARE
    v_receipt_number TEXT;
    v_payment RECORD;
    v_inv_id UUID;
BEGIN
    v_receipt_number := 'RCP-' || TO_CHAR(NOW(), 'YYYYMMDDHH24MISS');

    -- Mark all invoices as paid
    UPDATE invoices SET status = 'paid' WHERE id = ANY(p_invoice_ids);
    
    -- Mark all associated transactions as paid
    UPDATE transactions SET status = 'paid' WHERE invoice_id = ANY(p_invoice_ids);

    -- Insert payment records for each invoice
    FOR v_inv_id IN SELECT UNNEST(p_invoice_ids) LOOP
        FOR v_payment IN SELECT * FROM JSONB_TO_RECORDSET(p_payments) AS x(payment_type_id UUID, amount_paid NUMERIC) LOOP
            INSERT INTO payments (receipt_number, invoice_id, payment_type_id, amount_paid, payment_date)
            VALUES (v_receipt_number, v_inv_id, v_payment.amount_paid / CARDINALITY(p_invoice_ids), NOW());
        END LOOP;
    END LOOP;
    
    RETURN v_receipt_number;
END;
$$ LANGUAGE plpgsql;
