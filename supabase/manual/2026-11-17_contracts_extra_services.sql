-- ============================================================================
-- ATUALIZAÇÃO DE BANCO (manual) — serviços adicionais do contrato
-- ============================================================================
-- O Lovable NÃO executa migrations que chegam pelo git. Para aplicar:
--   a) pelo chat do Lovable: peça "execute esta migration" e cole o SQL abaixo; ou
--   b) pelo SQL editor do Lovable Cloud (Database > SQL).
--
-- O que faz: guarda no contrato a lista de "serviços adicionais" digitados na geração
-- (ex.: frete, montagem) para que possam ser editados depois no editor do contrato.
-- É uma coluna nova, opcional, sem efeito sobre contratos existentes.
-- O código do app já funciona SEM esta coluna (a edição de serviços adicionais só
-- aparece depois que ela existir).
-- ============================================================================

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS extra_services jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.contracts.extra_services IS
  'Serviços adicionais (lista de textos) incluídos na cláusula de serviços do contrato';
