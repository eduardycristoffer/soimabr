

# Ajustes na Proposta: Preco Internacional e Desconto em USD

## Problema Atual

1. **Ordem dos passos**: Produtos sao selecionados nos passos 3-5 (com preco nacional), mas a moeda so e escolhida no passo 6. Quando o usuario seleciona USD no passo 6, os precos dos itens ja adicionados nao sao recalculados para usar `international_price_brl`.

2. **Bloqueio indevido**: Quando um produto nao tem `international_price_brl`, o sistema bloqueia a adicao. O usuario quer que apareca com valor zero em vez de bloquear.

3. **Passo 7 (Desconto)**: Nao mostra o valor em USD nem a conversao estimada -- mostra apenas na moeda selecionada sem a informacao dual.

---

## Solucao

### 1. Recalcular precos ao mudar moeda no passo 6

Quando o usuario selecionar USD no `StepCommercial` e o cliente for internacional:

- Buscar do banco os produtos correspondentes aos itens ja selecionados (equipment, components, accessories)
- Para cada item, substituir `unit_price` e `total_price` pelo `international_price_brl` do produto
- Se o produto nao tiver `international_price_brl`, usar **zero** (nao bloquear)
- Quando voltar para BRL, recalcular usando o `preco` normal

### 2. Permitir produtos sem preco internacional (valor zero)

No `ProductPicker` e no `StepEquipment`:

- Remover o bloqueio de adicao para produtos sem `international_price_brl`
- Se o valor for null/0, adicionar o item com `unit_price = 0` e `total_price = 0`
- Manter um aviso visual (badge "Sem preco intl.") mas permitir a adicao

### 3. Mostrar USD no passo 7 (Desconto)

No `StepDiscount`, quando for proposta internacional USD:

- Exibir subtotal, desconto e total em BRL (valor base internacional)
- Abaixo de cada valor, mostrar o equivalente estimado em USD usando a cotacao do dia
- Incluir a cotacao usada e o disclaimer

---

## Detalhes Tecnicos

### Arquivos a modificar

| Arquivo | Alteracao |
|---------|-----------|
| `StepCommercial.tsx` | Ao mudar moeda, buscar produtos e recalcular precos dos itens |
| `StepEquipment.tsx` | Remover bloqueio de produtos sem preco internacional, usar zero |
| `ProductPicker.tsx` | Remover bloqueio, permitir adicao com preco zero |
| `StepDiscount.tsx` | Adicionar exibicao dual BRL/USD com cotacao |
| `QuoteWizard.tsx` | Passar `usdBrlRate` e `isInternationalUsd` para `StepDiscount` |

### Logica de recalculo no StepCommercial

```text
Ao mudar currency para USD (e client_type === "internacional"):
  1. Buscar products por IDs dos itens em equipment + components + accessories
  2. Para cada item:
     - Encontrar o produto correspondente
     - item.unit_price = product.international_price_brl ?? 0
     - item.total_price = item.unit_price * item.quantity
  3. updateData({ equipment, components, accessories, currency: "USD" })

Ao mudar de USD para BRL:
  1. Buscar products por IDs
  2. Para cada item:
     - item.unit_price = product.preco
     - item.total_price = item.unit_price * item.quantity
  3. updateData({ equipment, components, accessories, currency: "BRL" })
```

### StepDiscount - Resumo de Valores com USD

Quando `isInternationalUsd`:
- Subtotal: R$ X.XXX,XX / aprox. US$ Y,YYY.YY
- Desconto: -R$ X.XXX,XX
- Total: R$ X.XXX,XX / aprox. US$ Y,YYY.YY
- Rodape: "Valor em USD estimado com base na cotacao do dia (1 USD = R$ Z,ZZZZ)"
