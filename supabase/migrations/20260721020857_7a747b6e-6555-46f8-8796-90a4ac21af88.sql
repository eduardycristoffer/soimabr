
-- 1) company_settings.slug
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS slug text;
CREATE UNIQUE INDEX IF NOT EXISTS company_settings_slug_key ON public.company_settings(slug);

UPDATE public.company_settings SET slug = 'soima-industria' WHERE slug IS NULL;

INSERT INTO public.company_settings (slug, company_name, razao_social, cnpj, representante_cargo)
VALUES ('soima-locacoes', 'Soima Brasil Locações', 'Soima Brasil Locações LTDA', '60.332.326/0001-48', 'Sócio-Administrador')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.company_settings (
  slug, company_name, razao_social, cnpj, address, email, phone,
  representante_nome, representante_cpf, representante_cargo
) VALUES (
  'dacrom', 'Dacrom Brasil Serviços', 'Dacrom Brasil Serviços LTDA', '27.964.905/0001-38',
  'Avenida Maranhão, S/N, Quadra 61, Lote 15, Jundiaí, Anápolis-GO, CEP 75110-470',
  'dacrombrengenharia@gmail.com', '(62) 3772-0059',
  'Ana Cristina Mendes Da Costa Morais', '704.560.251-03', 'Diretora'
) ON CONFLICT (slug) DO NOTHING;

-- 2) enum quote_type: add 'servico'
ALTER TYPE public.quote_type ADD VALUE IF NOT EXISTS 'servico';

-- 3) company_id em contract_templates e contracts
ALTER TABLE public.contract_templates
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.company_settings(id);
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.company_settings(id);

UPDATE public.contract_templates
  SET company_id = (SELECT id FROM public.company_settings WHERE slug = 'soima-industria')
  WHERE id = '306d8d81-07c8-462f-8ab3-a93c454a1ef6';

UPDATE public.contract_templates
  SET company_id = (SELECT id FROM public.company_settings WHERE slug = 'soima-locacoes')
  WHERE id = '3956b503-d059-4f2a-88e5-61bf86e2f80c';

-- 4) contract_signatories
CREATE TABLE IF NOT EXISTS public.contract_signatories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  side text NOT NULL CHECK (side IN ('seller','buyer')),
  name text,
  cpf text,
  rg text,
  cargo text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_signatories TO authenticated;
GRANT ALL ON public.contract_signatories TO service_role;
ALTER TABLE public.contract_signatories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View signatories via contract"
  ON public.contract_signatories FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id
    AND (can_view_quote(c.quote_id, auth.uid()) OR c.created_by = auth.uid())));

CREATE POLICY "Manage signatories via contract"
  ON public.contract_signatories FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id
    AND (has_role(auth.uid(), 'admin'::app_role) OR c.created_by = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id
    AND (has_role(auth.uid(), 'admin'::app_role) OR c.created_by = auth.uid())));

-- migrar dados legados de representantes
INSERT INTO public.contract_signatories (contract_id, side, name, cpf, rg, cargo, order_index)
SELECT id, 'seller', seller_rep_name, seller_rep_cpf, seller_rep_rg, seller_rep_cargo, 0
FROM public.contracts
WHERE seller_rep_name IS NOT NULL AND seller_rep_name <> ''
  AND NOT EXISTS (SELECT 1 FROM public.contract_signatories s WHERE s.contract_id = contracts.id AND s.side='seller');

INSERT INTO public.contract_signatories (contract_id, side, name, cpf, rg, cargo, order_index)
SELECT id, 'buyer', buyer_rep_name, buyer_rep_cpf, buyer_rep_rg, buyer_rep_cargo, 0
FROM public.contracts
WHERE buyer_rep_name IS NOT NULL AND buyer_rep_name <> ''
  AND NOT EXISTS (SELECT 1 FROM public.contract_signatories s WHERE s.contract_id = contracts.id AND s.side='buyer');
-- colunas antigas mantidas como legado

-- 5) contract_witnesses
CREATE TABLE IF NOT EXISTS public.contract_witnesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  name text,
  cpf text,
  email text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_witnesses TO authenticated;
GRANT ALL ON public.contract_witnesses TO service_role;
ALTER TABLE public.contract_witnesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View witnesses via contract"
  ON public.contract_witnesses FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id
    AND (can_view_quote(c.quote_id, auth.uid()) OR c.created_by = auth.uid())));

CREATE POLICY "Manage witnesses via contract"
  ON public.contract_witnesses FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id
    AND (has_role(auth.uid(), 'admin'::app_role) OR c.created_by = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id
    AND (has_role(auth.uid(), 'admin'::app_role) OR c.created_by = auth.uid())));

-- 6) clause_key
ALTER TABLE public.contract_clauses ADD COLUMN IF NOT EXISTS clause_key text;
ALTER TABLE public.contract_clause_snapshots ADD COLUMN IF NOT EXISTS clause_key text;
