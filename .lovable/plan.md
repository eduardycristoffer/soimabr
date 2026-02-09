

# Fluxo de Aprovacao de Desconto para Operadores

## Resumo
Quando um operador tentar aplicar um desconto acima do limite permitido (ex: 5%), em vez de bloquear, o sistema permitira salvar o orcamento como rascunho e enviar um pedido de aprovacao para o admin. A pagina de Aprovacoes sera restaurada no menu (visivel apenas para admins). Os orcamentos aprovados mostrarao qual admin aprovou.

## Mudancas

### 1. StepDiscount.tsx
- Remover o bloqueio do botao "Proximo" quando excede o limite
- Adicionar campo de justificativa quando desconto excede o limite
- Mostrar alerta informando que sera necessaria aprovacao (em vez de bloquear)

### 2. useQuoteWizard.ts
- Adicionar `discount_justification: string` ao `QuoteWizardData`
- Adicionar propriedade computada `needsApproval` baseada no role e limite

### 3. QuoteWizard.tsx
- Na etapa de revisao (step 8), quando `needsApproval` for true:
  - Esconder botao "Finalizar Orcamento"
  - Mostrar botao "Salvar e Solicitar Aprovacao" que salva como draft e cria um registro em `discount_approval_requests`
- Manter botao "Salvar Rascunho" disponivel normalmente

### 4. StepReview.tsx
- Adicionar prop `needsApproval`
- Quando true, mostrar badge "Requer Aprovacao" e trocar botao "Finalizar" por "Enviar para Aprovacao"

### 5. Aprovacoes.tsx (restaurar pagina)
- Restaurar a rota `/aprovacoes` no App.tsx apontando para o componente existente (ja existe em `src/pages/Aprovacoes.tsx`)
- O componente ja possui toda a logica de listar pedidos pendentes, aprovar e rejeitar

### 6. Sidebar.tsx
- Adicionar item "Aprovacoes" no menu com `adminOnly: true` e icone `CheckCircle2`

### 7. App.tsx
- Trocar o redirect de `/aprovacoes` pelo import real do componente `Aprovacoes`

### 8. Orcamentos.tsx - Mostrar admin aprovador
- Na listagem de orcamentos, quando houver desconto aprovado, mostrar o nome do admin que aprovou
- Buscar `discount_approved_by` do quote e cruzar com `profiles` para exibir o nome

## Detalhes Tecnicos

### Fluxo do operador
1. Operador define desconto acima de 5% no Step 7
2. Sistema mostra alerta: "Desconto acima do limite. Sera necessaria aprovacao do admin."
3. Campo de justificativa aparece (obrigatorio)
4. No Step 8 (Revisao), botao "Finalizar" e substituido por "Enviar para Aprovacao"
5. Ao clicar, salva quote como `draft` e cria registro em `discount_approval_requests`

### Fluxo do admin
1. Admin ve item "Aprovacoes" no menu lateral
2. Pagina lista pedidos pendentes com detalhes (% desconto, justificativa, operador)
3. Admin aprova ou rejeita com observacao opcional
4. Se aprovado, `quotes.discount_approved = true` e `discount_approved_by` recebe o ID do admin

### Exibicao do aprovador
- Na tabela de orcamentos, ao lado do badge de desconto aprovado, mostrar "Aprovado por [Nome do Admin]"
- Query ja inclui join com profiles para buscar o nome

### Arquivos alterados
- `src/hooks/useQuoteWizard.ts` - adicionar justificativa e needsApproval
- `src/components/quotes/steps/StepDiscount.tsx` - remover bloqueio, adicionar justificativa
- `src/components/quotes/steps/StepReview.tsx` - botao condicional de aprovacao
- `src/components/quotes/QuoteWizard.tsx` - logica de salvar com pedido de aprovacao
- `src/components/layout/Sidebar.tsx` - adicionar menu Aprovacoes
- `src/App.tsx` - restaurar rota /aprovacoes
- `src/pages/Orcamentos.tsx` - mostrar nome do admin aprovador
- `src/pages/Aprovacoes.tsx` - ja existe, sem alteracoes necessarias

