
CREATE OR REPLACE FUNCTION public.enforce_single_grua_per_quote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  grua_count integer;
BEGIN
  IF NEW.product_category = 'grua' THEN
    SELECT count(*) INTO grua_count
    FROM public.quote_items
    WHERE quote_id = NEW.quote_id
      AND product_category = 'grua';

    IF grua_count >= 1 THEN
      RAISE EXCEPTION 'Apenas 1 grua permitida por proposta. Para vender mais de uma grua, crie outra proposta.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_single_grua_per_quote
  BEFORE INSERT ON public.quote_items
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_single_grua_per_quote();
