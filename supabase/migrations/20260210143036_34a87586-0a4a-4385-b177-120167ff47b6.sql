
-- 1a. Novos campos na tabela products
ALTER TABLE public.products
  ADD COLUMN descricao_tecnica text,
  ADD COLUMN show_tech_desc_pdf boolean NOT NULL DEFAULT false;

-- 1b. Novos campos na tabela quotes (specs da grua por proposta)
ALTER TABLE public.quotes
  ADD COLUMN grua_lanca_m numeric,
  ADD COLUMN grua_altura_torre_m numeric,
  ADD COLUMN grua_carga_maxima_kg numeric,
  ADD COLUMN grua_carga_ponta_kg numeric;

-- 1c. Nova tabela company_settings
CREATE TABLE public.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT 'SOIMA Brasil',
  razao_social text NOT NULL DEFAULT 'SOIMA Brasil Equipamentos Ltda',
  cnpj text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  website text DEFAULT '',
  address text DEFAULT '',
  logo_url text DEFAULT '',
  crea_registration text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view company settings"
  ON public.company_settings FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage company settings"
  ON public.company_settings FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Inserir registro padrao com dados da SOIMA
INSERT INTO public.company_settings (company_name, razao_social, cnpj, phone, email, website, address, crea_registration)
VALUES (
  'SOIMA Brasil',
  'Soíma Brasil - Ind. e Com. de Equi. p/ Const. Ltda',
  '17.007.780/0001-02',
  '(62) 3314 2227',
  'geral@soimabrasil.com.br',
  'www.soimabrasil.com.br',
  'Vp-2D, QD 04 - MOD. 17 - DAIA, Anápolis - GO, 75132-045',
  'Reg. Crea 19815/RF'
);
