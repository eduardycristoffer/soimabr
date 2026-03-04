

## Pré-definir tópicos de pagamento padrão

Alteração simples: mudar o `INITIAL_DATA` em `useQuoteWizard.ts` para que `payment_terms_items` já venha com 3 itens padrão em vez de array vazio.

### Arquivo: `src/hooks/useQuoteWizard.ts`

Trocar:
```typescript
payment_terms_items: [],
```

Por:
```typescript
payment_terms_items: [
  { text: "40% ENTRADA E RESTANTE A COMBINAR" },
  { text: "FINANCIAMENTO BANCÁRIO" },
  { text: "FINAME CÓDIGO 04103186" },
],
```

O usuário continua podendo editar, remover ou adicionar novos tópicos normalmente -- apenas o estado inicial muda.

