

## Melhorias no Wizard de Locação: ocultar valores e desconto

### O que muda

1. **Ocultar valores dos itens da grua no wizard** — No step de seleção da grua (RentalStepCrane), remover a exibição do "Valor mensal: R$ X" que aparece em cada card de grua. O valor só aparece depois, no step de configuração.

2. **Esconder desconto 100%** — No step Comercial (RentalStepCommercial) e no Resumo (RentalStepSummary):
   - Remover completamente a seção/campo de desconto do wizard de locação (input de desconto %, preview do desconto, e a linha de desconto no resumo financeiro)
   - Manter o campo `discount_percent` no hook zerado por padrão, sem possibilidade de edição no wizard de locação
   - No PDF, nunca mostrar linha de desconto para locação

3. **Melhorias gerais no wizard**:
   - Remover os checkboxes "Esconder valor do desconto no PDF" e "Esconder valores unitários no PDF" do step Comercial (não fazem sentido em locação pois não há tabela de itens com preços individuais e o desconto já é oculto)
   - Limpar o preview de totais no step Comercial removendo a linha de desconto

### Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `RentalStepCrane.tsx` | Remover linhas 106-109 (exibição do rental_monthly_price no card) |
| `RentalStepCommercial.tsx` | Remover campo de desconto (input + preview), remover checkboxes de hide_discount/hide_unit_prices. Manter apenas: Impostos, Validade, preview de totais (sem desconto), condições de pagamento, observações, idioma |
| `RentalStepSummary.tsx` | Remover linhas 117-119 (linha de desconto no breakdown financeiro) |
| `generate-pdf/index.ts` | Remover linhas 1644-1652 (linha de desconto na tabela de custos do PDF de locação). Ajustar cálculo para não aplicar desconto |

