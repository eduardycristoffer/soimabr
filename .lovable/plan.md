## Objetivo
Garantir que o wizard tenha a opção de **mostrar ou ocultar o valor unitário** dos itens no PDF da proposta. Quando ocultado, a tabela "ITENS DA PROPOSTA" mostra apenas #, Código, Descrição e Qtd — sem coluna de valor por item — e somente o **Total** final aparece no rodapé.

## Situação atual
- **Proposta de Venda (QuoteWizard)**: o toggle já existe no Step "Desconto" (`StepDiscount.tsx`), campo `hide_unit_prices`. Funciona e o PDF respeita.
- **Proposta de Locação (RentalWizard)**: o campo `hide_unit_prices` existe nos dados e é salvo, mas **não há checkbox na UI** — usuário não consegue marcar.
- O PDF já trata corretamente os dois casos (oculta coluna de valor por item e mantém Total final).

## Mudanças

### 1. RentalStepCommercial.tsx
Adicionar checkbox **"Esconder valores unitários no PDF"** ligado a `data.hide_unit_prices`, com texto auxiliar:
> "A tabela de itens não exibirá valores — apenas o total geral da proposta será mostrado."

Posicionar logo após o controle de desconto, no mesmo padrão visual do `StepDiscount.tsx` (Sales).

### 2. StepDiscount.tsx (Sales) — ajuste de clareza
Reforçar o texto do toggle existente para deixar explícito o efeito:
- Label: "Esconder valores unitários dos itens no PDF"
- Descrição: "A coluna de valor por item será omitida. Apenas o Total final da proposta aparecerá."

### 3. StepReview.tsx (Sales) — preview
Confirmar que o resumo de revisão indica quando a opção está ativa (já existe bloco em `data.hide_unit_prices`). Sem mudanças funcionais se já estiver correto.

### 4. PDF (`supabase/functions/generate-pdf/index.ts`)
Sem alterações — o comportamento já está implementado:
- Com `hide_unit_prices = true`: tabela sem coluna de valor por item; rodapé mostra apenas Total final.
- Com `hide_unit_prices = false`: comportamento atual (coluna Total por item + Total final).

## Resultado
- Tanto Venda quanto Locação terão o toggle visível no wizard.
- Marcado → PDF como solicitado (sem valor por item, só total final).
- Desmarcado → PDF como hoje (com valor por item).
