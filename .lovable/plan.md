

# Adicionar Opcao de Excluir Proposta em Rascunho

## Resumo

Adicionar um item "Excluir" no menu de acoes (dropdown) das propostas com status **rascunho**. Ao clicar, exibir um dialog de confirmacao antes de efetuar a exclusao.

---

## Implementacao

### 1. Dialog de Confirmacao

Usar `AlertDialog` para pedir confirmacao antes de excluir. Texto: "Tem certeza que deseja excluir esta proposta? Esta acao nao pode ser desfeita."

### 2. Logica de Exclusao

Ao confirmar:
1. Deletar os itens relacionados em `quote_items` (WHERE `quote_id`)
2. Deletar versoes em `quote_versions` (WHERE `quote_id`)
3. Deletar solicitacoes de desconto em `discount_approval_requests` (WHERE `quote_id`)
4. Deletar a proposta em `quotes` (WHERE `id` AND `status = 'draft'`)
5. Invalidar a query `["quotes"]` para atualizar a lista
6. Exibir toast de sucesso ou erro

### 3. Menu Dropdown

Adicionar item "Excluir" com icone `Trash2` no dropdown, visivel apenas quando `quote.status === "draft"`. Estilizado em vermelho (destructive).

---

## Arquivo a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/Orcamentos.tsx` | Adicionar estado para controle do dialog, funcao de exclusao, `AlertDialog` de confirmacao, e item "Excluir" no dropdown |

---

## Detalhes

- Importar `AlertDialog` e seus subcomponentes, e o icone `Trash2`
- Novo estado: `deletingQuoteId` (string ou null)
- O item do menu seta `deletingQuoteId` ao clicar
- O `AlertDialog` e controlado por `!!deletingQuoteId`
- Ao confirmar, executa as delecoes em sequencia e fecha o dialog
- Apenas propostas em **rascunho** mostram a opcao

