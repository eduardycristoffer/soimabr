

## Opção de esconder valor do desconto no PDF

### Resumo

Adicionar um checkbox no step de Descontos do wizard: "Esconder valor do desconto no PDF". Quando marcado, o PDF mostra apenas "Desconto aplicado" sem exibir o percentual nem o valor monetário. O resumo de valores no wizard continua mostrando tudo normalmente.

### Detalhes técnicos

| Arquivo | Alteração |
|---------|-----------|
| Migração SQL | `ALTER TABLE quotes ADD COLUMN hide_discount_value boolean DEFAULT false;` |
| `useQuoteWizard.ts` | Adicionar `hide_discount_value: boolean` ao tipo e `false` ao INITIAL_DATA |
| `StepDiscount.tsx` | Adicionar checkbox "Esconder valor do desconto no PDF" abaixo do campo de desconto (visível quando desconto > 0) |
| `QuoteWizard.tsx` | Incluir `hide_discount_value` no payload de salvamento |
| `generate-pdf/index.ts` | Quando `hide_discount_value === true`, trocar a linha de desconto por "Desconto aplicado" / "Discount applied" sem mostrar % nem valor |
| `StepReview.tsx` | Indicar no resumo que o desconto será oculto no PDF |

#### Comportamento no PDF

- `hide_discount_value = false` (padrão): exibe como hoje -- "Desconto (5.0%) -R$ 1.000,00"
- `hide_discount_value = true`: exibe apenas "Desconto aplicado" / "Discount applied" sem valor, e o total aparece normalmente (já com desconto aplicado)

#### No wizard (StepDiscount)

Abaixo do input de desconto %, quando `discount_percent > 0`:
```
☐ Esconder valor do desconto no PDF
   (O PDF mostrará apenas "Desconto aplicado" sem exibir o percentual ou valor)
```

