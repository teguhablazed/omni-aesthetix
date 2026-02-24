-- PROD_SEED.sql: Final Treatment Recipes & Data Mapping
-- Ensures production database has mapped inventory consumption

-- 1. Example Recipes (Map your actual Stock IDs here)
-- Note: Replace 'STOCK_UUID' with actual UUIDs from your production 'stocks' table.

-- Botox Treatment Recipe (Uses 5 units of Botox Stock)
-- INSERT INTO public.treatment_recipes (treatment_id, stock_id, usage_quantity)
-- VALUES ('TREATMENT_UUID_BOTOX', 'STOCK_UUID_BOTOX', 5.0)
-- ON CONFLICT (treatment_id, stock_id) DO UPDATE SET usage_quantity = EXCLUDED.usage_quantity;

-- Dermal Filler Recipe (Uses 1ml of Filler Stock)
-- INSERT INTO public.treatment_recipes (treatment_id, stock_id, usage_quantity)
-- VALUES ('TREATMENT_UUID_FILLER', 'STOCK_UUID_FILLER', 1.0)
-- ON CONFLICT (treatment_id, stock_id) DO UPDATE SET usage_quantity = EXCLUDED.usage_quantity;

-- 2. Verify Stock Reduction Trigger
-- The trigger 'trigger_reduce_stock' on 'transactions' is already active.
-- Use this script as a template to finalize your production mappings.
