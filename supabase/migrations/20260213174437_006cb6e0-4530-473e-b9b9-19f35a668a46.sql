
-- ============================================================
-- FASE 1: Reestruturação do Pipeline de Vendas
-- ============================================================

-- 1.1 Adicionar colunas à pipeline_stages
ALTER TABLE public.pipeline_stages
  ADD COLUMN IF NOT EXISTS is_fixed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stage_type text NOT NULL DEFAULT 'custom';

-- 1.2 Atualizar etapas existentes com is_fixed e stage_type
-- Novo Lead (order_index 1)
UPDATE public.pipeline_stages SET is_fixed = true, stage_type = 'lead', name = 'Novo Lead'
WHERE id = '57783e7c-f0b3-408c-bc18-c790a9af88d0';

-- Primeiro Contato (order_index 2)
UPDATE public.pipeline_stages SET is_fixed = true, stage_type = 'lead', name = 'Primeiro Contato'
WHERE id = 'c535e6b7-6779-4b1c-b98d-5cd31b8c9b15';

-- Qualificação (order_index 3) - custom editável
UPDATE public.pipeline_stages SET is_fixed = false, stage_type = 'custom', order_index = 3
WHERE id = '07bf4b12-dad6-40e6-9476-025e05169e76';

-- Negociação (order_index 4) - custom editável
UPDATE public.pipeline_stages SET is_fixed = false, stage_type = 'custom', order_index = 4
WHERE id = 'b1585644-34dc-4c4b-b973-bafb74a2edce';

-- Proposta Enviada (order_index 5) - custom editável (MANTIDA conforme adendo)
UPDATE public.pipeline_stages SET is_fixed = false, stage_type = 'custom', order_index = 5
WHERE id = 'eb7e79f3-2ab6-4b14-b209-8da496f6bbff';

-- Inserir etapa fixa "Proposta" (nova, entre Primeiro Contato e Qualificação não; 
-- Proposta fixa vai ficar após as custom, antes de Fechamento)
-- Reordenar: Novo Lead=1, Primeiro Contato=2, Qualificação=3, Negociação=4, 
-- Proposta Enviada=5, Proposta=6, Fechamento - Ganho=7, Perdido=8
-- Mas pela lógica de negócio, "Proposta" é quando a proposta é CRIADA.
-- Vamos inserir como order_index 6, e atualizar Fechamento e Perdido.

INSERT INTO public.pipeline_stages (name, is_fixed, stage_type, order_index, color, is_final, is_lost)
VALUES ('Proposta', true, 'proposal', 6, '#8B5CF6', false, false);

-- Fechamento - Ganho (renomear e reordenar)
UPDATE public.pipeline_stages SET name = 'Fechamento - Ganho', is_fixed = true, stage_type = 'final', order_index = 7
WHERE id = 'f7521334-aa28-444c-9e5a-9eb24c8b4744';

-- Perdido
UPDATE public.pipeline_stages SET is_fixed = true, stage_type = 'lost', order_index = 8
WHERE id = 'f54ab055-ca7d-4e4f-9cfc-4463988be353';

-- 1.3 Alterar tabela leads: adicionar source, quote_id, metadata, lead_origin
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS metadata jsonb,
  ADD COLUMN IF NOT EXISTS lead_origin text NOT NULL DEFAULT 'manual';

-- Comentário: leads.quote_id representa APENAS a proposta ativa associada ao card (1:1 por ora).

-- 1.4 Criar tabela pipeline_history (auditoria de movimentações)
CREATE TABLE IF NOT EXISTS public.pipeline_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  from_stage_id uuid REFERENCES public.pipeline_stages(id),
  to_stage_id uuid REFERENCES public.pipeline_stages(id),
  moved_by uuid NOT NULL,
  moved_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

ALTER TABLE public.pipeline_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pipeline history"
ON public.pipeline_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM leads
    WHERE leads.id = pipeline_history.lead_id
      AND (has_role(auth.uid(), 'admin'::app_role) OR leads.owner_id = auth.uid())
  )
);

CREATE POLICY "Users can create pipeline history"
ON public.pipeline_history FOR INSERT
WITH CHECK (moved_by = auth.uid());

-- 1.5 Trigger: proteger etapas fixas contra DELETE e UPDATE de name/order_index
CREATE OR REPLACE FUNCTION public.prevent_fixed_stage_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_fixed = true THEN
      RAISE EXCEPTION 'Etapas fixas do pipeline não podem ser removidas';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.is_fixed = true THEN
      IF NEW.name IS DISTINCT FROM OLD.name THEN
        RAISE EXCEPTION 'Nome de etapas fixas não pode ser alterado';
      END IF;
      IF NEW.is_fixed IS DISTINCT FROM OLD.is_fixed THEN
        RAISE EXCEPTION 'Flag is_fixed não pode ser alterada';
      END IF;
      IF NEW.stage_type IS DISTINCT FROM OLD.stage_type THEN
        RAISE EXCEPTION 'Tipo de etapa fixa não pode ser alterado';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_fixed_stage_delete
BEFORE DELETE ON public.pipeline_stages
FOR EACH ROW
EXECUTE FUNCTION public.prevent_fixed_stage_mutation();

CREATE TRIGGER trg_prevent_fixed_stage_update
BEFORE UPDATE ON public.pipeline_stages
FOR EACH ROW
EXECUTE FUNCTION public.prevent_fixed_stage_mutation();

-- 1.6 Trigger: bloquear movimentação de cards em etapas finais (Ganho/Perdido) por operadores
-- Isso é feito via RLS + lógica no frontend, mas adicionamos validação no backend também
CREATE OR REPLACE FUNCTION public.prevent_final_stage_move()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _old_stage_type text;
  _is_admin boolean;
BEGIN
  -- Se stage_id não mudou, permitir
  IF NEW.stage_id IS NOT DISTINCT FROM OLD.stage_id THEN
    RETURN NEW;
  END IF;

  -- Checar se a etapa antiga é final/lost
  SELECT stage_type INTO _old_stage_type
  FROM public.pipeline_stages
  WHERE id = OLD.stage_id;

  IF _old_stage_type IN ('final', 'lost') THEN
    -- Apenas admin pode mover de etapa final
    SELECT has_role(auth.uid(), 'admin'::app_role) INTO _is_admin;
    IF NOT _is_admin THEN
      RAISE EXCEPTION 'Apenas administradores podem reabrir cards em etapas finais';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_final_stage_move
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.prevent_final_stage_move();

-- 1.7 Garantir que operadores possam deletar seus próprios leads
-- (política atual só permite admin deletar)
CREATE POLICY "Operators can delete own leads"
ON public.leads FOR DELETE
USING (owner_id = auth.uid());
