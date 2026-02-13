
# Especificacoes Tecnicas por Grua (Multi-Grua)

## Problema Atual

As especificacoes tecnicas (lanca, altura torre, carga maxima, carga ponta, altura de trabalho) sao armazenadas globalmente na tabela `quotes`. Quando ha mais de uma grua na proposta, todas compartilham os mesmos valores, o que esta incorreto.

## Solucao

Mover as especificacoes tecnicas para a tabela `quote_items`, vinculando-as a cada item de grua individualmente. Na interface, ao inves de um unico card de especificacoes, exibir um card por grua selecionada com seus campos independentes.

---

## 1. Migracao do Banco de Dados

Adicionar 5 colunas na tabela `quote_items` para armazenar specs por item:

- `grua_lanca_m NUMERIC`
- `grua_altura_torre_m NUMERIC`
- `grua_carga_maxima_kg NUMERIC`
- `grua_carga_ponta_kg NUMERIC`
- `grua_altura_trabalho_m NUMERIC`

Migrar dados existentes: copiar os valores atuais de `quotes` para o primeiro item de grua em `quote_items` (para nao perder dados).

As colunas na tabela `quotes` serao mantidas temporariamente para compatibilidade, mas o codigo passara a ler/escrever nos items.

---

## 2. Modelo de Dados no Frontend (`useQuoteWizard.ts`)

Adicionar campos opcionais de specs ao `QuoteItemDraft`:

```text
export interface QuoteItemDraft {
  ...campos existentes...
  grua_lanca_m?: number | null;
  grua_altura_torre_m?: number | null;
  grua_carga_maxima_kg?: number | null;
  grua_carga_ponta_kg?: number | null;
  grua_altura_trabalho_m?: number | null;
}
```

Remover os campos globais `grua_*` do `QuoteWizardData` (ou mante-los como fallback mas sem uso).

---

## 3. Step Equipamento (`StepEquipment.tsx`)

Ao inves de um unico card de "Especificacoes Tecnicas da Grua", renderizar **um card por grua** na lista `data.equipment`:

- Titulo do card: nome da grua (ex: "Grua ascensional SGT 3610 TL TR")
- Cada card com os 5 campos: Lanca, Altura Torre, Carga Maxima, Carga Ponta, Altura de Trabalho
- Alteracoes atualizam o item especifico no array `equipment`

---

## 4. Step Revisao (`StepReview.tsx`)

Exibir as especificacoes de cada grua separadamente, iterando sobre `data.equipment` e mostrando os specs de cada uma.

---

## 5. Salvamento (`QuoteWizard.tsx`)

Na insercao de `quote_items`, incluir os campos `grua_*` para cada item de equipamento. Tambem manter os valores na tabela `quotes` (copiando do primeiro item) para compatibilidade com o PDF.

---

## 6. PDF (`generate-pdf/index.ts`)

Atualizar o bloco "Partes Consideradas para a Cotacao" para listar cada grua com suas especificacoes individuais, ao inves de uma unica secao global. Cada grua tera seu proprio sub-bloco com nome do produto e specs.

---

## 7. Edicao de Proposta

Na carga de proposta para edicao, ler os campos `grua_*` de cada `quote_item` e popular os dados no array `equipment`.

---

## Arquivos Modificados

| Arquivo | Acao |
|---------|------|
| Migration SQL | Adicionar colunas `grua_*` em `quote_items` + migrar dados |
| `src/hooks/useQuoteWizard.ts` | Specs no `QuoteItemDraft`, remover campos globais |
| `src/components/quotes/steps/StepEquipment.tsx` | Card por grua |
| `src/components/quotes/steps/StepReview.tsx` | Specs por grua na revisao |
| `src/components/quotes/QuoteWizard.tsx` | Salvar/carregar specs por item |
| `supabase/functions/generate-pdf/index.ts` | Specs por grua no PDF |
