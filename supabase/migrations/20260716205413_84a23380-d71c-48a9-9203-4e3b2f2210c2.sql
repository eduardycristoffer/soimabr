
CREATE TABLE public.cnpj_lookup_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active boolean NOT NULL DEFAULT true,
  provider text NOT NULL DEFAULT 'brasilapi',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cnpj_lookup_config TO authenticated;
GRANT ALL ON public.cnpj_lookup_config TO service_role;

ALTER TABLE public.cnpj_lookup_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access cnpj lookup config"
ON public.cnpj_lookup_config
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_cnpj_lookup_config_updated_at
BEFORE UPDATE ON public.cnpj_lookup_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.cnpj_lookup_config (is_active, provider) VALUES (true, 'brasilapi');
