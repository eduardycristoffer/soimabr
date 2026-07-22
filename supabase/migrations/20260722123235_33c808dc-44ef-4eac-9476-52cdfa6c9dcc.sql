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
  IF _auth_user IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida ou expirada. Faça login novamente para salvar a proposta.'
      USING ERRCODE = '28000';
  END IF;
  NEW.created_by := _auth_user;
  RETURN NEW;
END;
$$;