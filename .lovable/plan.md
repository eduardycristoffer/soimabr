
# Webhooks, Integrações e Logs

## Resumo

Nova pagina admin "Webhooks e Integrações" com 4 abas: Webhook de Entrada, Webhook de Saída, Logs e Google Sheets. Inclui tabelas de configuração no banco, edge function atualizada com validação de token e status, nova edge function para disparar webhooks de saída, e tabela de logs centralizada.

---

## 1. Banco de Dados (3 novas tabelas + alteração)

### Tabela `webhook_configs`
Armazena configuração do webhook de entrada (1 registro singleton).

| Coluna | Tipo | Default |
|--------|------|---------|
| id | uuid PK | gen_random_uuid() |
| is_active | boolean | true |
| secret_token | text | null |
| created_at | timestamptz | now() |
| updated_at | timestamptz | now() |

RLS: Somente admin pode SELECT/UPDATE. Nenhum DELETE.

### Tabela `outbound_webhooks`
Configurações de webhooks de saída por evento.

| Coluna | Tipo | Default |
|--------|------|---------|
| id | uuid PK | gen_random_uuid() |
| event_type | text NOT NULL | - |
| target_url | text NOT NULL | - |
| headers | jsonb | '{}' |
| is_active | boolean | true |
| retry_count | integer | 3 |
| timeout_ms | integer | 5000 |
| created_at | timestamptz | now() |
| updated_at | timestamptz | now() |

Eventos: `lead.created`, `lead.updated`, `lead.converted`, `proposal.created`, `proposal.finalized`, `pipeline.stage_changed`

RLS: Admin full access.

### Tabela `webhook_logs`
Logs de entrada e saída.

| Coluna | Tipo | Default |
|--------|------|---------|
| id | uuid PK | gen_random_uuid() |
| direction | text NOT NULL | - |
| event_type | text | null |
| endpoint | text | null |
| status | text NOT NULL | - |
| http_status | integer | null |
| payload | jsonb | null |
| response | jsonb | null |
| created_at | timestamptz | now() |

RLS: Admin SELECT only. Edge functions inserem via service role.

### Tabela `google_sheets_config`
Configuração singleton para integração Google Sheets.

| Coluna | Tipo | Default |
|--------|------|---------|
| id | uuid PK | gen_random_uuid() |
| is_active | boolean | false |
| apps_script_url | text | null |
| spreadsheet_id | text | null |
| sheet_name | text | null |
| trigger_on | text | 'created' |
| trigger_stage_id | uuid | null |
| field_mapping | jsonb | default mapping |
| created_at | timestamptz | now() |
| updated_at | timestamptz | now() |

RLS: Admin full access.

---

## 2. Edge Functions

### Atualizar `webhook-leads/index.ts`
- Verificar se webhook esta ativo consultando `webhook_configs`
- Se inativo, retornar 403 e logar como "blocked" em `webhook_logs`
- Validar `secret_token` se configurado (header `X-Webhook-Secret`)
- Registrar todas as chamadas em `webhook_logs` (success/failed/blocked)

### Criar `dispatch-outbound-webhook/index.ts`
- Recebe evento via POST interno (chamado pelo frontend ou por triggers)
- Consulta `outbound_webhooks` ativos para o `event_type`
- Para cada webhook ativo, envia POST com retry (ate `retry_count`)
- Registra resultado em `webhook_logs`
- Verifica `google_sheets_config` e envia para Apps Script se ativo

---

## 3. Frontend

### Nova pagina: `src/pages/WebhooksIntegracoes.tsx`
- Acesso admin only (redirect se nao admin)
- 4 abas usando Tabs:

**Aba 1 - Webhook de Entrada:**
- Switch ativo/inativo
- Campo read-only com URL do endpoint
- Campo secret token (mascarado, com botao copiar/gerar)
- Lista de campos aceitos (informativo)

**Aba 2 - Webhooks de Saída:**
- Tabela com webhooks configurados
- Botao adicionar novo
- Modal de criação/edição: evento, URL, headers, retry, timeout, ativo/inativo
- Cada linha com toggle ativo/inativo rapido

**Aba 3 - Logs:**
- Tabela paginada com filtros (direção, evento, status, período)
- Clicar em uma linha abre modal com payload/response completo
- Badge colorido por status (success=green, failed=red, blocked=yellow)

**Aba 4 - Google Sheets:**
- Switch ativo/inativo
- Campos: URL Apps Script, ID planilha, nome aba
- Trigger: na criação ou em etapa especifica (select de etapas)
- Mapeamento de campos (informativo/editável)

### Componentes novos
| Arquivo | Descricao |
|---------|-----------|
| `src/pages/WebhooksIntegracoes.tsx` | Pagina principal com 4 abas |
| `src/components/webhooks/InboundWebhookConfig.tsx` | Config entrada |
| `src/components/webhooks/OutboundWebhookList.tsx` | Lista saída |
| `src/components/webhooks/OutboundWebhookFormModal.tsx` | Modal criar/editar |
| `src/components/webhooks/WebhookLogs.tsx` | Visualização de logs |
| `src/components/webhooks/WebhookLogDetailModal.tsx` | Modal payload |
| `src/components/webhooks/GoogleSheetsConfig.tsx` | Config Sheets |

### Rota e navegação
- Adicionar rota `/webhooks` em `App.tsx`
- Adicionar item "Webhooks" no Sidebar (icone `Webhook` do lucide, adminOnly)

---

## 4. Integração com eventos existentes

O frontend chamará `dispatch-outbound-webhook` nos pontos:
- Criação de lead (`usePipelineData` - createLeadMutation onSuccess)
- Atualização de lead (updateLeadMutation onSuccess)
- Conversão de lead (convertLeadMutation onSuccess)
- Criação de proposta (QuoteWizard save)
- Finalização de proposta
- Mudança de etapa (moveLeadMutation onSuccess)

A chamada será assíncrona (fire-and-forget) para não bloquear a UX.

---

## 5. Segurança
- Tokens/secrets nunca exibidos em plaintext apos salvar (mascarados com ****)
- RLS restritivo: admin only em todas as tabelas novas
- Edge function de entrada valida token opcionalmente
- Edge function de saída usa service role key
- Logs nunca expostos para operadores
