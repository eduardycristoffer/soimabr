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