-- Create activity logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes for better query performance
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_action_type ON public.activity_logs(action_type);
CREATE INDEX idx_activity_logs_entity_type ON public.activity_logs(entity_type);

-- RLS Policies
-- Users can view their own activity logs
CREATE POLICY "Users can view their own activity logs"
  ON public.activity_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- Only authenticated users can insert activity logs
CREATE POLICY "Authenticated users can insert activity logs"
  ON public.activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Only admins can view all activity logs
CREATE POLICY "Admins can view all activity logs"
  ON public.activity_logs
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Create a function to log lead changes (enhanced version)
CREATE OR REPLACE FUNCTION public.log_lead_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log lead creation
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_logs (user_id, action_type, entity_type, entity_id, details)
    VALUES (
      auth.uid(),
      'lead_created',
      'lead',
      NEW.id,
      jsonb_build_object(
        'order_id', NEW.order_id,
        'customer_name', NEW.customer_name,
        'product_type', NEW.product_type,
        'status', NEW.status
      )
    );
  END IF;

  -- Log lead updates
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.activity_logs (user_id, action_type, entity_type, entity_id, details)
    VALUES (
      auth.uid(),
      'lead_updated',
      'lead',
      NEW.id,
      jsonb_build_object(
        'order_id', NEW.order_id,
        'customer_name', NEW.customer_name,
        'changes', jsonb_build_object(
          'status', CASE WHEN OLD.status != NEW.status THEN jsonb_build_object('old', OLD.status, 'new', NEW.status) ELSE NULL END,
          'price_aed', CASE WHEN OLD.price_aed != NEW.price_aed THEN jsonb_build_object('old', OLD.price_aed, 'new', NEW.price_aed) ELSE NULL END
        )
      )
    );
  END IF;

  -- Log lead deletion
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.activity_logs (user_id, action_type, entity_type, entity_id, details)
    VALUES (
      auth.uid(),
      'lead_deleted',
      'lead',
      OLD.id,
      jsonb_build_object(
        'order_id', OLD.order_id,
        'customer_name', OLD.customer_name
      )
    );
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for lead changes
DROP TRIGGER IF EXISTS log_lead_changes ON public.leads;
CREATE TRIGGER log_lead_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.log_lead_change();