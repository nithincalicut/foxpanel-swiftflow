-- Create lead_items table to support multiple products per lead
CREATE TABLE public.lead_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  product_type product_type NOT NULL,
  size TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price_aed NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on lead_items
ALTER TABLE public.lead_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for lead_items (same access pattern as leads)
CREATE POLICY "Users can view items of their leads"
ON public.lead_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = lead_items.lead_id
    AND (
      auth.uid() = leads.assigned_to 
      OR auth.uid() = leads.created_by 
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

CREATE POLICY "Users can insert items for their leads"
ON public.lead_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = lead_items.lead_id
    AND (
      auth.uid() = leads.assigned_to 
      OR auth.uid() = leads.created_by 
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

CREATE POLICY "Users can update items of their leads"
ON public.lead_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = lead_items.lead_id
    AND (
      auth.uid() = leads.assigned_to 
      OR auth.uid() = leads.created_by 
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

CREATE POLICY "Users can delete items of their leads"
ON public.lead_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = lead_items.lead_id
    AND (
      auth.uid() = leads.assigned_to 
      OR auth.uid() = leads.created_by 
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- Add indexes for performance
CREATE INDEX idx_lead_items_lead_id ON public.lead_items(lead_id);
CREATE INDEX idx_lead_items_product_type ON public.lead_items(product_type);

-- Add trigger for updated_at
CREATE TRIGGER update_lead_items_updated_at
BEFORE UPDATE ON public.lead_items
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Remove product_type, size, and price_aed from leads table as they're now in lead_items
-- Keep order_id as it identifies the entire order
ALTER TABLE public.leads DROP COLUMN product_type;
ALTER TABLE public.leads DROP COLUMN size;
ALTER TABLE public.leads DROP COLUMN price_aed;