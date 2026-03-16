
## Remover Pintura da Garantia, Atualizar Normas e Adicionar Topicos de Pagamento

### Resumo

3 alteracoes:

1. **Remover "Pintura" da garantia** -- tirar o campo do wizard, do review, e do PDF
2. **Atualizar normas aplicadas** -- substituir a norma atual ("ABNT NBR 8400") pela lista completa: F.E.M. 1.001-A3, NR 12, NR 18, NBR 8400-1:2019, NBR 8800:2008, NBR 16147:2021, NBR 10084:2020, NBR 8681, NBE ISO 13.849-2 - 02/2019
3. **Condicoes de pagamento com topicos** -- permitir adicionar multiplos topicos (lista) alem do texto simples que ja existe

---

### Detalhes tecnicos

| Arquivo | Alteracao |
|---------|-----------|
| Migracao SQL | Adicionar coluna `payment_terms_items` (jsonb, nullable) na tabela `quotes` |
| `src/hooks/useQuoteWizard.ts` | Remover `warranty_paint_years`, adicionar `payment_terms_items: PaymentTermItem[]` |
| `src/components/quotes/steps/StepTechnical.tsx` | Remover campo "Pintura (anos)" da secao Garantia, mudar grid de 3 para 2 colunas |
| `src/components/quotes/steps/StepCommercial.tsx` | Adicionar secao de topicos de pagamento (lista dinamica com botao adicionar/remover), mantendo o campo texto existente |
| `src/components/quotes/steps/StepReview.tsx` | Remover pintura do resumo de garantia, exibir topicos de pagamento |
| `src/components/quotes/QuoteWizard.tsx` | Salvar `payment_terms_items` no banco |
| `src/components/quotes/QuoteDetailModal.tsx` | Exibir topicos de pagamento |
| `supabase/functions/generate-pdf/index.ts` | Remover pintura da garantia, atualizar normas, renderizar topicos de pagamento |

#### 1. Migracao SQL

Adicionar coluna na tabela `quotes`:
```
payment_terms_items jsonb default '[]'
```

Formato: `[{ "text": "50% na aprovação" }, { "text": "50% na entrega" }]`

#### 2. Remover Pintura da Garantia

- **StepTechnical.tsx**: Remover o campo "Pintura (anos)" e mudar o grid de `md:grid-cols-3` para `md:grid-cols-2`
- **useQuoteWizard.ts**: Remover `warranty_paint_years` do tipo e do INITIAL_DATA
- **StepReview.tsx**: Remover "{X}a pintura" do resumo
- **generate-pdf/index.ts**: Remover a linha `warranty_paint` das traducoes e do calculo de garantia. Remover `py` do buildWarrantyHTML

#### 3. Atualizar Normas

- **generate-pdf/index.ts**: Substituir o texto de `warranty_norms` em ambos idiomas:
  - PT-BR: "Normas aplicadas: F.E.M. 1.001-A3 - NR 12 - NR 18 - NBR 8400-1:2019 - NBR 8800:2008 - NBR 16147:2021 - NBR 10084:2020 - NBR 8681 - NBE ISO 13.849-2 - 02/2019"
  - EN: "Applied standards: F.E.M. 1.001-A3 - NR 12 - NR 18 - NBR 8400-1:2019 - NBR 8800:2008 - NBR 16147:2021 - NBR 10084:2020 - NBR 8681 - NBE ISO 13.849-2 - 02/2019"

#### 4. Condicoes de Pagamento com Topicos

**StepCommercial.tsx**: Abaixo do campo texto existente "Condicoes de Pagamento", adicionar secao "Topicos de Pagamento" com:
- Lista dinamica de itens (input + botao remover)
- Botao "Adicionar topico"
- Exemplo: "50% na aprovacao do pedido", "30% na entrega", "20% no comissionamento"

**PDF**: Quando `payment_terms_items` tiver itens, renderizar como lista `<ul>` abaixo do campo texto de pagamento nas condicoes comerciais.

**QuoteWizard.tsx**: Incluir `payment_terms_items` no payload de salvamento.

#### 5. Campos no banco que nao mudam

A coluna `warranty_paint_years` permanece no banco (nullable) mas nao sera mais usada pelo wizard. Propostas antigas que ja tem valor preenchido continuam funcionando no PDF (fallback para 0 se null).

---

### Resultado esperado

- Garantia exibe apenas "Estrutural" e "Componentes"
- Normas atualizadas com a lista completa no PDF
- Condicoes de pagamento suportam tanto texto livre quanto lista de topicos
