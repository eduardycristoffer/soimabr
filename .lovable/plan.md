
# Relatório de Análise — Módulo de Contratos

## 1. Estado real hoje (confirmado por leitura)

### `GenerateContractDialog.tsx` (593 linhas)
- Pré-preenche signatários (via `company_settings`), gestores, cronograma 40/60 e `delivery_days` a partir de `quotes`.
- Cria `contracts` + `contract_signatories` (N por lado) + `contract_witnesses` + `contract_clause_snapshots` (com placeholders resolvidos por `contractPlaceholders.ts`).
- Suporta multi-contrato (locação + serviço) e toggles de cláusulas opcionais por `clause_key` (`is_core=false`).
- **Não tem** validação "entrada + parcelas = total" (só calcula `totalSchedule` para exibir, mas não bloqueia).
- **Não tem** editor estruturado de componentes/itens de grua — puxa `quote_items` como lista simples e renderiza em markdown (`itensInclusosTabela`).

### `ContratoEditor.tsx` (`/contratos/:id`, 402 linhas)
- Lista snapshots ordenados; cada cláusula é editável como **textarea de texto solto** (título + body markdown).
- Suporta adicionar / remover / reordenar cláusulas não-núcleo.
- Salva via `onBlur` (sem debounce, sem autosave visual, sem "salvo há X segundos").
- Já tem editores estruturados de `contract_signatories` e `contract_witnesses`.
- Bloqueia edição quando `status IN ('signed','cancelled')`.
- **Não tem**: editor por campos das cláusulas (só texto livre), versionamento, validação, preview lado-a-lado.

### Schema atual (confirmado)
- `contracts`: 33 colunas — todas do fluxo comercial já existem (`payment_schedule jsonb NOT NULL`, `delivery_days int`, `seller/buyer_rep_*`, `seller/buyer_manager_*`, `pdf_url`, `signed_pdf_url`, `generated_at`, `sent_at`, `signed_at`, `cancelled_at`, `company_id`).
- `contract_status` enum: **apenas** `draft, sent, signed, cancelled` — não tem `em_revisao` nem `aprovado`.
- `contract_clause_snapshots`: `id, contract_id, source_clause_id, order_index, title, body, is_core, clause_key, edited_by, edited_at, created_at`.
- **Não existe** tabela `contract_versions`.
- `quotes` tem `total` e `delivery_time`; não tem `components`/`specifications` como colunas estruturadas — vem de `quote_items` + colunas `grua_*` já usadas em `contractPlaceholders.ts`.

### PDF (`supabase/functions/generate-contract-pdf/index.ts`)
- Monta HTML em Deno e retorna `{ html }`. O cliente faz `window.open` + `window.print()`.
- Isso **é** a causa de: `about:blank` no header, URL, horário e "Página X" impressos automaticamente pelo Chrome.
- **Não** gera PDF real; nunca escreve em storage `contracts.pdf_url`.

### Cláusula 12 — confirmado errado
Trecho literal atual do template de venda:
> "Os gestores não possuem autorização para alterar o contrato. Comunicações serão feitas via e-mail dos representantes legais e gestores, com prazo de resposta de 2 dias úteis; **a ausência de manifestação após esse prazo será considerada concordância**."

Precisa ser reescrito — silêncio não deve implicar concordância em contrato jurídico.

### Cláusula 5 — hoje é estática
Título "Do Transporte e Prestação de Serviços". O texto lista quais serviços estão inclusos, mas hoje **não** é gerado dinamicamente a partir de itens de serviço listados na Cláusula 1 / `quote_items`. Precisará ler serviços e montar o texto.

---

## 2. PDF real — abordagem recomendada

Deno Edge Function **não roda Puppeteer/Chromium**. Opções viáveis:

1. **Serviço HTTP externo de HTML→PDF** (recomendado):
   - PDFShift, DocRaptor, Api2Pdf, PDF.co, ou Browserless.io (Puppeteer as a service).
   - A edge function envia o HTML atual e recebe binário PDF, faz upload em `storage/contracts/{id}.pdf`, grava `pdf_url` e retorna URL assinada.
   - Custo baixo (~US$ 9/mês para volume típico); zero manutenção.
   - Requer 1 secret novo (ex: `PDF_API_KEY`).
2. **Deno-compatível puro (sem browser)**: `jsPDF` ou `pdfkit` via `npm:` — funcionam, mas exigem reescrever o layout (perde CSS de impressão avançado). Não recomendo para um contrato jurídico multi-página com formatação rica.
3. **Manter print()** removendo a estética do browser: impossível — Chrome sempre injeta header/footer no print, só o usuário desliga manualmente.

**Recomendação: opção 1** (PDFShift ou Browserless). Fluxo: mesma função monta HTML como hoje → chama API → salva no bucket `contracts` → atualiza `contracts.pdf_url` → cliente baixa via URL assinada. Fallback: se a API falhar, retornar HTML como hoje (não quebra o que funciona).

---

## 3. Migrations aditivas necessárias

Todas **aditivas**, nenhuma destrutiva:

```sql
-- (a) novos status
ALTER TYPE contract_status ADD VALUE IF NOT EXISTS 'em_revisao';
ALTER TYPE contract_status ADD VALUE IF NOT EXISTS 'aprovado';

-- (b) versionamento
CREATE TABLE public.contract_versions (
  id uuid PK default gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  version_number int NOT NULL,
  contract_data jsonb NOT NULL,     -- snapshot da row contracts
  clauses_data jsonb NOT NULL,      -- snapshot de todas as snapshots
  signatories_data jsonb,
  witnesses_data jsonb,
  rendered_html text,
  change_summary text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL default now(),
  UNIQUE(contract_id, version_number)
);
-- + GRANT + RLS (mesma regra de contracts: dono da quote / admin)

-- (c) colunas em contracts
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS current_version int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS finalized_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id);
```

Trigger `prevent_signed_contract_edit` já existe e continua válido; será estendido para tratar `aprovado` como bloqueio parcial.

---

## 4. Plano faseado (6 fases incrementais, cada uma testável sem quebrar as anteriores)

### Fase 1 — Correções cirúrgicas de conteúdo (baixo risco)
- Reescrever cláusula 12 no template de venda removendo "ausência = concordância". Trocar por "aguardando resposta expressa; ausência não implica concordância".
- Corrigir mesmo padrão nos templates de locação e serviço, se aplicável.
- Ajustar `numeroPorExtenso` se houver casos truncados (validar com valores reais dos CTR260001/002).
- **Sem migration de schema**, só `UPDATE` em `contract_clauses`.

### Fase 2 — Validações e UX no dialog de geração
- Bloquear geração quando `Σ payment_schedule.value ≠ quote.total` (tolerância 0,01). Mostrar diff visual.
- Validar CPFs com `isValidCPF` (`src/lib/validators.ts`) em signatários/testemunhas.
- Sinalizar dados fictícios (ex: CPF `000.000.000-00`, nome "TESTE").
- Sem mudança de schema.

### Fase 3 — Cláusula 5 dinâmica a partir de serviços
- Estender `buildPlaceholderMap` com `servicos_inclusos_lista` gerado a partir de `quote_items` de categoria serviço + flags `rental_*_included`.
- Reescrever body da cláusula 5 dos templates usando o novo placeholder.
- Sem mudança de schema.

### Fase 4 — PDF real
- Adicionar secret `PDF_API_KEY`.
- Modificar `generate-contract-pdf` para chamar API externa, fazer upload no bucket `contracts`, salvar `pdf_url`, retornar `{ pdf_url, html }`.
- Atualizar `ContratoEditor.handleGeneratePdf` para abrir `pdf_url` (signed URL) em nova aba, com fallback ao HTML atual se `pdf_url` vier vazio.
- **Sem mudança de schema.**

### Fase 5 — Versionamento e novos status (a migration ADITIVA da seção 3 entra aqui)
- Criar `contract_versions`, adicionar valores de enum, colunas novas.
- Adicionar UI em `ContratoEditor`: barra com "Versão N — Salvar nova versão", lista lateral de versões, botão "Restaurar esta versão" (cria nova versão a partir da antiga, não sobrescreve).
- Botões "Enviar para revisão" (`draft` → `em_revisao`) e "Aprovar" (`em_revisao` → `aprovado`, grava `approved_at`/`approved_by`).
- Estender `prevent_signed_contract_edit` para tornar `aprovado` bloqueado a não-admins (permite ajustes só via nova versão).

### Fase 6 — Editor estruturado + autosave
- Adicionar debounce (~800ms) nos `onBlur` de cláusulas → autosave silencioso com badge "Salvando…" / "Salvo há Xs".
- Para cláusulas com `clause_key` conhecida (ex: `pagamento`, `entrega`, `garantia`, `signatarios`), oferecer **cards de edição estruturada** que geram markdown determinístico em vez de textarea livre. Cláusulas sem `clause_key` mantêm textarea (não force fit).
- Preview lado-a-lado (markdown renderizado) opcional atrás de toggle.

---

## 5. Escopo e ordem de execução recomendada

Estimativa relativa (t-shirt): Fase 1 = XS, Fase 2 = S, Fase 3 = S, Fase 4 = M (depende de escolher e configurar a API de PDF), Fase 5 = L (migration + UI de versões), Fase 6 = L (cards estruturados por cláusula).

Ordem sugerida: **1 → 2 → 3 → 4 → 5 → 6**. Cada fase é auto-suficiente; após cada uma, o CTR260001/CTR260002 continua funcionando exatamente como hoje mais as melhorias.

---

## 6. Perguntas para você decidir antes da Fase 4

- Qual provedor de HTML→PDF você prefere (PDFShift / Browserless / DocRaptor / outro)? Se não tem preferência, sugiro **PDFShift** (mais simples, plano gratuito de 50 PDFs/mês para validar).
- Antes da Fase 5, quer que "aprovado" bloqueie edição para todos (inclusive admin) ou só para operadores?
- Fase 6: em quais cláusulas quer editor estruturado primeiro? Sugiro `pagamento`, `entrega`, `signatários` (o resto pode ficar em texto livre).

Após você confirmar, executo **fase por fase**, com aprovação entre elas.
