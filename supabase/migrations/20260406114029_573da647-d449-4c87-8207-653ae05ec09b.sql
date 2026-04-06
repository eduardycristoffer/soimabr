
CREATE TYPE public.quote_type AS ENUM ('venda', 'locacao');
ALTER TABLE public.quotes ADD COLUMN quote_type quote_type NOT NULL DEFAULT 'venda';

ALTER TABLE public.quotes ADD COLUMN rental_duration_months integer;
ALTER TABLE public.quotes ADD COLUMN rental_monthly_value numeric;
ALTER TABLE public.quotes ADD COLUMN rental_mobilization numeric DEFAULT 0;
ALTER TABLE public.quotes ADD COLUMN rental_demobilization numeric DEFAULT 0;
ALTER TABLE public.quotes ADD COLUMN rental_freight numeric DEFAULT 0;
ALTER TABLE public.quotes ADD COLUMN rental_assembly numeric DEFAULT 0;
ALTER TABLE public.quotes ADD COLUMN rental_disassembly numeric DEFAULT 0;
ALTER TABLE public.quotes ADD COLUMN rental_operator_included boolean DEFAULT false;
ALTER TABLE public.quotes ADD COLUMN rental_maintenance_included boolean DEFAULT false;
ALTER TABLE public.quotes ADD COLUMN rental_insurance_included boolean DEFAULT false;
ALTER TABLE public.quotes ADD COLUMN rental_technical_assistance boolean DEFAULT false;
ALTER TABLE public.quotes ADD COLUMN rental_start_date date;
ALTER TABLE public.quotes ADD COLUMN rental_terrain_condition text;
ALTER TABLE public.quotes ADD COLUMN rental_special_foundation boolean DEFAULT false;
ALTER TABLE public.quotes ADD COLUMN rental_work_type text;
ALTER TABLE public.quotes ADD COLUMN rental_height_needed numeric;
ALTER TABLE public.quotes ADD COLUMN rental_jib_needed numeric;
ALTER TABLE public.quotes ADD COLUMN rental_max_weight numeric;
ALTER TABLE public.quotes ADD COLUMN rental_tax_percent numeric DEFAULT 0;

ALTER TABLE public.products ADD COLUMN rental_monthly_price numeric;
ALTER TABLE public.products ADD COLUMN rental_mobilization_default numeric;
ALTER TABLE public.products ADD COLUMN rental_assembly_default numeric;
