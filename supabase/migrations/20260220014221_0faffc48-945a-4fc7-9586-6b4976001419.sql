
CREATE OR REPLACE FUNCTION public.generate_quote_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  year_suffix TEXT;
  sequence_num INTEGER;
BEGIN
  year_suffix := to_char(now(), 'YY');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(quote_number FROM 6) AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM public.quotes
  WHERE quote_number LIKE 'PRO' || year_suffix || '%'
    AND LENGTH(quote_number) = 9;
  
  NEW.quote_number := 'PRO' || year_suffix || LPAD(sequence_num::TEXT, 4, '0');
  RETURN NEW;
END;
$function$;
