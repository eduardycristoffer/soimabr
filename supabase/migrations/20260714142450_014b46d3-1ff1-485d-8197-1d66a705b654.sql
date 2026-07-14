CREATE OR REPLACE FUNCTION public.set_quote_created_by_from_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _auth_user uuid;
BEGIN
  _auth_user := auth.uid();

  IF _auth_user IS NOT NULL THEN
    NEW.created_by := _auth_user;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_quote_created_by_from_auth_trigger ON public.quotes;
CREATE TRIGGER set_quote_created_by_from_auth_trigger
BEFORE INSERT ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.set_quote_created_by_from_auth();

ALTER TABLE public.quotes
ALTER COLUMN created_by SET DEFAULT auth.uid();