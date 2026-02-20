
-- ============================================
-- 1.1 Adicionar campos de specs e garantia na tabela products
-- ============================================
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS spec_tipo TEXT,
  ADD COLUMN IF NOT EXISTS spec_vel_elevacao TEXT,
  ADD COLUMN IF NOT EXISTS spec_vel_rotacao TEXT,
  ADD COLUMN IF NOT EXISTS spec_vel_translacao TEXT,
  ADD COLUMN IF NOT EXISTS default_panel_voltage TEXT DEFAULT '380',
  ADD COLUMN IF NOT EXISTS default_panel_include_motors BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_motor_elev_kw NUMERIC,
  ADD COLUMN IF NOT EXISTS default_motor_elev_hp NUMERIC,
  ADD COLUMN IF NOT EXISTS default_motor_elev_vel TEXT,
  ADD COLUMN IF NOT EXISTS default_motor_trans_kw NUMERIC,
  ADD COLUMN IF NOT EXISTS default_motor_trans_hp NUMERIC,
  ADD COLUMN IF NOT EXISTS default_motor_trans_vel TEXT,
  ADD COLUMN IF NOT EXISTS default_motor_rot_kw NUMERIC,
  ADD COLUMN IF NOT EXISTS default_motor_rot_hp NUMERIC,
  ADD COLUMN IF NOT EXISTS default_motor_rot_vel TEXT,
  ADD COLUMN IF NOT EXISTS default_warranty_struct_years INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS default_warranty_paint_years INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS default_warranty_components_years INTEGER DEFAULT 1;

-- ============================================
-- 1.2 Adicionar campos de override na tabela quotes
-- ============================================
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS spec_override_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS spec_tipo TEXT,
  ADD COLUMN IF NOT EXISTS spec_vel_elevacao TEXT,
  ADD COLUMN IF NOT EXISTS spec_vel_rotacao TEXT,
  ADD COLUMN IF NOT EXISTS spec_vel_translacao TEXT,
  ADD COLUMN IF NOT EXISTS panel_voltage TEXT DEFAULT '380',
  ADD COLUMN IF NOT EXISTS panel_include_motors BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS panel_motor_elev_kw NUMERIC,
  ADD COLUMN IF NOT EXISTS panel_motor_elev_hp NUMERIC,
  ADD COLUMN IF NOT EXISTS panel_motor_elev_vel TEXT,
  ADD COLUMN IF NOT EXISTS panel_motor_trans_kw NUMERIC,
  ADD COLUMN IF NOT EXISTS panel_motor_trans_hp NUMERIC,
  ADD COLUMN IF NOT EXISTS panel_motor_trans_vel TEXT,
  ADD COLUMN IF NOT EXISTS panel_motor_rot_kw NUMERIC,
  ADD COLUMN IF NOT EXISTS panel_motor_rot_hp NUMERIC,
  ADD COLUMN IF NOT EXISTS panel_motor_rot_vel TEXT,
  ADD COLUMN IF NOT EXISTS warranty_struct_years INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS warranty_paint_years INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS warranty_components_years INTEGER DEFAULT 1;

-- ============================================
-- 1.3 Criar tabela quote_panel_items
-- ============================================
CREATE TABLE IF NOT EXISTS public.quote_panel_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  item_text TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.quote_panel_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own quote panel items"
  ON public.quote_panel_items
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.quotes
    WHERE quotes.id = quote_panel_items.quote_id
    AND (has_role(auth.uid(), 'admin'::app_role) OR quotes.created_by = auth.uid())
  ));

CREATE POLICY "Users can view quote panel items"
  ON public.quote_panel_items
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.quotes
    WHERE quotes.id = quote_panel_items.quote_id
    AND (has_role(auth.uid(), 'admin'::app_role) OR quotes.created_by = auth.uid())
  ));

-- ============================================
-- 1.4 Criar tabela default_panel_items
-- ============================================
CREATE TABLE IF NOT EXISTS public.default_panel_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  item_text TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.default_panel_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view default panel items"
  ON public.default_panel_items
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage default panel items"
  ON public.default_panel_items
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- Seed default_panel_items para todas as gruas existentes
-- ============================================
INSERT INTO public.default_panel_items (product_id, item_text, order_index)
SELECT p.id, item.text, item.idx
FROM public.products p
CROSS JOIN (VALUES
  ('Fim de curso para translação e rotação da grua', 0),
  ('Fim de curso de posição alto e baixo do gancho', 1),
  ('Sistema de proteção dos motores através de inversor', 2),
  ('Sinalização áudio e visual', 3),
  ('Anemômetro', 4),
  ('Chave de destrava para posição de giro livre (catavento)', 5),
  ('Limitador de carga', 6),
  ('Inversor de frequência nos movimentos de elevação, translação e rotação', 7),
  ('Projetada/construída conforme ABNT NBR 8400', 8),
  ('Painel elétrico anticorrosão', 9)
) AS item(text, idx)
WHERE p.categoria = 'grua';
