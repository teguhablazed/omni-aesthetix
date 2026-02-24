-- SQL Migration: Add outreach status and draft columns
-- Project: Omni AesthetiX

ALTER TABLE public.medical_records ADD COLUMN IF NOT EXISTS outreach_completed BOOLEAN DEFAULT false;
ALTER TABLE public.medical_records ADD COLUMN IF NOT EXISTS engagement_draft TEXT;
