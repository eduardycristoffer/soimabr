## Ajustes no PDF da Proposta Comercial

Arquivo único: `supabase/functions/generate-pdf/index.ts`

### 1. Correção "NBE" → "NBR"
Nas duas linhas (PT linha 226, EN linha 355) de `warranty_norms`, substituir `NBE ISO 13.849-2` por `NBR ISO 13.849-2`.

### 2. NR 12 e NR 18 ao final
Já estão posicionadas no final da string de normas. Vou confirmar que assim permaneçam após a edição (sem alterar a ordem). Caso o pedido seja movê-las para o final de OUTRO texto/seção, preciso de confirmação.

### 3. Remover Subtotal e linha de Desconto — mostrar só o Total final
Hoje o bloco de totais mostra:
- Subtotal
- Desconto (X%) ou "Desconto aplicado" (quando oculto)
- TOTAL

Ajuste: quando houver desconto, **não exibir** as linhas de Subtotal e Desconto — exibir apenas a linha "TOTAL" com o valor final (já líquido). Quando não houver desconto, também remover a linha de Subtotal (redundante com Total).

Aplica-se aos dois blocos de totais:
- Bloco internacional USD (linhas ~676–700)
- Bloco padrão BRL/moeda única (linhas ~710–725)

E também no `summary-box` (CSS linha ~959) se houver renderização equivalente — vou verificar e ajustar para manter consistência.

### Fora do escopo
- Sem mudanças em RLS, wizard, banco ou cálculo (os totais já vêm corretos).
- Sem mudanças no PDF de locação, a menos que você confirme que quer o mesmo ajuste lá também.