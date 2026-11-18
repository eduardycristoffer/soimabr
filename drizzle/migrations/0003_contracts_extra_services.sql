ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS extra_services jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.contracts.extra_services IS
  'Serviços adicionais (lista de textos) incluídos na cláusula de serviços do contrato';