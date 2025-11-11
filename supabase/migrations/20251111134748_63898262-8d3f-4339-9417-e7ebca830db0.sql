-- Add address and price fields to leads table
ALTER TABLE public.leads
ADD COLUMN customer_address TEXT,
ADD COLUMN price_aed DECIMAL(10, 2);

-- Add comment for documentation
COMMENT ON COLUMN public.leads.customer_address IS 'Customer delivery address';
COMMENT ON COLUMN public.leads.price_aed IS 'Price in AED (United Arab Emirates Dirham)';