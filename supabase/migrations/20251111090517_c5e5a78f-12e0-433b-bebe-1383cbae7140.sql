-- Fix search_path for all functions

CREATE OR REPLACE FUNCTION public.seed_admin_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user_id UUID;
BEGIN
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'nrpclt@foxpanel.com';
  
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_status_change_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.last_status_change = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_order_id(p_product_type product_type)
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  prefix TEXT;
  random_digits TEXT;
  new_order_id TEXT;
  max_attempts INT := 100;
  attempt INT := 0;
BEGIN
  prefix := CASE p_product_type
    WHEN 'fp_pro' THEN 'FP-PRO'
    WHEN 'fw' THEN 'FW'
    WHEN 'ft' THEN 'FT'
  END;
  
  LOOP
    random_digits := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    new_order_id := prefix || '-' || random_digits;
    
    IF NOT EXISTS (SELECT 1 FROM public.leads WHERE order_id = new_order_id) THEN
      RETURN new_order_id;
    END IF;
    
    attempt := attempt + 1;
    IF attempt >= max_attempts THEN
      RAISE EXCEPTION 'Could not generate unique order ID after % attempts', max_attempts;
    END IF;
  END LOOP;
END;
$$;