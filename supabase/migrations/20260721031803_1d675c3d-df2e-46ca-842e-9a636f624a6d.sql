
-- 1) Enum aditivo
ALTER TYPE public.contract_status ADD VALUE IF NOT EXISTS 'em_revisao';
ALTER TYPE public.contract_status ADD VALUE IF NOT EXISTS 'aprovado';

-- 2) Colunas em contracts
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS current_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS finalized_at timestamptz;

-- 3) Tabela de versões
CREATE TABLE IF NOT EXISTS public.contract_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  contract_data jsonb NOT NULL,
  clauses_data jsonb NOT NULL,
  signatories_data jsonb,
  witnesses_data jsonb,
  rendered_html text,
  change_summary text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contract_id, version_number)
);

GRANT SELECT, INSERT ON public.contract_versions TO authenticated;
GRANT ALL ON public.contract_versions TO service_role;

ALTER TABLE public.contract_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contract versions"
  ON public.contract_versions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = contract_versions.contract_id
      AND (public.can_view_quote(c.quote_id, auth.uid()) OR c.created_by = auth.uid())
  ));

CREATE POLICY "Users can insert own contract versions"
  ON public.contract_versions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = contract_versions.contract_id
      AND (c.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  ));

-- 4) Reescrever trigger de bloqueio: bloquear edições diretas em aprovado/sent/signed
CREATE OR REPLACE FUNCTION public.prevent_signed_contract_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _locked_states text[] := ARRAY['aprovado','sent','signed'];
  _content_changed boolean;
BEGIN
  -- Assinado: mantém regra original (praticamente imutável)
  IF OLD.status = 'signed' THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.signed_pdf_url IS DISTINCT FROM OLD.signed_pdf_url
       OR NEW.pdf_url IS DISTINCT FROM OLD.pdf_url
       OR NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Contrato assinado não pode ser editado';
  END IF;

  -- Aprovado / Enviado: bloquear edição de conteúdo; permitir apenas transições de status e metadata
  IF OLD.status = ANY(_locked_states) THEN
    _content_changed :=
         NEW.seller_rep_name      IS DISTINCT FROM OLD.seller_rep_name
      OR NEW.seller_rep_cpf       IS DISTINCT FROM OLD.seller_rep_cpf
      OR NEW.seller_rep_rg        IS DISTINCT FROM OLD.seller_rep_rg
      OR NEW.seller_rep_cargo     IS DISTINCT FROM OLD.seller_rep_cargo
      OR NEW.buyer_rep_name       IS DISTINCT FROM OLD.buyer_rep_name
      OR NEW.buyer_rep_cpf        IS DISTINCT FROM OLD.buyer_rep_cpf
      OR NEW.buyer_rep_rg         IS DISTINCT FROM OLD.buyer_rep_rg
      OR NEW.buyer_rep_cargo      IS DISTINCT FROM OLD.buyer_rep_cargo
      OR NEW.seller_manager_name  IS DISTINCT FROM OLD.seller_manager_name
      OR NEW.seller_manager_cpf   IS DISTINCT FROM OLD.seller_manager_cpf
      OR NEW.seller_manager_phone IS DISTINCT FROM OLD.seller_manager_phone
      OR NEW.seller_manager_email IS DISTINCT FROM OLD.seller_manager_email
      OR NEW.buyer_manager_name   IS DISTINCT FROM OLD.buyer_manager_name
      OR NEW.buyer_manager_cpf    IS DISTINCT FROM OLD.buyer_manager_cpf
      OR NEW.buyer_manager_phone  IS DISTINCT FROM OLD.buyer_manager_phone
      OR NEW.buyer_manager_email  IS DISTINCT FROM OLD.buyer_manager_email
      OR NEW.payment_schedule     IS DISTINCT FROM OLD.payment_schedule
      OR NEW.delivery_days        IS DISTINCT FROM OLD.delivery_days
      OR NEW.template_id          IS DISTINCT FROM OLD.template_id
      OR NEW.company_id           IS DISTINCT FROM OLD.company_id
      OR NEW.quote_id             IS DISTINCT FROM OLD.quote_id;

    IF _content_changed THEN
      RAISE EXCEPTION 'Contrato em estado % não pode ser editado diretamente. Crie uma nova versão para alterá-lo.', OLD.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 5) Bloqueio de edição de snapshots e signatários quando o contrato está travado
CREATE OR REPLACE FUNCTION public.prevent_child_edit_when_locked()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _status contract_status;
  _cid uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _cid := OLD.contract_id;
  ELSE
    _cid := NEW.contract_id;
  END IF;

  SELECT status INTO _status FROM public.contracts WHERE id = _cid;
  IF _status IN ('aprovado','sent','signed') THEN
    RAISE EXCEPTION 'Contrato em estado % não pode ter conteúdo alterado diretamente. Crie uma nova versão.', _status;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$function$;

DROP TRIGGER IF EXISTS trg_snapshots_locked ON public.contract_clause_snapshots;
CREATE TRIGGER trg_snapshots_locked
  BEFORE INSERT OR UPDATE OR DELETE ON public.contract_clause_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.prevent_child_edit_when_locked();

DROP TRIGGER IF EXISTS trg_signatories_locked ON public.contract_signatories;
CREATE TRIGGER trg_signatories_locked
  BEFORE INSERT OR UPDATE OR DELETE ON public.contract_signatories
  FOR EACH ROW EXECUTE FUNCTION public.prevent_child_edit_when_locked();

DROP TRIGGER IF EXISTS trg_witnesses_locked ON public.contract_witnesses;
CREATE TRIGGER trg_witnesses_locked
  BEFORE INSERT OR UPDATE OR DELETE ON public.contract_witnesses
  FOR EACH ROW EXECUTE FUNCTION public.prevent_child_edit_when_locked();
