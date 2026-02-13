
# Pipeline de Vendas Completo — Implementação Concluída

## Status: ✅ IMPLEMENTADO

### Fase 1 — Banco de Dados ✅
- `pipeline_stages`: colunas `is_fixed`, `stage_type` adicionadas
- Etapas fixas: Novo Lead, Primeiro Contato, Proposta, Fechamento - Ganho, Perdido
- Etapas editáveis: Qualificação, Negociação, Proposta Enviada
- `leads`: colunas `source`, `quote_id`, `metadata`, `lead_origin`
- Tabela `pipeline_history` para auditoria
- Trigger `prevent_fixed_stage_mutation` protege etapas fixas
- Trigger `prevent_final_stage_move` bloqueia movimentação de etapas finais por operadores

### Fase 2 — Propostas no Pipeline ✅
- QuoteWizard auto-cria/atualiza card no pipeline ao salvar proposta
- Cards diferenciados visualmente (Lead vs Proposta)
- `lead_origin = 'proposal_direct'` para propostas sem lead prévio

### Fase 3 — Funcionalidades de Lead ✅
- Campo `source` no formulário de lead (manual, indicação, webhook, outro)
- Conversão Lead → Cliente com modal dedicado
- Webhook edge function `webhook-leads` para entrada externa
- Gestão de etapas pelo admin (PipelineStageManager)

### Fase 4 — Exportação e Melhorias ✅
- Exportação CSV e Excel com filtros
- Badges de tipo (Lead/Proposta), source, conversão
- Filtro rápido por tipo (Todos/Leads/Propostas)

### Decisão: leads.quote_id
- Representa APENAS a proposta ativa associada (1:1 por ora)
- Novas propostas para o mesmo cliente atualizam o quote_id
- Histórico mantido em pipeline_history
