-- ============================================================================
-- ATUALIZAÇÃO DE BANCO (manual) — Proposta de serviço (modelo TECSU)
-- ============================================================================
-- O Lovable NÃO executa migrations que chegam pelo git. Para aplicar:
--   a) pelo chat do Lovable: peça "execute esta migration" e cole o SQL abaixo; ou
--   b) pelo SQL editor do Lovable Cloud (Database > SQL).
--
-- O que faz (só colunas NOVAS e opcionais; nada existente é alterado ou apagado):
--   quotes.service_data         → textos e dados da proposta de serviço (objeto, equipamento,
--                                  responsabilidades, considerações finais...), em JSON
--   quote_items.unit            → unidade da linha de preço (Vb, Hs, Mês, Único...)
--   quote_items.is_optional     → linha opcional (aparece na proposta, mas não soma no total)
--
-- O código do app funciona SEM este script: a opção "Serviço" só aparece em
-- Nova Proposta depois que as colunas existirem. Propostas de venda e de locação
-- continuam exatamente como estão.
-- ============================================================================

-- O tipo "servico" já foi criado numa migration anterior; o comando abaixo é só garantia.
ALTER TYPE public.quote_type ADD VALUE IF NOT EXISTS 'servico';

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS service_data jsonb;

ALTER TABLE public.quote_items
  ADD COLUMN IF NOT EXISTS unit text,
  ADD COLUMN IF NOT EXISTS is_optional boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.quotes.service_data IS
  'Proposta de serviço (quote_type = servico): objeto, equipamento, responsabilidades, considerações finais, assinante';
COMMENT ON COLUMN public.quote_items.unit IS
  'Unidade da linha de preço em propostas de serviço (Vb, Hs, Mês, Único...)';
COMMENT ON COLUMN public.quote_items.is_optional IS
  'Linha opcional em proposta de serviço: aparece na proposta, mas não entra no total';
