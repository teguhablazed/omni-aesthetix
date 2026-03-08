-- Migration to itemize deposits
ALTER TABLE public.deposits
ADD COLUMN IF NOT EXISTS target_type TEXT CHECK (target_type IN ('cash', 'package', 'product')) DEFAULT 'cash',
ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES public.packages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.stocks(id) ON DELETE SET NULL;

-- Update existing records to purely cash if needed
UPDATE public.deposits SET target_type = 'cash' WHERE target_type IS NULL;
