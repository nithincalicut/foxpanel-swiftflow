-- Create enum types for payment and delivery methods
CREATE TYPE payment_type AS ENUM ('full_payment', 'partial_payment', 'cod');
CREATE TYPE delivery_method AS ENUM ('courier', 'store_collection');

-- Add payment_type and delivery_method columns to leads table
ALTER TABLE public.leads
ADD COLUMN payment_type payment_type,
ADD COLUMN delivery_method delivery_method;

-- Add indexes for better query performance
CREATE INDEX idx_leads_payment_type ON public.leads(payment_type);
CREATE INDEX idx_leads_delivery_method ON public.leads(delivery_method);

-- Add comment for documentation
COMMENT ON COLUMN public.leads.payment_type IS 'Type of payment: full_payment, partial_payment (50%), or cod';
COMMENT ON COLUMN public.leads.delivery_method IS 'Delivery method: courier or store_collection';