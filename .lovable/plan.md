

## Remover cabecalho repetido das paginas 2 e 3 do PDF

### O que muda

O cabecalho com logo SOIMA, dados da empresa e numero da proposta (`buildPageHeader()`) esta sendo chamado em **todas** as content-pages (1, 2 e 3). O usuario quer que ele apareca **somente na primeira pagina de conteudo** (pagina 1, logo apos a capa).

As paginas 2 (escopo/painel) e 3 (final/condicoes/assinaturas) ficam sem o cabecalho grande -- apenas com o conteudo das secoes.

### Detalhes tecnicos

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/generate-pdf/index.ts` | Remover 2 chamadas de `buildPageHeader()` |

#### 1. Pagina 2 (escopo/painel) - linha 980

Remover a chamada `${buildPageHeader(...)}` dentro de `buildContentPage2HTML()`. O div `content-page` continua existindo com o padding correto, mas sem o bloco de cabecalho.

#### 2. Pagina final (condicoes/garantia/assinaturas) - linha 1037

Remover a chamada `${buildPageHeader(...)}` dentro de `buildFinalPageHTML()`. O resumo da proposta (`summaryBoxHTML`) passara a ser o primeiro elemento visivel no topo da pagina final.

#### 3. Simplificar assinaturas das funcoes

Como `buildContentPage2HTML` e `buildFinalPageHTML` nao precisarao mais dos parametros de cabecalho (companyName, companySubtitle, companyPhone, etc.), esses parametros podem ser removidos das assinaturas para simplificar o codigo. Porem, para minimizar alteracoes, a abordagem mais segura e simplesmente remover a linha de chamada do `buildPageHeader` e manter os parametros (sem uso).

### Resultado esperado

- **Pagina 1**: Cabecalho completo (logo + empresa + PRO262628 + data + validade + status) + cliente + itens
- **Pagina 2**: Apenas escopo e painel (sem cabecalho)
- **Pagina 3 (final)**: Resumo da proposta + condicoes + garantia + assinaturas (sem cabecalho)
- **Capa e contracapa**: Sem alteracao
