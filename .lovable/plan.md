## Sempre exibir o VALOR FINAL na proposta (PDF)

### Problema
Quando "Ocultar valores unitários" está marcado, o PDF mostra **"A combinar"** no lugar do total. Você quer o oposto: esconder unitários e desconto, mas **sempre mostrar o valor final** da proposta.

### Arquivo
`supabase/functions/generate-pdf/index.ts`

### Mudanças

1. **Bloco de totais BRL (linhas ~691–699)**
   - Remover o ternário `hideUnitPrices ? tbd : ...` — passar a renderizar sempre `formatCurrency(quote.total)` na linha do Total.

2. **Bloco de totais internacional USD/BRL (linhas ~674–689)**
   - Linha "Total (BRL)": sempre `formatBrl(quote.total)`.
   - Linha "Estimado (USD)": exibir sempre (sair do `hideUnitPrices ? "" : ...`).
   - Manter a nota da cotação USD/BRL.

3. **Resumo lateral `summary-box` (linha ~1106 e ~1112)**
   - Trocar `hideUnitPricesSummary ? tbdLabel : formatCurrency(quote.total)` por sempre `formatCurrency(quote.total)`.
   - USD estimado também aparece sempre em proposta internacional.

4. **Tabela de itens (mantém comportamento atual)**
   - Quando `hide_unit_prices` está ligado, a tabela continua **sem** colunas de preço unitário e total por item.
   - Linhas de **Subtotal** e **Desconto** continuam ocultas (já implementado anteriormente).

5. **PDF de locação**
   - Já mostra o total corretamente — sem alteração.

### Resultado
- Itens listados **sem** valor unitário.
- **Sem** linha de subtotal nem de desconto.
- **Sempre** aparece uma única linha final: **TOTAL = valor da proposta**.
