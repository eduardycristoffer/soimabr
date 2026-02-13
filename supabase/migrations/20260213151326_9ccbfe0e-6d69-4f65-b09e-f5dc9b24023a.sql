
-- Add international price to products
ALTER TABLE public.products
ADD COLUMN international_price_brl numeric DEFAULT NULL;

-- Add USD/BRL rate tracking to quotes
ALTER TABLE public.quotes
ADD COLUMN usd_brl_rate_used numeric DEFAULT NULL,
ADD COLUMN usd_brl_rate_updated_at timestamptz DEFAULT NULL;

-- Add international unit price to quote items
ALTER TABLE public.quote_items
ADD COLUMN international_unit_price_brl numeric DEFAULT NULL;
