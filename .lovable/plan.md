
# Precificacao Internacional com Conversao USD em Tempo Real

## Resumo

Adicionar suporte completo a precificacao internacional: campo de preco internacional nos produtos, cotacao USD/BRL em tempo real no wizard de propostas, logica de conversao automatica, e exibicao dual (BRL + USD) no PDF.

---

## 1. Banco de Dados (Migracoes)

### Tabela `products`
- Adicionar coluna `international_price_brl` (numeric, nullable, default null)
  - Quando preenchido, indica que o produto pode ser usado em propostas internacionais USD
  - Quando null, produto bloqueado para propostas internacionais em USD

### Tabela `quotes`
- Adicionar colunas:
  - `usd_brl_rate_used` (numeric, nullable) -- cotacao USD/BRL usada ao salvar/finalizar
  - `usd_brl_rate_updated_at` (timestamptz, nullable) -- horario da cotacao

### Tabela `quote_items`
- Adicionar coluna `international_unit_price_brl` (numeric, nullable) -- preco internacional base usado no item

---

## 2. Cadastro de Produto (`ProductFormModal.tsx`)

- Adicionar campo "Preco Internacional (BRL)" ao formulario, ao lado do preco normal
- Validacao: >= 0 quando preenchido
- O campo e opcional (null = produto nao disponivel para proposta internacional USD)
- Atualizar schema zod e payload de insert/update

### Tabela de Produtos (`Produtos.tsx`)
- Adicionar coluna "Preco Intl." na tabela, mostrando o valor ou "-" quando nao configurado

---

## 3. Hook de Cotacao USD/BRL (`useUsdBrlRate.ts`)

Novo hook que:
- Busca cotacao de API publica (AwesomeAPI: `https://economia.awesomeapi.com.br/json/last/USD-BRL`)
- Polling a cada 30 segundos via `refetchInterval`
- Retorna `{ rate, lastUpdatedAt, isLoading, isError, isStale }`
- Fallback: se falhar, mantem ultimo valor valido e seta `isStale = true`

---

## 4. Wizard de Proposta -- Alteracoes

### StepClient (`StepClient.tsx`)
- Ao selecionar cliente, salvar `client_type` no wizard data
- Adicionar `client_type` ao `QuoteWizardData`

### StepCommercial (`StepCommercial.tsx`)
- Se `client_type === "internacional"`:
  - Remover opcao EUR do select de moeda (permitir apenas BRL e USD)
- Se `client_type === "nacional"`:
  - Manter BRL/USD/EUR como esta

### StepEquipment / StepComponents / StepAccessories (via `ProductPicker.tsx`)
- Se `currency === "USD"` e `client_type === "internacional"`:
  - Usar `international_price_brl` como base ao adicionar item
  - Bloquear adicao de produto sem `international_price_brl` (mostrar mensagem)
  - Exibir preco em BRL internacional + valor estimado USD (usando cotacao do hook)
- Se nao internacional ou moeda != USD:
  - Comportamento atual (preco normal)

### StepReview (`StepReview.tsx`)
- Se proposta internacional + USD:
  - Mostrar dual: valor BRL internacional e valor estimado USD
  - Exibir cotacao usada e horario
  - Mostrar disclaimer: "Valor em USD estimado com base na cotacao do dia e pode variar no momento do pagamento."
  - Indicador de cotacao com auto-refresh e horario da ultima atualizacao

### QuoteWizard (`QuoteWizard.tsx`)
- Instanciar `useUsdBrlRate()` e passar rate/lastUpdated para os steps relevantes
- Ao salvar: gravar `usd_brl_rate_used` e `usd_brl_rate_updated_at` no quote

### `useQuoteWizard.ts`
- Adicionar ao `QuoteWizardData`:
  - `client_type: "nacional" | "internacional"`
  - `usd_brl_rate_used: number | null`
  - `usd_brl_rate_updated_at: string | null`

---

## 5. PDF da Proposta (`generate-pdf/index.ts`)

- Se `quote.currency === "USD"` e cliente internacional:
  - Na tabela de itens, adicionar colunas "Valor Intl. (BRL)" e "Estimado (USD)"
  - Nos totais, mostrar ambos os valores (BRL e USD)
  - Exibir cotacao usada: "Cotacao USD/BRL utilizada: X,XXXX (atualizada em DD/MM/YYYY HH:MM)"
  - Adicionar disclaimer no rodape: "Valores em USD sao estimados com base na cotacao do dia e podem variar no momento do pagamento."
- Se proposta nacional ou BRL: PDF permanece identico

---

## 6. Validacoes e Bloqueios

| Cenario | Comportamento |
|---------|---------------|
| Cliente internacional + USD + produto sem `international_price_brl` | Bloquear adicao com mensagem |
| Cliente internacional + selecionar EUR | EUR nao aparece no select |
| Cliente nacional | Comportamento atual mantido |
| Cotacao indisponivel | Aviso visual, usa ultima cotacao valida |

---

## Detalhes Tecnicos -- Arquivos

| Arquivo | Acao |
|---------|------|
| Migracao SQL | Nova: adicionar colunas em products, quotes, quote_items |
| `src/hooks/useUsdBrlRate.ts` | **Novo** -- hook de cotacao com polling |
| `src/hooks/useQuoteWizard.ts` | Adicionar client_type e campos de cotacao ao data |
| `src/components/products/ProductFormModal.tsx` | Campo international_price_brl |
| `src/pages/Produtos.tsx` | Coluna "Preco Intl." na tabela |
| `src/components/quotes/steps/StepClient.tsx` | Salvar client_type no wizard data |
| `src/components/quotes/steps/StepCommercial.tsx` | Filtrar moedas por tipo de cliente |
| `src/components/quotes/steps/ProductPicker.tsx` | Logica de preco internacional + bloqueio |
| `src/components/quotes/steps/StepReview.tsx` | Exibicao dual BRL/USD + disclaimer |
| `src/components/quotes/QuoteWizard.tsx` | Instanciar hook, salvar cotacao no quote |
| `supabase/functions/generate-pdf/index.ts` | Tabela dual + disclaimer no PDF |
| `src/components/quotes/QuoteDetailModal.tsx` | Exibir info de cotacao na visualizacao |
