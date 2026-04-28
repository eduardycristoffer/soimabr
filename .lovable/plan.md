## Ajustes na etapa Técnica do wizard de Venda

### 1. Remover itens da pré-seleção de "Itens Integrantes da Grua"

Os itens padrão são carregados da tabela `default_panel_items` no Supabase (hoje existem 10 itens replicados para cada grua cadastrada). Vamos remover globalmente destes registros:
- `Projetada/construída conforme ABNT NBR 8400`
- `Painel elétrico anticorrosão`

Ação: executar um `DELETE` em `default_panel_items` onde `item_text` seja um desses dois textos. Assim, ao selecionar uma grua no wizard, esses itens não serão mais pré-carregados. Itens que o usuário já tenha adicionado manualmente em propostas antigas (em `quote_panel_items`) não serão afetados.

Também remover essas duas linhas do seed da migration `20260220012757_...sql` (comentário/código histórico) — na prática não altera nada porque a migration já rodou, mas mantém o arquivo coerente. *Observação:* migrations antigas não são re-executadas, então basta o DELETE em runtime.

### 2. Garantia: padrão 3 anos estrutural / 2 anos componentes

Hoje o padrão é `3` (estrutural) e `1` (componentes). Alterar para `3` e `2`:

- `src/hooks/useQuoteWizard.ts` linha 136: `warranty_components_years: 1` → `warranty_components_years: 2`
- `src/components/quotes/steps/StepTechnical.tsx` linha 143: condição de "valores iniciais" passa a ser `=== 3 && === 2`
- `supabase/functions/generate-pdf/index.ts` linha 1320: fallback `?? 1` → `?? 2`
- Atualizar a coluna `products.default_warranty_components_years` para `2` onde atualmente está `1` (default do schema continua como está; apenas atualizar valores de dados existentes via insert tool).

A coluna `warranty_paint_years` já está fora da UI (apenas estrutural e componentes aparecem), conforme a memória do projeto. Não mexemos nela.

### 3. Rotular "Potência (HP)" como "Potência (kW)"

Nos 3 blocos (Elevação / Distribuição / Rotação) do StepTechnical, trocar o label `Potência (HP)` por `Potência (kW)`. Os campos continuam gravando em `panel_motor_*_hp` (nome interno mantido para não quebrar dados existentes), mas o rótulo exibido será **kW**.

No PDF (`generate-pdf/index.ts` linha 1293), trocar `${hp} HP` por `${hp} kW` para que a saída reflita a mesma unidade.

Arquivos:
- `src/components/quotes/steps/StepTechnical.tsx` linhas 327, 346, 365
- `supabase/functions/generate-pdf/index.ts` linha 1293

### Resumo de arquivos alterados

| Arquivo / Ação | Mudança |
|---|---|
| DB: `default_panel_items` (insert tool) | DELETE dos 2 textos |
| DB: `products` (insert tool) | UPDATE `default_warranty_components_years = 2` |
| `src/hooks/useQuoteWizard.ts` | default `warranty_components_years: 2` |
| `src/components/quotes/steps/StepTechnical.tsx` | condição warranty, 3 labels HP→kW |
| `supabase/functions/generate-pdf/index.ts` | fallback warranty `?? 2`, string `HP`→`kW` |
