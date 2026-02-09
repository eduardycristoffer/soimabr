
-- Create audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _user_email text;
  _old jsonb;
  _new jsonb;
  _action text;
BEGIN
  -- Get current user info
  _user_id := auth.uid();
  
  SELECT email INTO _user_email FROM public.profiles WHERE user_id = _user_id LIMIT 1;
  
  IF TG_OP = 'INSERT' THEN
    _action := 'CREATE';
    _new := to_jsonb(NEW);
    _old := NULL;
    INSERT INTO public.audit_logs (user_id, user_email, action, table_name, record_id, new_values, old_values)
    VALUES (_user_id, _user_email, _action, TG_TABLE_NAME, NEW.id, _new, _old);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    _action := 'UPDATE';
    _new := to_jsonb(NEW);
    _old := to_jsonb(OLD);
    INSERT INTO public.audit_logs (user_id, user_email, action, table_name, record_id, new_values, old_values)
    VALUES (_user_id, _user_email, _action, TG_TABLE_NAME, NEW.id, _new, _old);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    _action := 'DELETE';
    _old := to_jsonb(OLD);
    _new := NULL;
    INSERT INTO public.audit_logs (user_id, user_email, action, table_name, record_id, new_values, old_values)
    VALUES (_user_id, _user_email, _action, TG_TABLE_NAME, OLD.id, _old, _new);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Attach triggers to key tables
CREATE TRIGGER audit_clients
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_products
  AFTER INSERT OR UPDATE OR DELETE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_quotes
  AFTER INSERT OR UPDATE OR DELETE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_leads
  AFTER INSERT OR UPDATE OR DELETE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_profiles
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
