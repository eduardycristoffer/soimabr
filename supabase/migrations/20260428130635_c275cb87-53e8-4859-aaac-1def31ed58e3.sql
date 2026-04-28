DELETE FROM public.default_panel_items
WHERE item_text IN (
  'Projetada/construída conforme ABNT NBR 8400',
  'Painel elétrico anticorrosão'
);

UPDATE public.products
SET default_warranty_components_years = 2
WHERE default_warranty_components_years = 1 OR default_warranty_components_years IS NULL;