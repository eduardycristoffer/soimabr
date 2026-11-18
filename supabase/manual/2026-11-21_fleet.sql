-- ============================================================================
-- ATUALIZAÇÃO DE BANCO (manual) — Gestão da frota de gruas locadas em obras
-- ============================================================================
-- O Lovable NÃO executa migrations que chegam pelo git. Para aplicar:
--   a) pelo chat do Lovable: peça "execute esta migration" e cole o SQL abaixo; ou
--   b) pelo SQL editor do Lovable Cloud (Database > SQL).
--
-- O que faz (só tabelas NOVAS; nada existente é alterado ou apagado):
--   fleet_units    → cada grua física (número/patrimônio, medidas, valor de compra)
--   fleet_rentals  → a grua numa obra: datas, prazo, valores, e a ligação com o contrato e o cliente
--   fleet_costs    → investimentos (reforma, upgrade) e custos de operação (manutenção, frete...) por grua
--
-- SEGURANÇA: as três tabelas guardam valor investido e rentabilidade, então só ADMINISTRADORES leem e
-- gravam (RLS com has_role). Usuários comuns (operator) não enxergam nada disto. Também removemos o acesso
-- da role "anon" e de PUBLIC: no Supabase, tabelas novas recebem permissões amplas por padrão.
--
-- O código do app funciona SEM este script: o item "Frota" do menu e os cartões nos contratos só aparecem
-- depois que as tabelas existirem. O resto do sistema continua exatamente como está.
-- ============================================================================

-- ───────────────────────── gruas ─────────────────────────
CREATE TABLE IF NOT EXISTS public.fleet_units (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code             text NOT NULL,                       -- identificação interna / patrimônio, ex.: GRU-045
  product_id       uuid REFERENCES public.products(id) ON DELETE SET NULL,  -- modelo no catálogo
  model_name       text,                                -- nome livre, se não houver no catálogo
  serial_number    text,
  year_manufactured integer CHECK (year_manufactured IS NULL OR year_manufactured BETWEEN 1950 AND 2100),
  -- medidas desta grua (podem diferir do modelo do catálogo)
  lanca_m          numeric CHECK (lanca_m IS NULL OR lanca_m >= 0),
  altura_torre_m   numeric CHECK (altura_torre_m IS NULL OR altura_torre_m >= 0),
  carga_maxima_kg  numeric CHECK (carga_maxima_kg IS NULL OR carga_maxima_kg >= 0),
  carga_ponta_kg   numeric CHECK (carga_ponta_kg IS NULL OR carga_ponta_kg >= 0),
  -- valor empregado
  acquisition_cost numeric NOT NULL DEFAULT 0 CHECK (acquisition_cost >= 0),
  acquisition_date date,
  -- situação manual (em obra / reservada / disponível são calculadas pelas locações)
  status           text NOT NULL DEFAULT 'active' CHECK (status IN ('active','maintenance','retired')),
  location_note    text,                                -- onde está quando parada (pátio, oficina...)
  notes            text,
  created_by       uuid,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS fleet_units_code_key ON public.fleet_units (lower(code));

-- ───────────────────────── locações em obra ─────────────────────────
CREATE TABLE IF NOT EXISTS public.fleet_rentals (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id               uuid NOT NULL REFERENCES public.fleet_units(id) ON DELETE RESTRICT,
  contract_id           uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  quote_id              uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  client_id             uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  site_name             text,                           -- nome da obra
  site_location         text,
  start_date            date NOT NULL,
  planned_end_date      date NOT NULL,                  -- fim previsto no contrato (dia inclusive)
  actual_end_date       date,                           -- dia em que a grua voltou (devolução)
  cancelled_at          timestamptz,
  monthly_value         numeric NOT NULL DEFAULT 0 CHECK (monthly_value >= 0),     -- em reais
  mobilization_value    numeric NOT NULL DEFAULT 0 CHECK (mobilization_value >= 0),
  demobilization_value  numeric NOT NULL DEFAULT 0 CHECK (demobilization_value >= 0),
  notes                 text,
  created_by            uuid,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fleet_rentals_dates_ok CHECK (
    planned_end_date >= start_date AND (actual_end_date IS NULL OR actual_end_date >= start_date)
  )
);

CREATE INDEX IF NOT EXISTS fleet_rentals_unit_idx     ON public.fleet_rentals (unit_id, start_date);
CREATE INDEX IF NOT EXISTS fleet_rentals_contract_idx ON public.fleet_rentals (contract_id);
CREATE INDEX IF NOT EXISTS fleet_rentals_client_idx   ON public.fleet_rentals (client_id);

-- ───────────────────────── custos e investimentos ─────────────────────────
CREATE TABLE IF NOT EXISTS public.fleet_costs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id      uuid NOT NULL REFERENCES public.fleet_units(id) ON DELETE CASCADE,
  rental_id    uuid REFERENCES public.fleet_rentals(id) ON DELETE SET NULL,
  kind         text NOT NULL CHECK (kind IN ('investimento','manutencao','frete','montagem','seguro','impostos','outros')),
  amount       numeric NOT NULL CHECK (amount >= 0),
  incurred_on  date NOT NULL,
  description  text,
  created_by   uuid,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fleet_costs_unit_idx ON public.fleet_costs (unit_id, incurred_on);

-- ───────────────────────── updated_at ─────────────────────────
DROP TRIGGER IF EXISTS trg_fleet_units_updated ON public.fleet_units;
CREATE TRIGGER trg_fleet_units_updated
  BEFORE UPDATE ON public.fleet_units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_fleet_rentals_updated ON public.fleet_rentals;
CREATE TRIGGER trg_fleet_rentals_updated
  BEFORE UPDATE ON public.fleet_rentals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ───────────────────────── permissões ─────────────────────────
-- Tira o acesso amplo que o Supabase dá às tabelas novas; depois libera só o necessário.
REVOKE ALL ON public.fleet_units, public.fleet_rentals, public.fleet_costs FROM PUBLIC, anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fleet_units, public.fleet_rentals, public.fleet_costs TO authenticated;
GRANT ALL ON public.fleet_units, public.fleet_rentals, public.fleet_costs TO service_role;

ALTER TABLE public.fleet_units   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_costs   ENABLE ROW LEVEL SECURITY;

-- Só administradores (a regra "admin" já existe em user_roles / has_role).
DROP POLICY IF EXISTS "Admins manage fleet units" ON public.fleet_units;
CREATE POLICY "Admins manage fleet units"
  ON public.fleet_units FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage fleet rentals" ON public.fleet_rentals;
CREATE POLICY "Admins manage fleet rentals"
  ON public.fleet_rentals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage fleet costs" ON public.fleet_costs;
CREATE POLICY "Admins manage fleet costs"
  ON public.fleet_costs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

COMMENT ON TABLE public.fleet_units   IS 'Gruas físicas da frota (uma linha por equipamento)';
COMMENT ON TABLE public.fleet_rentals IS 'Locação de uma grua em obra: prazo, valores e ligação com contrato e cliente';
COMMENT ON TABLE public.fleet_costs   IS 'Investimentos (aumentam o valor empregado) e custos de operação por grua';
