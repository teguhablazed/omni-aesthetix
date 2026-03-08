-- Migration to add detailed payment methods
INSERT INTO public.payment_types (name, category) VALUES
-- We already have some EDC/Transfer in previous migration, let's ensure the full list from gap analysis:
('Potong Fee', 'Other'),
('EDC BCA - Debit', 'EDC'),
('EDC BCA - Kredit', 'EDC'),
('EDC BCA - Cicilan', 'EDC'),
('EDC Mandiri - Debit/Kredit', 'EDC'),
('EDC BRI - Debit/Kredit', 'EDC'),
('Transfer Rekening BCA', 'Transfer'),
('Transfer Rekening Mandiri', 'Transfer'),
('Transfer Rekening BRI', 'Transfer')
ON CONFLICT (name) DO NOTHING;
