-- Create deleted_leads table to store soft-deleted leads
CREATE TABLE public.deleted_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  lead_data jsonb NOT NULL,
  lead_items jsonb NOT NULL,
  deleted_by uuid NOT NULL,
  deleted_at timestamp with time zone NOT NULL DEFAULT now(),
  restore_deadline timestamp with time zone NOT NULL DEFAULT (now() + interval '30 days')
);

-- Enable RLS
ALTER TABLE public.deleted_leads ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view leads they deleted
CREATE POLICY "Users can view their deleted leads"
ON public.deleted_leads
FOR SELECT
USING (
  (auth.uid() = deleted_by) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Policy: Authenticated users can insert deleted leads
CREATE POLICY "Users can soft delete leads"
ON public.deleted_leads
FOR INSERT
WITH CHECK (auth.uid() = deleted_by);

-- Policy: Users can restore their own deleted leads, admins can restore all
CREATE POLICY "Users can restore deleted leads"
ON public.deleted_leads
FOR DELETE
USING (
  (auth.uid() = deleted_by) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Create index for performance
CREATE INDEX idx_deleted_leads_deleted_by ON public.deleted_leads(deleted_by);
CREATE INDEX idx_deleted_leads_restore_deadline ON public.deleted_leads(restore_deadline);

-- Function to cleanup expired deleted leads
CREATE OR REPLACE FUNCTION public.cleanup_expired_deleted_leads()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.deleted_leads
  WHERE restore_deadline < now();
END;
$$;

-- Create user preferences table for column sizes
CREATE TABLE public.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preferences jsonb NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own preferences
CREATE POLICY "Users can view their own preferences"
ON public.user_preferences
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own preferences
CREATE POLICY "Users can insert their own preferences"
ON public.user_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own preferences
CREATE POLICY "Users can update their own preferences"
ON public.user_preferences
FOR UPDATE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();