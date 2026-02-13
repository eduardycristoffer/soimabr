

# Corrigir "Ver Detalhes" e Visibilidade do "Editar"

## Problemas Identificados

1. **"Ver detalhes"**: O botao nao tem nenhuma acao (`onClick`) associada. Ao clicar, o menu fecha sem fazer nada.
2. **"Editar"**: So aparece para propostas com status `draft`. Como as propostas do usuario sao todas "Finalizado", o botao nunca e exibido.

---

## Solucao

### 1. Implementar "Ver Detalhes" (Modal de visualizacao)

Criar um modal/dialog que exibe todas as informacoes da proposta em modo somente leitura:

- **Dados do cliente** (razao social, nome fantasia)
- **Dados do projeto** (nome, local)
- **Itens** (equipamentos, componentes, acessorios com quantidades e precos)
- **Especificacoes tecnicas** por grua (lanca, altura torre, cargas, altura de trabalho)
- **Condicoes comerciais** (moeda, validade, entrega, pagamento, frete)
- **Totais** (subtotal, desconto, total)
- **Status e datas**

O modal sera aberto ao clicar em "Ver detalhes", passando o `quote.id` para carregar os dados completos (incluindo `quote_items`).

### 2. Adicionar "Duplicar" para Propostas Finalizadas

Para propostas com status `finalized`, adicionar uma opcao **"Duplicar como Rascunho"** que:

- Cria uma copia da proposta com status `draft`
- Gera um novo `quote_number`
- Abre o wizard com os dados pre-preenchidos para o usuario ajustar

Isso permite que o usuario "edite" uma proposta finalizada sem alterar o original.

### 3. Manter "Editar" para Rascunhos

O botao "Editar" continua visivel apenas para propostas `draft`, como ja esta implementado.

---

## Detalhes Tecnicos

### Novo componente: `QuoteDetailModal.tsx`

- Recebe `quoteId` e `open` como props
- Busca dados da proposta + `quote_items` + `clients` via Supabase
- Exibe as informacoes em layout semelhante ao `StepReview.tsx` (duas colunas)
- Botao "Fechar" e opcao de "Gerar PDF" direto do modal

### Alteracoes em `Orcamentos.tsx`

- Adicionar state para controlar o modal de detalhes (`viewingQuoteId`)
- Conectar o `onClick` do "Ver detalhes" ao state
- Adicionar opcao "Duplicar como Rascunho" no menu de propostas finalizadas
- Implementar funcao `handleDuplicate` que copia a proposta e abre o wizard

### Arquivos

| Arquivo | Acao |
|---------|------|
| `src/components/quotes/QuoteDetailModal.tsx` | **Novo** - modal de visualizacao |
| `src/pages/Orcamentos.tsx` | Conectar "Ver detalhes", adicionar "Duplicar" |

