-- ============================================================================
-- ATUALIZAÇÃO DE BANCO (manual) — Confirmar o fechamento de uma proposta finalizada
-- ============================================================================
-- O Lovable NÃO executa migrations que chegam pelo git. Para aplicar:
--   a) pelo chat do Lovable: peça "execute esta migration" e cole o SQL abaixo; ou
--   b) pelo SQL editor do Lovable Cloud (Database > SQL).
--
-- O que faz (só colunas NOVAS e opcionais; nada existente é alterado ou apagado):
--   quotes.closed_at     → quando o fechamento foi confirmado (vazio = ainda não fechada)
--   quotes.closed_by     → quem confirmou
--   quotes.closing_note  → observação do fechamento (ex.: nº do pedido de compra)
--
-- O código do app funciona SEM este script: o botão "Confirmar fechamento" só aparece
-- depois que as colunas existirem. As propostas continuam como estão.
-- ============================================================================

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_by uuid,
  ADD COLUMN IF NOT EXISTS closing_note text;

CREATE INDEX IF NOT EXISTS quotes_closed_at_idx
  ON public.quotes (closed_at)
  WHERE closed_at IS NOT NULL;

COMMENT ON COLUMN public.quotes.closed_at IS
  'Fechamento confirmado de uma proposta finalizada (vazio = em aberto)';
COMMENT ON COLUMN public.quotes.closed_by IS
  'Usuário que confirmou o fechamento';
COMMENT ON COLUMN public.quotes.closing_note IS
  'Observação do fechamento (ex.: número do pedido de compra)';
