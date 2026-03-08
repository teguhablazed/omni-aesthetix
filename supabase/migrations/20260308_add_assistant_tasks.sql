-- Migration to add assistant task types
ALTER TABLE public.transaction_items
ADD COLUMN IF NOT EXISTS assistant_1_task TEXT,
ADD COLUMN IF NOT EXISTS assistant_2_task TEXT;
