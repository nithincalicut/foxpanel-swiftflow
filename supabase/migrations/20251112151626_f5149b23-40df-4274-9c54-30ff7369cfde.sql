-- Drop existing policy for selecting leads
DROP POLICY IF EXISTS "Sales staff can view their own leads" ON public.leads;

-- Create new policy that includes production managers
CREATE POLICY "Users can view their leads based on role"
ON public.leads
FOR SELECT
TO authenticated
USING (
  -- Sales staff and creators can view their own leads
  (auth.uid() = assigned_to) OR 
  (auth.uid() = created_by) OR 
  -- Admins can view all leads
  has_role(auth.uid(), 'admin'::app_role) OR
  -- Production managers can view leads in production or delivered status
  (has_role(auth.uid(), 'production_manager'::app_role) AND status IN ('production', 'delivered'))
);