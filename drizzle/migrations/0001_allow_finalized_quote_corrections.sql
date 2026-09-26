CREATE OR REPLACE FUNCTION public.prevent_finalized_quote_edit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status = 'finalized' THEN
    -- Corrections on finalized quotes are allowed (each save is logged in quote_versions),
    -- but identity fields stay immutable.
    IF NEW.quote_number IS DISTINCT FROM OLD.quote_number
       OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
      RAISE EXCEPTION 'Número e autor de proposta finalizada não podem ser alterados';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;