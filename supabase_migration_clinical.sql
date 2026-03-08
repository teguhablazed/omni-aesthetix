-- Migration script for Clinical Workflow Improvements

-- 1. Update Patients table
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS nik TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
ADD COLUMN IF NOT EXISTS phone_2 TEXT;

-- 2. Update Profiles (Staff/Doctors)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS str_number TEXT,
ADD COLUMN IF NOT EXISTS sip_number TEXT,
ADD COLUMN IF NOT EXISTS str_file_url TEXT,
ADD COLUMN IF NOT EXISTS sip_file_url TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS phone_1 TEXT,
ADD COLUMN IF NOT EXISTS phone_2 TEXT,
ADD COLUMN IF NOT EXISTS specialty TEXT,
ADD COLUMN IF NOT EXISTS division TEXT,
ADD COLUMN IF NOT EXISTS service_type_ids TEXT[], -- Array of service type IDs
ADD COLUMN IF NOT EXISTS fee_percentage DECIMAL(5, 2) DEFAULT 0;

-- 3. Payment Types
CREATE TABLE IF NOT EXISTS public.payment_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    category TEXT CHECK (category IN ('Cash', 'Transfer', 'EDC', 'Credit', 'Other')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Seed Payment Types
INSERT INTO public.payment_types (name, category) VALUES
('Invoice', 'Other'),
('Potong Fee', 'Other'),
('Tunai', 'Cash'),
('Transfer Rek BCA', 'Transfer'),
('Transfer Rek Mandiri', 'Transfer'),
('Transfer Rek BRI', 'Transfer'),
('EDC BCA - Debit BCA', 'EDC'),
('EDC BCA - Debit Bank Lain', 'EDC'),
('EDC BCA - Kredit BCA', 'EDC'),
('EDC BCA - Kredit BCA Cicilan 3 Bulan', 'EDC'),
('EDC Mandiri', 'EDC'),
('EDC BRI', 'EDC')
ON CONFLICT (name) DO NOTHING;

-- 4. Deposits
CREATE TABLE IF NOT EXISTS public.deposits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_number TEXT UNIQUE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    product_ids UUID[], -- Array of products/services included in deposit
    package_id UUID, -- If it's a specific package
    amount DECIMAL(12, 2) NOT NULL,
    remaining_balance DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Enhanced Transactions
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS transaction_number TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS is_closed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS assistant_1_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS assistant_2_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS doctor_service_type TEXT,
ADD COLUMN IF NOT EXISTS assistant_1_service_type TEXT,
ADD COLUMN IF NOT EXISTS assistant_2_service_type TEXT,
ADD COLUMN IF NOT EXISTS used_deposit_amount DECIMAL(12, 2) DEFAULT 0;

-- 6. Transaction Items (for multi-product transactions)
CREATE TABLE IF NOT EXISTS public.transaction_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
    treatment_id UUID REFERENCES public.treatments(id),
    product_id UUID REFERENCES public.stocks(id),
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(12, 2),
    total_price DECIMAL(12, 2),
    doctor_id UUID REFERENCES public.profiles(id),
    assistant_1_id UUID REFERENCES public.profiles(id),
    assistant_2_id UUID REFERENCES public.profiles(id),
    pay_with_deposit BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Invoices and Payments
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number TEXT UNIQUE,
    patient_id UUID REFERENCES public.patients(id),
    total_amount DECIMAL(12, 2) NOT NULL,
    status TEXT CHECK (status IN ('unpaid', 'partially_paid', 'paid', 'cancelled')) DEFAULT 'unpaid',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_number TEXT UNIQUE,
    invoice_id UUID REFERENCES public.invoices(id),
    payment_type_id UUID REFERENCES public.payment_types(id),
    amount_paid DECIMAL(12, 2) NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Link transactions to invoices
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(id);

-- Enable RLS for new tables
ALTER TABLE public.payment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Payment types viewable by staff" ON public.payment_types FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Deposits viewable by staff" ON public.deposits FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Transaction items viewable by staff" ON public.transaction_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Invoices viewable by staff" ON public.invoices FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Payments viewable by staff" ON public.payments FOR ALL USING (auth.role() = 'authenticated');
