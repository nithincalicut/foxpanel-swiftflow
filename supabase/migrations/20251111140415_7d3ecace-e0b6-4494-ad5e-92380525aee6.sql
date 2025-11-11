-- Create lead_history table to track all status changes
CREATE TABLE public.lead_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  old_status lead_status,
  new_status lead_status NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on lead_history
ALTER TABLE public.lead_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lead_history
CREATE POLICY "Users can view history of their assigned leads"
ON public.lead_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = lead_history.lead_id
    AND (leads.assigned_to = auth.uid() OR leads.created_by = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Authenticated users can insert lead history"
ON public.lead_history
FOR INSERT
WITH CHECK (auth.uid() = changed_by);

-- Create trigger function to log status changes
CREATE OR REPLACE FUNCTION public.log_lead_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.lead_history (lead_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on leads table
CREATE TRIGGER log_status_change
AFTER UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.log_lead_status_change();

-- Add performance indexes
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_customer_name ON public.leads(customer_name);
CREATE INDEX idx_leads_order_id ON public.leads(order_id);
CREATE INDEX idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX idx_lead_history_lead_id ON public.lead_history(lead_id);
CREATE INDEX idx_lead_history_changed_at ON public.lead_history(changed_at DESC);