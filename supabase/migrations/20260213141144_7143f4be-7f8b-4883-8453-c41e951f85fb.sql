
-- Add grua spec columns to quote_items
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS grua_lanca_m NUMERIC;
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS grua_altura_torre_m NUMERIC;
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS grua_carga_maxima_kg NUMERIC;
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS grua_carga_ponta_kg NUMERIC;
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS grua_altura_trabalho_m NUMERIC;

-- Migrate existing data from quotes to the first grua item in quote_items
UPDATE public.quote_items qi
SET
  grua_lanca_m = q.grua_lanca_m,
  grua_altura_torre_m = q.grua_altura_torre_m,
  grua_carga_maxima_kg = q.grua_carga_maxima_kg,
  grua_carga_ponta_kg = q.grua_carga_ponta_kg,
  grua_altura_trabalho_m = q.grua_altura_trabalho_m
FROM public.quotes q
WHERE qi.quote_id = q.id
  AND qi.product_category = 'grua'
  AND qi.id = (
    SELECT id FROM public.quote_items
    WHERE quote_id = q.id AND product_category = 'grua'
    ORDER BY order_index ASC
    LIMIT 1
  )
  AND (q.grua_lanca_m IS NOT NULL OR q.grua_altura_torre_m IS NOT NULL OR q.grua_carga_maxima_kg IS NOT NULL OR q.grua_carga_ponta_kg IS NOT NULL OR q.grua_altura_trabalho_m IS NOT NULL);
