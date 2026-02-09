

# Auditoria Completa + Plano de Implementacao - SOIMA CRM

---

## A) Mapa do que Existe Hoje

### (i) Regras de Desconto

| O que | Onde | Status |
|---|---|---|
| Tabela `discount_rules` | Banco de dados (4 registros seed) | Funcional |
| Consulta de regras no Wizard | `src/components/quotes/steps/StepDiscount.tsx` | Funcional |
| Validacao de limite (bloqueia se excede maximo) | `StepDiscount.tsx` linhas 35-37 | Funcional |
| Alerta de "requer aprovacao" | `StepDiscount.tsx` linhas 63-69 | Parcial (so visual) |
| Tela Admin para CRUD de regras | **NAO EXISTE** | Ausente |

**Dados atuais no banco:**
- operator: ate 5% sem aprovacao, ate 10% com aprovacao
- admin: ate 15% sem aprovacao, ate 25% com aprovacao

### (ii) Orcamentos / Wizard

| O que | Onde | Status |
|---|---|---|
| Wizard 8 etapas | `src/components/quotes/QuoteWizard.tsx` | Funcional |
| Hook de estado | `src/hooks/useQuoteWizard.ts` | Funcional |
| Step 1 - Cliente | `src/components/quotes/steps/StepClient.tsx` | Funcional |
| Step 2 - Projeto | `src/components/quotes/steps/StepProject.tsx` | Funcional |
| Step 3 - Equipamento | `src/components/quotes/steps/StepEquipment.tsx` | Funcional |
| Step 4 - Componentes | `src/components/quotes/steps/StepComponents.tsx` | Funcional |
| Step 5 - Acessorios | `src/components/quotes/steps/StepAccessories.tsx` | Funcional |
| Step 6 - Comercial | `src/components/quotes/steps/StepCommercial.tsx` | Funcional |
| Step 7 - Desconto | `src/components/quotes/steps/StepDiscount.tsx` | Parcial |
| Step 8 - Revisao | `src/components/quotes/steps/StepReview.tsx` | Funcional |
| Listagem de orcamentos | `src/pages/Orcamentos.tsx` | Funcional |
| PDF via Edge Function | `supabase/functions/generate-pdf/index.ts` | Funcional |
| Numero sequencial (trigger) | `generate_quote_number()` no banco | Funcional |

### (iii) Auditoria / Logs

| O que | Onde | Status |
|---|---|---|
| Tabela `audit_logs` | Banco de dados | Funcional |
| Trigger automatico em 6 tabelas | `audit_trigger_func()` em clients, products, quotes, leads, user_roles, profiles | Funcional |
| Pagina de auditoria (admin only) | `src/pages/Auditoria.tsx` | Funcional |
| Diff visual de alteracoes | `DiffView` componente embutido em Auditoria.tsx | Funcional |
| Filtro por acao e busca | Auditoria.tsx | Funcional |
| Registro de tentativas de desconto | **NAO EXISTE** | Ausente |
| Registro de aprovacao/rejeicao | **NAO EXISTE** | Ausente |

### (iv) RBAC / Permissoes

| O que | Onde | Status |
|---|---|---|
| Tabela `user_roles` com enum `app_role` (admin/operator) | Banco | Funcional |
| Funcao `has_role()` (security definer) | Banco | Funcional |
| RLS em todas as tabelas | Banco (clients, products, quotes, leads, etc.) | Funcional |
| AuthContext com role | `src/contexts/AuthContext.tsx` | Funcional |
| Sidebar com `adminOnly` | `src/components/layout/Sidebar.tsx` | Funcional |
| Guard no Produtos (Navigate se nao admin) | `src/pages/Produtos.tsx` | Funcional |
| Guard no Usuarios | `src/pages/Usuarios.tsx` | Funcional |
| Guard no Auditoria | `src/pages/Auditoria.tsx` | Funcional |
| Bloqueio de rotas via middleware backend | **NAO EXISTE** (so frontend) | Parcial |

---

## B) Checklist de Conformidade

### 1. RBAC bloqueia UI + API?

| Verificacao | Status | Problema |
|---|---|---|
| Sidebar esconde itens admin | OK | - |
| Paginas admin redirecionam operator | OK | Produtos, Usuarios, Auditoria usam `<Navigate>` |
| RLS bloqueia no banco | OK | Products, discount_rules, user_roles protegidos |
| **Operador acessa rota /produtos diretamente?** | PARCIAL | O `<Navigate>` redireciona no frontend, mas nao ha middleware server-side. Porem, como RLS bloqueia escrita, o risco e limitado. |
| **Operador ve preco base dos produtos?** | **PROBLEMA** | No ProductPicker (`StepEquipment/Components/Accessories`), o operador ve `product.preco` (preco unitario). A regra de negocio diz que operador NAO deve ver preco base interno. |

### 2. Desconto acima do limite bloqueia SEM salvar?

| Verificacao | Status | Problema |
|---|---|---|
| StepDiscount bloqueia botao "Proximo" se excede max | OK | `disabled={exceedsMax}` |
| **Desconto que requer aprovacao permite continuar?** | **PROBLEMA** | Quando `needsApproval=true`, o botao "Proximo" NAO e bloqueado. O operador pode continuar e finalizar o orcamento sem aprovacao real. O alerta e apenas visual. |
| **QuoteWizard salva sem validar aprovacao?** | **PROBLEMA** | `saveMutation` em QuoteWizard.tsx seta `discount_approved = (discount <= maxNoApproval)` mas salva mesmo com `discount_approved=false`. Nao ha fluxo de aprovacao real. |

### 3. Logs/auditoria registram tentativas e aprovacoes?

| Verificacao | Status | Problema |
|---|---|---|
| CRUD em tabelas gera log automatico | OK | Triggers funcionam |
| **Tentativa de desconto acima do limite logada?** | **AUSENTE** | Nenhum log e gerado quando operador tenta desconto fora da faixa |
| **Aprovacao/rejeicao de desconto logada?** | **AUSENTE** | Nao existe fluxo de aprovacao |

### 4. Orcamento finalizado impede edicao?

| Verificacao | Status | Problema |
|---|---|---|
| **Orcamento finalizado pode ser editado?** | **PROBLEMA** | Nao ha nenhuma validacao que impeca editar um orcamento com status "finalized". A listagem em Orcamentos.tsx nao tem botao de editar, mas nao ha bloqueio no banco (RLS ou trigger). |

---

## C) Plano de Implementacao

### Fase 1: Tabela `discount_approval_requests` (nova)

Criar tabela no banco para gerenciar pedidos de aprovacao de desconto:

```text
discount_approval_requests
- id (uuid, PK)
- quote_id (uuid, FK -> quotes)
- requested_by (uuid, FK -> auth.users)
- requested_at (timestamptz, default now())
- discount_percent (numeric)
- justification (text)
- status ('pending' | 'approved' | 'rejected')
- decided_by (uuid, nullable)
- decided_at (timestamptz, nullable)
- decision_notes (text, nullable)
```

Com RLS:
- Operador pode criar (INSERT) se `requested_by = auth.uid()`
- Operador pode ver (SELECT) seus proprios pedidos
- Admin pode ver todos e atualizar (UPDATE) status

### Fase 2: Tela Admin "Regras de Desconto" (CRUD)

**Arquivo novo:** `src/pages/RegrasDesconto.tsx`

- Tabela listando todas as `discount_rules`
- Modal para criar/editar regra (campos: role, max_discount_percent, requires_approval, description)
- Botao de excluir com confirmacao
- Somente admin (guard + RLS)
- Rota: `/regras-desconto`

### Fase 3: Tela Admin "Aprovacoes de Desconto"

**Arquivo novo:** `src/pages/Aprovacoes.tsx`

- Lista de pedidos pendentes (fila)
- Card com: operador, orcamento (numero), desconto solicitado, limite da faixa, justificativa, data
- Botoes "Aprovar" e "Rejeitar" com campo de observacao
- Ao aprovar: atualiza `discount_approval_requests.status = 'approved'`, seta `quotes.discount_approved = true`, `discount_approved_by`, `discount_approved_at`
- Ao rejeitar: atualiza status, operador ve badge "Rejeitado" na listagem de orcamentos

### Fase 4: Ajustar Wizard (StepDiscount + QuoteWizard)

**Arquivos alterados:**
- `src/components/quotes/steps/StepDiscount.tsx`
- `src/components/quotes/QuoteWizard.tsx`
- `src/components/quotes/steps/StepReview.tsx`

Mudancas:
1. Quando desconto > faixa auto: exigir campo "justificativa" obrigatorio
2. Quando desconto > faixa auto mas <= faixa max: bloquear finalizacao, permitir apenas "Salvar como Rascunho" + criar `discount_approval_request` automaticamente
3. Quando desconto > faixa max: bloquear completamente (ja funciona)
4. StepReview: mostrar badge "Pendente de Aprovacao" quando aplicavel
5. Orcamento com `discount_approved=false` e desconto > 0 nao pode ser finalizado

### Fase 5: Ocultar Preco Base para Operador

**Arquivo alterado:** `src/components/quotes/steps/ProductPicker.tsx`

- Se `role !== 'admin'`: nao exibir coluna de preco unitario no catalogo
- Operador ve apenas nome, codigo e categoria do produto
- Preco unitario so aparece no resumo final (total do item ja calculado)

### Fase 6: Bloquear Edicao de Orcamento Finalizado

**Arquivo alterado:** `src/pages/Orcamentos.tsx`

- Na listagem, desabilitar opcoes de edicao para orcamentos com status "finalized" ou "cancelled"
- Adicionar validacao no banco via trigger: impedir UPDATE em quotes quando status = 'finalized' (exceto campos de PDF e discount_approved)

### Fase 7: Separacao de Sidebar (Admin vs Operador)

**Arquivo alterado:** `src/components/layout/Sidebar.tsx`

Operador vera apenas:
- Dashboard
- Clientes
- Pipeline
- Orcamentos

Admin vera tudo + novas paginas:
- Regras de Desconto
- Aprovacoes
- Produtos
- Usuarios
- Auditoria

**Arquivo alterado:** `src/App.tsx` -- adicionar rotas `/regras-desconto` e `/aprovacoes`

### Fase 8: Badge de Status na Listagem de Orcamentos

**Arquivo alterado:** `src/pages/Orcamentos.tsx`

- Novo status visual: "Pendente Aprovacao" (amarelo) quando `discount_approved=false` e `discount_percent > 0`
- Operador ve badge informativo; nao pode aprovar
- Admin ve link para tela de aprovacoes

---

## D) Resumo de Arquivos

### Arquivos novos:
1. `src/pages/RegrasDesconto.tsx` -- CRUD de regras de desconto (admin)
2. `src/pages/Aprovacoes.tsx` -- Fila de aprovacao de descontos (admin)
3. Migracao SQL: tabela `discount_approval_requests` + enum `approval_status` + trigger de bloqueio de orcamento finalizado

### Arquivos alterados:
1. `src/App.tsx` -- novas rotas
2. `src/components/layout/Sidebar.tsx` -- novos itens admin
3. `src/components/quotes/steps/StepDiscount.tsx` -- campo justificativa, bloqueio real
4. `src/components/quotes/QuoteWizard.tsx` -- logica de approval request ao salvar
5. `src/components/quotes/steps/StepReview.tsx` -- badge pendente, bloqueio finalizacao
6. `src/components/quotes/steps/ProductPicker.tsx` -- ocultar preco para operador
7. `src/pages/Orcamentos.tsx` -- badge pendente aprovacao, bloqueio edicao finalizado

---

## E) Como Testar (Passo a Passo)

1. **Desconto dentro da faixa auto (operador ate 5%):** Criar orcamento, Step 7 colocar 3% -> deve passar sem bloqueio, salvar como finalizado direto.

2. **Desconto na faixa de aprovacao (operador 5-10%):** Colocar 7% -> campo justificativa aparece obrigatorio -> pode salvar como rascunho -> cria pedido de aprovacao automatico -> botao "Finalizar" fica desabilitado.

3. **Desconto acima do maximo (operador >10%):** Colocar 12% -> botao "Proximo" desabilitado, alerta vermelho.

4. **Admin aprova:** Login como admin -> Tela Aprovacoes -> ver pedido pendente -> clicar Aprovar -> orcamento vira `discount_approved=true` -> operador pode agora finalizar.

5. **Admin rejeita:** Login como admin -> Tela Aprovacoes -> Rejeitar com motivo -> operador ve badge "Rejeitado" -> precisa editar desconto e reenviar.

