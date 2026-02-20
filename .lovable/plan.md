

## Adicionar resumo de contratacao na pagina final do PDF

### O que muda

A pagina final (penultima, antes da contracapa) ja existe com Condicoes Comerciais, Garantia, Validade e Assinaturas. O usuario quer adicionar um **resumo do que esta sendo contratado e o valor total** no topo dessa pagina, logo abaixo do cabecalho da empresa.

### Estrutura da pagina final (atualizada)

```text
+-------------------------------------+
|  Cabecalho empresa (logo + PRO...)  |
|-------------------------------------|
|  RESUMO DA PROPOSTA                 |
|  - Grua modelo X (qtd x)           |
|  - Torre modelo Y (qtd x)          |
|  - Acessorio Z (qtd x)             |
|  Total: R$ 600.000,00              |
|  (Desconto: 5% se aplicavel)       |
|-------------------------------------|
|  CONDICOES COMERCIAIS               |
|  Moeda: BRL | Validade: 30 dias    |
|  Entrega: 90 dias | Pagamento: ... |
|-------------------------------------|
|  GARANTIA                           |
|  (bullets existentes)               |
|-------------------------------------|
|  VALIDADE DA PROPOSTA               |
|-------------------------------------|
|  ASSINATURAS                        |
|  Soima          |     Cliente       |
|  Aceite: ___/___/______             |
+-------------------------------------+
```

### Detalhes tecnicos

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/generate-pdf/index.ts` | Adicionar bloco de resumo no inicio de `buildFinalPageHTML()` |

#### Alteracao em `buildFinalPageHTML()`

Adicionar um bloco HTML no topo (logo apos o `buildPageHeader()`) que:

1. Lista os itens agrupados por categoria (ex: "Grua - SOIMA S48 (x1)") de forma compacta
2. Mostra subtotal, desconto (se houver) e total final
3. Para clientes internacionais USD, mostra tambem o equivalente em USD
4. Usa estilo compacto (fonte 9-10px) para nao ocupar muito espaco vertical

Os dados necessarios (`items`, `quote.subtotal`, `quote.discount_percent`, `quote.discount_value`, `quote.total`, `quote.currency`) ja estao disponiveis como parametros da funcao.

#### CSS adicional

Adicionar estilo `.summary-box` com fundo cinza claro, borda, e tipografia compacta para o resumo ficar visualmente separado das condicoes comerciais.

