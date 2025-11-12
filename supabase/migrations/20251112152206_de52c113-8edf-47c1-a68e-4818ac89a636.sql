-- Remove tracking_status column from leads table
ALTER TABLE public.leads DROP COLUMN IF EXISTS tracking_status;
ALTER TABLE public.leads DROP COLUMN IF EXISTS tracking_updated_at;