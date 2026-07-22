CREATE OR REPLACE FUNCTION public.generate_quote_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  year_suffix TEXT;
  sequence_num INTEGER;
  candidate TEXT;
  attempts INTEGER := 0;
BEGIN
  year_suffix := to_char(now(), 'YY');

  -- Serialize concurrent inserts to avoid duplicate quote_number
  PERFORM pg_advisory_xact_lock(hashtext('quote_number_' || year_suffix));

  LOOP
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(quote_number FROM 6) AS INTEGER)
    ), 0) + 1
    INTO sequence_num
    FROM public.quotes
    WHERE quote_number LIKE 'PRO' || year_suffix || '%'
      AND LENGTH(quote_number) = 9;

    candidate := 'PRO' || year_suffix || LPAD(sequence_num::TEXT, 4, '0');

    IF NOT EXISTS (SELECT 1 FROM public.quotes WHERE quote_number = candidate) THEN
      NEW.quote_number := candidate;
      RETURN NEW;
    END IF;

    attempts := attempts + 1;
    IF attempts > 20 THEN
      RAISE EXCEPTION 'Não foi possível gerar número de proposta único';
    END IF;
  END LOOP;
END;
$function$;