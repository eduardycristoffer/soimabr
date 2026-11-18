-- ============================================================================
-- ATUALIZAÇÃO DE BANCO (manual) — assinatura digital com Autentique
-- ============================================================================
-- O Lovable NÃO executa migrations que chegam pelo git. Para aplicar:
--   a) pelo chat do Lovable: peça "execute esta migration" e cole o SQL abaixo; ou
--   b) pelo SQL editor do Lovable Cloud (Database > SQL).
--
-- Tudo aqui é ADITIVO (colunas e tabelas novas, nada existente é alterado ou apagado).
-- O app já funciona SEM este SQL: a tela de assinatura digital só aparece depois
-- que estas tabelas existirem E a chave do Autentique estiver configurada.
-- ============================================================================

-- 1) Contratos: id do documento no Autentique e resumo do andamento
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS autentique_document_id text,
  ADD COLUMN IF NOT EXISTS autentique_status text,        -- pending | partially_signed | finished | rejected
  ADD COLUMN IF NOT EXISTS autentique_sent_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS contracts_autentique_document_id_key
  ON public.contracts (autentique_document_id)
  WHERE autentique_document_id IS NOT NULL;

-- 2) Contatos de quem assina (para o envio do link)
ALTER TABLE public.contract_signatories ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.contract_signatories ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.contract_witnesses   ADD COLUMN IF NOT EXISTS phone text;

-- 3) Uma linha por pessoa que precisa assinar
CREATE TABLE IF NOT EXISTS public.contract_signature_requests (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id          uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  signer_kind          text NOT NULL CHECK (signer_kind IN ('seller','buyer','witness')),
  signer_id            uuid,            -- id em contract_signatories / contract_witnesses (se houver)
  name                 text NOT NULL,
  email                text,
  phone                text,
  autentique_public_id text,            -- identificador da assinatura no Autentique
  sign_link            text,            -- link de assinatura (para enviar por WhatsApp, se preciso)
  status               text NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','viewed','signed','rejected')),
  viewed_at            timestamptz,
  signed_at            timestamptz,
  rejected_at          timestamptz,
  rejected_reason      text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contract_signature_requests_contract_idx
  ON public.contract_signature_requests (contract_id);
CREATE UNIQUE INDEX IF NOT EXISTS contract_signature_requests_public_id_key
  ON public.contract_signature_requests (contract_id, autentique_public_id)
  WHERE autentique_public_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_contract_signature_requests_updated ON public.contract_signature_requests;
CREATE TRIGGER trg_contract_signature_requests_updated
  BEFORE UPDATE ON public.contract_signature_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Eventos recebidos do Autentique (auditoria e proteção contra evento repetido)
CREATE TABLE IF NOT EXISTS public.contract_signature_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES public.contracts(id) ON DELETE CASCADE,  -- pode ser nulo (evento de documento desconhecido)
  event_id    text UNIQUE,                                              -- id do evento no Autentique
  event_type  text NOT NULL,
  payload     jsonb,
  received_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contract_signature_events_contract_idx
  ON public.contract_signature_events (contract_id);

-- 5) Acesso: usuários só LEEM (mesma regra de visibilidade do contrato).
--    Quem escreve é a função do servidor (service_role). Nenhum usuário grava aqui.
GRANT SELECT ON public.contract_signature_requests TO authenticated;
GRANT SELECT ON public.contract_signature_events   TO authenticated;
GRANT ALL    ON public.contract_signature_requests TO service_role;
GRANT ALL    ON public.contract_signature_events   TO service_role;

ALTER TABLE public.contract_signature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_signature_events   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View signature requests via contract" ON public.contract_signature_requests;
CREATE POLICY "View signature requests via contract"
  ON public.contract_signature_requests FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id
    AND (can_view_quote(c.quote_id, auth.uid()) OR c.created_by = auth.uid())));

DROP POLICY IF EXISTS "View signature events via contract" ON public.contract_signature_events;
CREATE POLICY "View signature events via contract"
  ON public.contract_signature_events FOR SELECT TO authenticated
  USING (contract_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id
    AND (can_view_quote(c.quote_id, auth.uid()) OR c.created_by = auth.uid())));
