

## Reestruturacao completa do PDF em paginas explicitas

### Problema atual

Todo o conteudo esta dentro de um unico `<div class="content-page">` (linhas 871-960). O navegador quebra as paginas automaticamente e o rodape fixo (`position: fixed; bottom: 0`) sobrepoe conteudo de forma imprevisivel -- especialmente Condicoes Comerciais, Garantia e Assinaturas.

### Nova estrutura do PDF

```text
+---------------------------+
|        CAPA (full-bleed)  |
+---------------------------+
|  [Cabecalho empresa]     |  PAGINA 1
|  PRO262628 / Data / Val  |  - Cliente
|  ----------------------  |  - Projeto (se houver)
|  Cliente / Projeto       |  - Specs da Grua (se houver)
|  Specs / Itens / Totais  |  - Tabela de Itens + Totais
|  [rodape fixo]           |  - Disclaimer USD (se aplicavel)
+---------------------------+
|  [Cabecalho empresa]     |  PAGINA 2 (OPCIONAL)
|  PRO262628 / Data / Val  |  - Escopo do Fornecimento
|  ----------------------  |  - Itens do Painel
|  Escopo / Painel         |  (so aparece se houver conteudo)
|  [rodape fixo]           |
+---------------------------+
|  [Cabecalho empresa]     |  PAGINA FINAL (SEMPRE)
|  PRO262628 / Data / Val  |  - Condicoes Comerciais
|  ----------------------  |  - Garantia
|  Condicoes Comerciais    |  - Validade da Proposta
|  Garantia                |  - Assinaturas (Soima + Cliente)
|  Validade                |  - Disclaimer USD (se aplicavel)
|  Assinaturas             |
|  [rodape fixo]           |
+---------------------------+
|     CONTRACAPA (full-bleed)|
+---------------------------+
```

### Detalhes tecnicos

| Arquivo | Alteracoes |
|---------|-----------|
| `supabase/functions/generate-pdf/index.ts` | Reestruturacao completa do HTML (descrito abaixo) |

#### 1. Nova funcao `buildPageHeader()`

Funcao auxiliar que retorna o cabecalho padrao reutilizavel em todas as content-pages:
- Logo SOIMA (img)
- Nome da empresa + contato
- Numero da proposta (ex: PRO262628)
- Data de emissao
- Validade (data calculada)
- Status (Rascunho/Finalizado)

Sera chamada no inicio de cada `<div class="content-page">`.

#### 2. Dividir o HTML em 3 blocos `content-page`

**Content-page 1** (linhas 871-960 atuais, reestruturado):
- `buildPageHeader()`
- Secao Cliente
- Secao Projeto (se houver)
- Specs da Grua (se houver)
- Tabela de Itens + Totais + Disclaimer USD

**Content-page 2** (OPCIONAL -- so gerada se `buildScopeHTML` ou `buildPanelHTML` retornarem conteudo):
- `buildPageHeader()`
- Escopo do Fornecimento
- Itens do Painel

**Content-page 3 (FINAL -- SEMPRE gerada)**:
- `buildPageHeader()`
- Condicoes Comerciais (moeda, validade, prazo de entrega, pagamento, frete, observacoes)
- Garantia (buildWarrantyHTML)
- Validade da Proposta (data de validade calculada)
- Assinaturas (2 blocos: Soima e Cliente)
- Disclaimer USD (se aplicavel)

#### 3. CSS de paginacao

Cada `content-page` recebera `page-break-after: always` para forcar quebra de pagina. A ultima content-page antes da contracapa nao precisa de `page-break-after` pois a contracapa ja tem `page-break-before: always`.

```css
.content-page {
  padding: 20mm 15mm 45mm 15mm;
  width: 100%;
  box-sizing: border-box;
  page-break-after: always;
}
```

#### 4. Remover `forcePageBreak` do `buildScopeHTML`

A quebra de pagina agora e controlada pelo div pai (`content-page`), entao o parametro `forcePageBreak` e o estilo inline `page-break-before: always` serao removidos do `buildScopeHTML`.

#### 5. Mover Condicoes/Garantia/Assinaturas para pagina final dedicada

As secoes que hoje estao nas linhas 937-958 (condicoes, escopo, painel, garantia, assinaturas) serao redistribuidas:
- Escopo + Painel vao para a pagina 2 (opcional)
- Condicoes + Garantia + Assinaturas vao para a pagina final (sempre presente)

#### 6. Controle de truncamento

Para garantir que a pagina final nunca estoure para 2 paginas, sera adicionada logica de truncamento:
- Condicoes Comerciais: se `notes` tiver mais de 1500 caracteres, truncar com "(...)"
- Garantia: usa o builder existente que ja e compacto

#### 7. Cabecalho fixo discreto (page-header)

O `.page-header` com `position: fixed` ja existe e continuara funcionando -- exibindo "Documento gerado em..." em todas as paginas, escondido nas capas via z-index.

### Beneficios

- Condicoes, Garantia e Assinaturas NUNCA serao cortadas pelo rodape
- Cabecalho da empresa repetido em todas as paginas de conteudo
- Pagina 2 so aparece quando ha escopo/painel (PDF mais enxuto)
- Estrutura escalavel: se itens crescerem, pagina 1 expande naturalmente via paginacao automatica do navegador

