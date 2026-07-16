# Módulo de Contratos

Implementação completa do módulo de Contratos gerados a partir de Propostas finalizadas, com templates versionados, cláusulas editáveis por contrato (via snapshots), PDF e upload manual do assinado.

## Escopo

### 1. Migration (backend)
Criar em uma única migration:
- Enum `contract_status` (`draft`, `sent`, `signed`, `cancelled`).
- Tabelas: `contract_templates`, `contract_clauses`, `contracts`, `contract_clause_snapshots` (schema exato do briefing).
- `ALTER TABLE company_settings` adicionando `representante_nome/cpf/rg/cargo` e `inscricao_estadual`.
- GRANTs para `authenticated` e `service_role` em todas as novas tabelas.
- RLS espelhando `quotes`:
  - `contracts`: admin ALL; operador SELECT/INSERT/UPDATE/DELETE nos próprios (via `created_by = auth.uid()` + `user_quote_access` equivalente através do quote_id vinculado).
  - `contract_clause_snapshots`: mesma visibilidade do contrato pai.
  - `contract_templates`/`contract_clauses`: SELECT para `authenticated`; INSERT/UPDATE/DELETE só admin.
- Trigger `set_contract_created_by_from_auth` (mesmo padrão do de quotes).
- Trigger `generate_contract_number` (padrão `CTRYY####`).
- Trigger `updated_at` nas 4 tabelas novas.
- Trigger `prevent_signed_contract_edit` (contrato com `status='signed'` só permite atualizar `pdf_url`/`signed_pdf_url`).
- Seed do template **Venda** (v1, ativo) com as 16 cláusulas (0 a 15) do briefing.
- Seed do template **Locação** (v1, ativo — rascunho, marcado no `name`: "Locação (Rascunho — revisar com jurídico)") com as 15 cláusulas adaptadas.

### 2. Resolução de placeholders (util TS)
`src/lib/contractPlaceholders.ts`: função `resolveClause(body, ctx)` que substitui `{{campo}}` por valores da quote/client/company_settings + inputs do formulário de geração. Inclui:
- Formatação BRL, valor por extenso pt-BR (função `numeroPorExtenso`).
- Geração da tabela markdown de itens inclusos a partir de `quote_items`.
- Geração da tabela markdown de condições de pagamento a partir do `payment_schedule` (jsonb) informado no formulário de geração.
- Mapeamento completo conforme seção 2 do briefing (venda + locação).

### 3. Telas (frontend)

**Botão "Gerar Contrato"** em `QuoteDetailModal.tsx`:
- Visível quando `quote.status === 'finalized'`.
- Abre `<GenerateContractDialog>`: coleta representantes legais da compradora, gestores de contrato de ambos os lados, condições de pagamento (entrada + parcelas com valor/vencimento), prazo de entrega, override opcional do representante da vendedora.
- Ao confirmar: cria `contracts` + insere `contract_clause_snapshots` com bodies já resolvidos, navega para `/contratos/:id`.

**`/contratos`** (`src/pages/Contratos.tsx`): lista com filtros por status/tipo/cliente, mesma estética de `Orcamentos.tsx`.

**`/contratos/:id`** (`src/pages/ContratoEditor.tsx`):
- Cabeçalho: número, status, quote origem, cliente.
- Formulário de representantes/gestores/pagamento/prazo (persistindo em `contracts`).
- Lista numerada de cláusulas (`contract_clause_snapshots`) com:
  - Drag-and-drop (`@dnd-kit/sortable`, já no projeto se disponível — senão simples botões up/down para evitar dep nova).
  - Editor de texto (Textarea auto-resize com markdown, sem editor rich novo).
  - Ações: editar, adicionar avulsa, remover (bloqueado se `is_core`).
- Ações globais: **Gerar PDF** (edge function nova `generate-contract-pdf` reaproveitando a engine de `generate-pdf`), **Marcar como Enviado**, **Anexar PDF Assinado** (upload no bucket `contracts` — criado via tool `supabase--storage_create_bucket`, privado).
- Após `status='signed'`: cláusulas viram read-only.

**`/admin/modelos-contrato`** (`src/pages/ContractTemplates.tsx`): CRUD de templates e cláusulas mestre, separado por tipo (tabs Venda/Locação), botão "Nova versão" (duplica template incrementando `version`), toggle `is_active`. Rota admin-only.

### 4. Edge Function `generate-contract-pdf`
`supabase/functions/generate-contract-pdf/index.ts`: valida JWT, busca contrato + snapshots + company_settings, monta HTML com o mesmo layout visual do PDF de proposta (cabeçalho SOIMA, cores, tipografia), renderiza cláusulas como seções numeradas, retorna `{ html, contract_number }`. Frontend abre em nova aba para imprimir/salvar como PDF, mesma UX do PDF de proposta.

### 5. Roteamento & navegação
- `App.tsx`: registrar `/contratos`, `/contratos/:id`, `/admin/modelos-contrato`.
- `Sidebar.tsx`: adicionar item "Contratos" (todos) e "Modelos de Contrato" (admin-only).
- `types/index.ts`: exportar tipos gerados.

### 6. O que NÃO está no escopo
- Assinatura eletrônica integrada (só upload manual do PDF assinado).
- Alteração do fluxo de propostas além do botão "Gerar Contrato".
- Editor rich-text WYSIWYG (usaremos textarea + markdown simples, mesmo padrão do resto do app).
- Notificações por e-mail ao gerar/enviar contrato (pode ser fase 2).

## Ordem de execução
1. Migration (schema + RLS + triggers + seeds dos 2 templates) → aprovação do usuário.
2. Bucket `contracts` (privado) via tool.
3. Util `contractPlaceholders.ts` + tipos.
4. Edge function `generate-contract-pdf`.
5. Telas: lista, editor, dialog de geração, templates admin.
6. Botão "Gerar Contrato" no `QuoteDetailModal`.
7. Rotas + sidebar.
8. Verificação: build + smoke test navegando pelas telas via Playwright.

## Pontos que preciso confirmar antes de codar
1. **Bucket de contratos**: OK criar `contracts` privado para armazenar o PDF assinado (upload manual)?
2. **Rota admin de templates**: `/admin/modelos-contrato` ou prefere sem prefixo `admin` (só protegida por role)?
3. **Template de Locação**: confirmo que gero um rascunho baseado no de venda + campos rental_* já existentes, com aviso visual "revisar com jurídico" — está OK ativar (`is_active=true`) ou prefere deixar `is_active=false` até revisão manual?
4. **Editor de cláusulas**: textarea + markdown (mais leve, coerente com o resto do app) ou querem um editor rich-text (adiciona dependência tipo TipTap)?
5. **PDF**: usar a mesma engine HTML→print do `generate-pdf` de propostas (abre nova aba do navegador para imprimir/salvar) — confirma que essa UX serve, ou querem download direto como .pdf (exigiria puppeteer/deno-pdf na edge function, mais complexo)?