

# Adicionar Idioma da Proposta no Wizard (Ingles / Portugues)

## Resumo

Adicionar um campo "Idioma da Proposta" no passo 6 (Comercial) do wizard. O idioma escolhido sera salvo junto com a proposta e usado automaticamente ao gerar o PDF -- sem precisar perguntar na hora da exportacao.

---

## 1. Banco de Dados

Adicionar coluna `language` na tabela `quotes`:

- Tipo: `text`, default `'pt-BR'`, NOT NULL
- Valores aceitos: `'pt-BR'` ou `'en'`

Migracao simples:
```text
ALTER TABLE quotes ADD COLUMN language text NOT NULL DEFAULT 'pt-BR';
```

---

## 2. Hook do Wizard (`useQuoteWizard.ts`)

- Adicionar `language: "pt-BR" | "en"` ao `QuoteWizardData`
- Valor inicial: `"pt-BR"`

---

## 3. StepCommercial -- Seletor de Idioma

Adicionar um campo `Select` no grid existente ao lado dos demais campos:

- Label: "Idioma da Proposta"
- Opcoes:
  - Portugues (BR) -- padrao
  - English

---

## 4. QuoteWizard -- Salvar o campo `language`

No momento do save (salvar rascunho ou finalizar), incluir `data.language` no insert/update da tabela `quotes`.

---

## 5. Edge Function `generate-pdf` -- Traducao completa

Receber o campo `language` da proposta salva no banco (nao do request body). Criar um dicionario de traducoes com todas as labels do PDF:

| Chave | pt-BR | en |
|-------|-------|-----|
| title | Proposta Comercial | Commercial Proposal |
| date | Data | Date |
| validity | Validade | Validity |
| client | Cliente | Client |
| razao_social | Razao Social | Company Name |
| tipo | Tipo | Type |
| nacional/internacional | Nacional / Internacional | National / International |
| project | Projeto | Project |
| name/location | Nome / Local | Name / Location |
| crane_specs | Partes Consideradas para a Cotacao | Parts Considered for Quotation |
| jib/tower/loads | Lanca, Altura torre, Carga max, etc. | Jib, Tower Height, Max Load, etc. |
| items_section | Itens da Proposta | Proposal Items |
| code/description/qty/total | Codigo, Descricao, Qtd, Total | Code, Description, Qty, Total |
| subtotal/discount/total | Subtotal, Desconto, Total | Subtotal, Discount, Total |
| conditions | Condicoes Comerciais | Commercial Conditions |
| currency/delivery/payment/freight | Moeda, Prazo, Pagamento, Frete | Currency, Delivery, Payment, Freight |
| notes | Observacoes | Notes |
| generated_by | Documento gerado em... por... | Document generated on... by... |
| category labels | Grua, Acessorio, Torre, etc. | Crane, Accessory, Tower, etc. |

Substituir todas as strings hardcoded no HTML pelo dicionario `t.chave`.

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| Migracao SQL | Adicionar coluna `language` em `quotes` |
| `src/hooks/useQuoteWizard.ts` | Adicionar campo `language` ao state |
| `src/components/quotes/steps/StepCommercial.tsx` | Adicionar select de idioma |
| `src/components/quotes/QuoteWizard.tsx` | Incluir `language` no save |
| `supabase/functions/generate-pdf/index.ts` | Ler `quote.language`, aplicar dicionario de traducoes no HTML |

---

## Fluxo

1. Vendedor cria proposta no wizard
2. No passo 6 (Comercial), escolhe o idioma: Portugues ou Ingles
3. Salva a proposta (rascunho ou finalizada)
4. Ao gerar PDF, o sistema usa o idioma salvo na proposta automaticamente -- sem perguntar novamente
