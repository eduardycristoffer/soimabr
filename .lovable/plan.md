

## Opção para esconder valores unitários no PDF

Adicionar um checkbox no step de Descontos (junto com a opção de esconder desconto) para ocultar os valores por item na tabela do PDF, exibindo apenas o total geral da proposta.

### Comportamento

- **Desativado (padrão):** PDF mostra a coluna "Total" por item normalmente
- **Ativado:** Remove a coluna de valores da tabela de itens (e "Unit. Intl. BRL" no caso internacional), mantendo apenas #, Código, Descrição e Qtd. O total geral continua aparecendo na seção de resumo

### Alterações

| Arquivo | O que muda |
|---------|-----------|
| Migração SQL | `ALTER TABLE quotes ADD COLUMN hide_unit_prices boolean DEFAULT false;` |
| `useQuoteWizard.ts` | Adicionar `hide_unit_prices: boolean` ao tipo e `false` ao INITIAL_DATA |
| `StepDiscount.tsx` | Novo checkbox: "Esconder valores unitários no PDF — Mostra apenas o total geral" |
| `StepReview.tsx` | Indicar no resumo quando valores unitários serão ocultados |
| `QuoteWizard.tsx` | Incluir `hide_unit_prices` no payload de salvamento e carregamento |
| `generate-pdf/index.ts` | Quando `hide_unit_prices === true`: remover colunas de valor da tabela de itens (tanto nacional quanto internacional), manter apenas a seção de totais no final |

### No wizard (StepDiscount)

Abaixo do checkbox de esconder desconto:
```
☐ Esconder valores unitários no PDF
   (A tabela de itens não exibirá valores — apenas o total geral da proposta será mostrado)
```

