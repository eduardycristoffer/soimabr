

# Simplificacao do Sistema de Desconto: Admin Livre, Operador Limitado

## Resumo

Remover toda logica de aprovacao de desconto para Admin (desconto livre) e simplificar o Operador para bloqueio imediato (sem fluxo de aprovacao). Isso elimina a necessidade da pagina "Aprovacoes" e simplifica significativamente a tela "Regras de Desconto" e o Wizard.

---

## Mudancas Planejadas

### 1. Banco de Dados
- **Remover regras de Admin** da tabela `discount_rules` (DELETE das 2 linhas com role='admin')
- **Remover regra de aprovacao do Operador** (DELETE da linha operator com requires_approval=true), mantendo apenas a regra operator com limite maximo (5%)
- A tabela `discount_approval_requests` permanece (dados historicos), mas nao sera mais alimentada

### 2. Tela "Regras de Desconto" (`src/pages/RegrasDesconto.tsx`)
Simplificar completamente:
- Card informativo fixo: "Admin: desconto livre (sem limite)"
- Card editavel: "Operador: limite maximo de X%" com botao para editar o valor
- Remover a tabela completa com multiplas linhas/regras
- Remover modal complexo de criar/editar com campos role, requires_approval
- Manter apenas um formulario simples para editar o limite do operador

### 3. StepDiscount (`src/components/quotes/steps/StepDiscount.tsx`)
Logica simplificada:
- **Se Admin**: permitir qualquer valor (0-100%), sem alertas de aprovacao, sem limites
- **Se Operador**: buscar `max_discount_percent` da unica regra operator; se exceder, bloquear botao "Proximo" com mensagem "Desconto acima do permitido para Operador. Limite: X%."
- Remover campo de justificativa (nao ha mais fluxo de aprovacao)
- Remover exibicao de "faixas" e badges "Com aprovacao"/"Sem aprovacao"

### 4. QuoteWizard (`src/components/quotes/QuoteWizard.tsx`)
- Remover toda logica de `needsApproval` e `discount_approval_requests`
- Admin: sempre salva com `discount_approved = true`
- Operador: so chega aqui se desconto <= limite (ja bloqueado no step 7), salva com `discount_approved = true`
- Remover a criacao de registros em `discount_approval_requests`

### 5. StepReview (`src/components/quotes/steps/StepReview.tsx`)
- Remover prop `needsApproval` e toda UI relacionada (alerta, badge "Pendente", botao condicional)
- Sempre mostrar botoes "Salvar Rascunho" e "Finalizar Orcamento"

### 6. Sidebar (`src/components/layout/Sidebar.tsx`)
- Remover item "Aprovacoes" do menu (a pagina pode ficar como historico mas sem link ativo)

### 7. App.tsx
- Remover rota `/aprovacoes` (ou mante-la apenas como redirect para /dashboard)

### 8. useQuoteWizard.ts
- Remover campo `discount_justification` do `QuoteWizardData`

---

## Detalhes Tecnicos

### Arquivos alterados:
1. `src/pages/RegrasDesconto.tsx` -- reescrita simplificada
2. `src/components/quotes/steps/StepDiscount.tsx` -- logica admin livre + operador bloqueado
3. `src/components/quotes/QuoteWizard.tsx` -- remover logica de approval
4. `src/components/quotes/steps/StepReview.tsx` -- remover needsApproval
5. `src/hooks/useQuoteWizard.ts` -- remover discount_justification
6. `src/components/layout/Sidebar.tsx` -- remover item Aprovacoes
7. `src/App.tsx` -- remover rota /aprovacoes

### Dados a alterar no banco:
- DELETE das regras admin (2 linhas)
- DELETE da regra operator com requires_approval=true (1 linha)
- Manter apenas a regra operator max_discount_percent=5, requires_approval=false

### Validacao server-side:
A validacao continua sendo feita pelo RLS + trigger `prevent_finalized_quote_edit`. A tabela `discount_rules` e consultada no frontend para bloquear a UI, e os dados sao persistidos com `discount_approved=true` somente quando o desconto esta dentro do limite. Como RLS ja protege escrita e o trigger impede edicao de finalizados, a seguranca esta garantida na camada de banco.

---

## Como Testar

1. **Operador com desconto <= 5%**: Criar orcamento, aplicar 3% -- deve passar sem bloqueio, finalizar normalmente.
2. **Operador com desconto > 5%**: Aplicar 7% -- botao "Proximo" desabilitado, mensagem "Limite: 5%".
3. **Admin com desconto alto**: Login como admin, aplicar 50% -- deve passar sem bloqueio.
4. **Tela Regras de Desconto**: Admin ve card fixo "Admin: livre" e card editavel "Operador: 5%" com opcao de alterar.
5. **Menu do Operador**: Nao deve ver "Aprovacoes" nem "Regras de Desconto".

