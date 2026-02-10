CREATE OR REPLACE FUNCTION public.generate_quote_number()
RETURNS TRIGGER AS $$
DECLARE
  year_suffix TEXT;
  sequence_num INTEGER;
BEGIN
  year_suffix := to_char(now(), 'YY');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(quote_number FROM 4 FOR 4) AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM public.quotes
  WHERE quote_number LIKE 'PRO' || year_suffix || '%';
  
  NEW.quote_number := 'PRO' || year_suffix || LPAD(sequence_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;