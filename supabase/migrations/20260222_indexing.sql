-- SQL Migration: Indexing for Production Scale
-- Project: Omni AesthetiX

-- 1. Indexing Transactions for fast patient-history lookups
CREATE INDEX IF NOT EXISTS idx_transactions_patient_id ON transactions(patient_id);

-- 2. Indexing Medical Records for fast clinical timeline lookups
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id ON medical_records(patient_id);

-- 3. Indexing Stocks for analytical queries and dashboards
CREATE INDEX IF NOT EXISTS idx_stocks_created_at ON stocks(created_at);

-- 4. Indexing Treatment recommendations for engagement center performance
CREATE INDEX IF NOT EXISTS idx_medical_records_next_visit ON medical_records(next_visit_recommendation);
