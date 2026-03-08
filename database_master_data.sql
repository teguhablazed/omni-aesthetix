-- Migration script for Master Data Expansion (Doctors, Employees, Products/Services, Packages)

-- 1. Service Types (Formal table)
CREATE TABLE IF NOT EXISTS public.service_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Seed Service Types
INSERT INTO public.service_types (name) VALUES
('Consultation'),
('Treatment'),
('Procedure'),
('Injection'),
('Product Sale')
ON CONFLICT (name) DO NOTHING;

-- 2. Doctor Specific Service Fees
-- Allows a doctor to have a custom fee or percentage for a specific treatment
CREATE TABLE IF NOT EXISTS public.doctor_service_fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    treatment_id UUID REFERENCES public.treatments(id) ON DELETE CASCADE,
    fee_amount DECIMAL(12, 2), -- Fixed amount fee
    fee_percentage DECIMAL(5, 2), -- Percentage of treatment price
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(doctor_id, treatment_id)
);

-- 3. Packages (Bundles)
CREATE TABLE IF NOT EXISTS public.packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    base_price DECIMAL(12, 2) NOT NULL, -- Sum of individual items
    discount_price DECIMAL(12, 2) NOT NULL, -- Final package price
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Package Items
CREATE TABLE IF NOT EXISTS public.package_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    package_id UUID REFERENCES public.packages(id) ON DELETE CASCADE,
    treatment_id UUID REFERENCES public.treatments(id) ON DELETE CASCADE,
    stock_id UUID REFERENCES public.stocks(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. RLS Configuration
ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_service_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_items ENABLE ROW LEVEL SECURITY;

-- Policies (Viewable/Manageable by authenticated staff/admin)
CREATE POLICY "Service types viewable by staff" ON public.service_types FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Doctor fees viewable by staff" ON public.doctor_service_fees FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Packages viewable by staff" ON public.packages FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Package items viewable by staff" ON public.package_items FOR ALL USING (auth.role() = 'authenticated');
