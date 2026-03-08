-- Migration to add no_rm to patients
ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS no_rm TEXT UNIQUE;

-- Generate random no_rm for existing patients who don't have one
-- To ensure uniqueness, we use a combination of RM-YYYYMM- and a substring of their ID
UPDATE public.patients
SET no_rm = 'RM-' || to_char(created_at, 'YYYYMM') || '-' || upper(substring(id::text from 1 for 4))
WHERE no_rm IS NULL;

-- Function to auto-generate no_rm
CREATE OR REPLACE FUNCTION generate_no_rm()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.no_rm IS NULL OR NEW.no_rm = '' THEN
        -- Using NEW.id requires UUID to be generated before this trigger (which is default)
        NEW.no_rm := 'RM-' || to_char(CURRENT_DATE, 'YYYYMM') || '-' || upper(substring(NEW.id::text from 1 for 4));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function before insert
DROP TRIGGER IF EXISTS set_no_rm ON public.patients;
CREATE TRIGGER set_no_rm
BEFORE INSERT ON public.patients
FOR EACH ROW
EXECUTE FUNCTION generate_no_rm();
