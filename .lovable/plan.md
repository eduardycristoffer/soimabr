

## Ajustes Finais no PDF

### 1. Esconder rodape na capa e contracapa

O problema: `position: fixed` no CSS de impressao faz o rodape aparecer em TODAS as paginas, incluindo capa e contracapa. Nao e possivel excluir paginas especificas com CSS puro.

**Solucao**: dar z-index mais alto para as imagens de capa/contracapa (z-index: 20) e overlay (z-index: 21), mantendo o rodape com z-index: 10. Como as imagens cobrem 100% da pagina, elas ficam POR CIMA do rodape nas paginas de capa/contracapa, escondendo-o visualmente.

### 2. Restaurar titulo da secao Escopo do Fornecimento

Na ultima edicao, a linha com o titulo da secao foi acidentalmente removida:
```html
<div class="section-title">ESCOPO DO FORNECIMENTO: SGT 3610 TL</div>
```
Sera restaurada antes da tabela de especificacoes.

### 3. Remover regra CSS vazia

A regra `.cover-page ~ .page-footer` esta vazia e nao faz nada. Sera removida e substituida pelo comentario explicando a estrategia de z-index.

### Arquivo modificado

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/generate-pdf/index.ts` | Adicionar z-index: 20 ao cover-bg-img e z-index: 21 ao cover-overlay; restaurar section-title do escopo; limpar CSS vazio |

