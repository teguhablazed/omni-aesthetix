-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles (Staff)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    role TEXT CHECK (role IN ('admin', 'staff', 'doctor')) DEFAULT 'staff',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Patients
CREATE TABLE public.patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    medical_history TEXT,
    ai_analysis JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Stocks (Inventory)
CREATE TABLE public.stocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    unit TEXT DEFAULT 'pcs',
    current_stock DECIMAL(10, 2) DEFAULT 0,
    low_stock_threshold DECIMAL(10, 2) DEFAULT 5,
    vendor TEXT,
    expiry_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT quantity_non_negative CHECK (current_stock >= 0)
);

-- 4. Treatments (Services)
CREATE TABLE public.treatments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Treatment Recipes (Inventory consumption)
CREATE TABLE public.treatment_recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    treatment_id UUID REFERENCES public.treatments(id) ON DELETE CASCADE,
    stock_id UUID REFERENCES public.stocks(id) ON DELETE CASCADE,
    usage_quantity DECIMAL(10, 2) NOT NULL,
    UNIQUE(treatment_id, stock_id)
);

-- 6. Transactions
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    treatment_id UUID REFERENCES public.treatments(id) ON DELETE SET NULL,
    staff_id UUID REFERENCES public.profiles(id),
    total_amount DECIMAL(12, 2) NOT NULL,
    status TEXT CHECK (status IN ('pending', 'completed', 'cancelled')) DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. PL/pgSQL function for stock reduction
CREATE OR REPLACE FUNCTION handle_stock_reduction()
RETURNS TRIGGER AS $$
DECLARE
    recipe_record RECORD;
    current_stock DECIMAL(10, 2);
BEGIN
    -- Only reduce stock if transaction is 'completed'
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        FOR recipe_record IN 
            SELECT stock_id, usage_quantity 
            FROM public.treatment_recipes 
            WHERE treatment_id = NEW.treatment_id
        LOOP
            -- Check current stock
            SELECT current_stock INTO current_stock FROM public.stocks WHERE id = recipe_record.stock_id;
            
            IF current_stock < recipe_record.usage_quantity THEN
                RAISE EXCEPTION 'Insufficient stock for items required in this treatment.';
            END IF;

            -- Deduct stock
            UPDATE public.stocks
            SET current_stock = current_stock - recipe_record.usage_quantity,
                updated_at = now()
            WHERE id = recipe_record.stock_id;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger on transactions
CREATE TRIGGER trigger_reduce_stock
AFTER INSERT OR UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION handle_stock_reduction();

-- 9. Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Patients are viewable by authenticated staff." ON public.patients FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Stocks are viewable by authenticated staff." ON public.stocks FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Treatments are viewable by authenticated staff." ON public.treatments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Recipes are viewable by authenticated staff." ON public.treatment_recipes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Transactions are viewable by authenticated staff." ON public.transactions FOR ALL USING (auth.role() = 'authenticated');
-- 10. Medical Records
CREATE TABLE public.medical_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    treatment_id UUID REFERENCES public.treatments(id) ON DELETE SET NULL,
    session_notes TEXT,
    satisfaction_score INT CHECK (satisfaction_score >= 1 AND satisfaction_score <= 10),
    next_visit_recommendation DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS for medical_records
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Medical records are viewable by authenticated staff." ON public.medical_records FOR ALL USING (auth.role() = 'authenticated');
