-- Add production_manager to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'production_manager';

-- Add packing_date field to track when items are packed
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS packing_date DATE;

COMMENT ON COLUMN public.leads.packing_date IS 'Date when the order was packed, set by production team';