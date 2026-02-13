

# Corrigir "Duplicar como Rascunho"

## Problema

O botao "Duplicar como Rascunho" chama a mesma funcao `handleEdit(quote.id)`, que abre o wizard com `editingQuoteId` apontando para a proposta finalizada. Ao salvar, o sistema tenta fazer UPDATE na proposta original, e o trigger do banco bloqueia com "Orcamento finalizado nao pode ser editado".

## Solucao

Criar um fluxo separado de duplicacao que carrega os dados da proposta original mas salva como uma **nova** proposta (INSERT).

---

## Alteracoes

### 1. `Orcamentos.tsx`

- Adicionar state `duplicatingQuoteId` separado de `editingQuoteId`
- Criar funcao `handleDuplicate(quoteId)` que seta `duplicatingQuoteId`
- O botao "Duplicar como Rascunho" passa a chamar `handleDuplicate` em vez de `handleEdit`
- Passar `duplicatingQuoteId` como nova prop ao `QuoteWizard`

### 2. `QuoteWizard.tsx`

- Aceitar nova prop `duplicatingQuoteId?: string | null`
- Ao carregar dados com `duplicatingQuoteId`, buscar tudo da proposta original (cliente, projeto, itens, condicoes) e popular o wizard -- identico ao fluxo de edicao
- **Diferenca critica**: NAO setar `editingQuoteId`. O wizard opera como se fosse uma proposta nova, entao ao salvar executa INSERT (novo quote_number, novo ID)
- Nao criar version snapshot na duplicacao (pois e uma proposta nova)

### Arquivos

| Arquivo | Acao |
|---------|------|
| `src/pages/Orcamentos.tsx` | Separar `handleDuplicate` de `handleEdit`, novo state |
| `src/components/quotes/QuoteWizard.tsx` | Aceitar `duplicatingQuoteId`, carregar dados sem editar o original |

