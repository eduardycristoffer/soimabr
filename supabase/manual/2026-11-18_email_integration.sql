-- ============================================================================
-- ATUALIZAÇÃO DE BANCO (manual) — integração de e-mail e envio de propostas
-- ============================================================================
-- O Lovable NÃO executa migrations que chegam pelo git. Para aplicar:
--   a) pelo chat do Lovable: peça "execute esta migration" e cole o SQL abaixo; ou
--   b) pelo SQL editor do Lovable Cloud (Database > SQL).
--
-- Tudo aqui é ADITIVO (tabelas novas; nada existente é alterado ou apagado).
-- O app já funciona SEM este SQL: a tela de e-mail e o botão "Enviar ao cliente"
-- só aparecem depois que estas tabelas existirem E a função for publicada.
-- ============================================================================

-- 1) Conta de e-mail da empresa (SMTP) — uma única linha.
--    A senha é guardada CRIPTOGRAFADA pela função do servidor e nunca é devolvida ao app.
CREATE TABLE IF NOT EXISTS public.email_integration (
  id                      boolean PRIMARY KEY DEFAULT true CHECK (id),
  enabled                 boolean NOT NULL DEFAULT false,
  smtp_host               text,
  smtp_port               integer NOT NULL DEFAULT 465,
  smtp_security           text    NOT NULL DEFAULT 'ssl' CHECK (smtp_security IN ('ssl','starttls')),
  smtp_username           text,
  smtp_password_encrypted text,
  from_name               text,
  from_email              text,
  reply_to                text,
  bcc_email               text,          -- cópia oculta de todo envio (ex.: financeiro/arquivo)
  signature_text          text,          -- assinatura no fim do e-mail (texto simples)
  require_admin_approval  boolean NOT NULL DEFAULT false,  -- exige um administrador autorizar cada envio
  last_test_at            timestamptz,
  last_test_ok            boolean,
  last_test_error         text,
  updated_by              uuid,
  updated_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_integration ENABLE ROW LEVEL SECURITY;

-- Só administradores leem, e NUNCA a coluna da senha (permissão por coluna).
REVOKE ALL ON public.email_integration FROM anon, authenticated;
GRANT SELECT (id, enabled, smtp_host, smtp_port, smtp_security, smtp_username,
              from_name, from_email, reply_to, bcc_email, signature_text,
              require_admin_approval, last_test_at, last_test_ok, last_test_error, updated_at)
  ON public.email_integration TO authenticated;
GRANT ALL ON public.email_integration TO service_role;

DROP POLICY IF EXISTS "Admins view email integration" ON public.email_integration;
CREATE POLICY "Admins view email integration"
  ON public.email_integration FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
-- Gravação: somente a função do servidor (service_role). Nenhum usuário grava direto.

-- 2) Envios de proposta por e-mail (pedido, autorização e resultado)
CREATE TABLE IF NOT EXISTS public.proposal_email_dispatches (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id         uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  requested_by     uuid NOT NULL,
  to_emails        text[] NOT NULL,
  cc_emails        text[] NOT NULL DEFAULT '{}',
  subject          text NOT NULL,
  body_text        text NOT NULL,
  attachment_name  text,
  status           text NOT NULL DEFAULT 'pending_authorization'
                     CHECK (status IN ('pending_authorization','authorized','sent','failed','rejected','cancelled')),
  authorized_by    uuid,
  authorized_at    timestamptz,
  rejection_reason text,
  sent_at          timestamptz,
  error            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS proposal_email_dispatches_quote_idx  ON public.proposal_email_dispatches (quote_id);
CREATE INDEX IF NOT EXISTS proposal_email_dispatches_status_idx ON public.proposal_email_dispatches (status);

DROP TRIGGER IF EXISTS trg_proposal_email_dispatches_updated ON public.proposal_email_dispatches;
CREATE TRIGGER trg_proposal_email_dispatches_updated
  BEFORE UPDATE ON public.proposal_email_dispatches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.proposal_email_dispatches ENABLE ROW LEVEL SECURITY;

-- Cada pessoa vê os próprios pedidos; administradores veem todos. Quem grava é a função do servidor.
GRANT SELECT ON public.proposal_email_dispatches TO authenticated;
GRANT ALL    ON public.proposal_email_dispatches TO service_role;

DROP POLICY IF EXISTS "View own or admin dispatches" ON public.proposal_email_dispatches;
CREATE POLICY "View own or admin dispatches"
  ON public.proposal_email_dispatches FOR SELECT TO authenticated
  USING (requested_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
