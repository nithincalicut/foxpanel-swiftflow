-- Add tracking number field to leads table
ALTER TABLE public.leads 
ADD COLUMN tracking_number TEXT;

-- Add index for tracking number lookups
CREATE INDEX idx_leads_tracking_number ON public.leads(tracking_number) WHERE tracking_number IS NOT NULL;

-- Add tracking status field
ALTER TABLE public.leads 
ADD COLUMN tracking_status TEXT CHECK (tracking_status IN ('pending_pickup', 'in_transit', 'out_for_delivery', 'delivered', 'failed'));

-- Add tracking updated timestamp
ALTER TABLE public.leads 
ADD COLUMN tracking_updated_at TIMESTAMP WITH TIME ZONE;