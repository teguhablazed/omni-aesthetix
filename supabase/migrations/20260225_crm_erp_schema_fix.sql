-- CRM & ERP Schema Alignment Migration
-- Project: Omni AesthetiX

-- 1. Patients: add clinical profile fields used in app
ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS risk_level TEXT;

-- 2. Transactions: add optional payment_method used by POS
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS payment_method TEXT;

