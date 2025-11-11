-- Update the log_lead_change function to remove references to dropped columns
CREATE OR REPLACE FUNCTION public.log_lead_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
          'status', CASE WHEN OLD.status != NEW.status THEN jsonb_build_object('old', OLD.status, 'new', NEW.status) ELSE NULL END
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
$function$;