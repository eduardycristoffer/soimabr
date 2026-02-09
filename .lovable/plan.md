

# Plano: Implementacao Completa do SOIMA CRM

## Resumo da Situacao Atual

O projeto tem a fundacao pronta (banco de dados, autenticacao, layout, navegacao) e telas de listagem basicas. Porem, **a maioria dos modulos esta em estado de placeholder** -- exibem dados mas nao permitem interacao real. O projeto original (Next.js) tinha 100% das funcionalidades; aqui temos aproximadamente 25%.

### Problema critico: RBAC nao funciona
A tabela `user_roles` esta vazia. Isso significa que nenhum usuario tem role atribuida, e funcionalidades Admin-only podem nao funcionar corretamente. Isso precisa ser corrigido primeiro.

---

## Fase 1: Corrigir Fundacao (Prioridade Alta)

### 1.1 Corrigir RBAC
- Garantir que o trigger de criacao de profile tambem crie a entry em `user_roles`
- Criar migration para inserir role "admin" para o usuario existente
- Adicionar mais produtos seed para completar o catalogo (~100+ itens como no original)

### 1.2 Seed de usuario admin
- Criar usuario admin via migration/seed com role atribuida
- Credenciais: `admin@soimabrasil.com.br` / `soima123`

---

## Fase 2: Completar Modulos Existentes

### 2.1 Dashboard Real
- Queries reais para contar clientes, leads, orcamentos
- Grafico de conversao do pipeline (usando Recharts, ja instalado)
- Visao diferenciada Admin vs Operador
- Lista de orcamentos recentes
- Acoes rapidas com links funcionais

### 2.2 Clientes - CRUD Completo
- Editar cliente (modal ou inline)
- Excluir cliente (com confirmacao AlertDialog)
- Ver detalhes do cliente (historico de orcamentos vinculados)
- Validacao de duplicidade de CNPJ/CPF

### 2.3 Produtos - CRUD Completo (Admin)
- Modal para criar novo produto
- Modal para editar produto (preco, nome, status)
- Ativar/desativar produto
- Excluir produto (soft delete)
- Atualizar badge "Precisa Revisar" ao definir preco

### 2.4 Usuarios - Gestao Completa (Admin)
- Criar novo usuario (signup via Supabase Auth + atribuir role)
- Editar usuario (nome, role)
- Ativar/desativar conta
- Nao permitir desativar a si mesmo

---

## Fase 3: Pipeline Kanban Completo

### 3.1 Drag & Drop
- Implementar drag and drop nativo (HTML5 DnD API ou biblioteca leve)
- Mover lead entre colunas com atualizacao no banco
- Registrar movimentacao em `lead_histories`

### 3.2 CRUD de Leads
- Modal para criar novo lead (titulo, empresa, contato, valor estimado, origem)
- Modal de detalhes do lead com historico de movimentacoes
- Editar lead
- Converter lead em cliente (criar entry em `clients` a partir dos dados do lead)

### 3.3 Filtros
- Filtro por operador (Admin ve todos, Operador ve so seus)
- Filtro por data

---

## Fase 4: Wizard de Orcamentos (8 Etapas)

Este e o modulo mais complexo do sistema:

### Step 1: Selecionar Cliente
- Busca de clientes existentes
- Opcao de criar novo cliente inline

### Step 2: Dados do Projeto
- Nome da obra, localizacao, observacoes

### Step 3: Equipamento Principal
- Selecionar grua do catalogo
- Exibir preco base

### Step 4: Componentes (Torres/Tramos)
- Selecionar itens de torres, tramos, chassis
- Quantidade e desconto por item
- Validacao de limite de desconto por role

### Step 5: Acessorios
- Lista de acessorios disponiveis
- Adicionar/remover com quantidade

### Step 6: Condicoes Comerciais
- Moeda (BRL, USD, EUR)
- Prazo de entrega
- Condicoes de pagamento
- Frete

### Step 7: Descontos
- Desconto geral com validacao por role
- Operador: max 5%
- Admin: ate limite configurado
- Exibir alerta se desconto exceder limite

### Step 8: Revisao e Finalizacao
- Resumo completo do orcamento
- Calculos automaticos (subtotal, descontos, total)
- Botao "Salvar Rascunho" e "Finalizar"
- Apos finalizar, orcamento fica travado (nao editavel)

---

## Fase 5: Geracao de PDF

### 5.1 Edge Function para PDF
- Criar edge function usando jsPDF (Puppeteer nao disponivel no Lovable)
- Template profissional com logo SOIMA
- Dados do cliente, projeto, lista de produtos, precos
- Condicoes comerciais e validade

### 5.2 Integracao
- Botao "Gerar PDF" na lista de orcamentos (apenas finalizados)
- Download direto no navegador
- Registrar hash no banco para verificacao

---

## Fase 6: Auditoria Automatica

### 6.1 Trigger de Auditoria
- Criar triggers no banco para registrar automaticamente CREATE/UPDATE/DELETE
- Tabelas monitoradas: clients, products, leads, quotes
- Registrar user_email, old_values, new_values

---

## Detalhes Tecnicos

### Arquivos a criar/modificar:

**Novos componentes:**
- `src/components/clients/ClientDetailModal.tsx`
- `src/components/clients/ClientEditModal.tsx`
- `src/components/products/ProductFormModal.tsx`
- `src/components/pipeline/LeadFormModal.tsx`
- `src/components/pipeline/LeadDetailModal.tsx`
- `src/components/pipeline/DraggableLeadCard.tsx`
- `src/components/users/UserFormModal.tsx`
- `src/components/quotes/QuoteWizard.tsx`
- `src/components/quotes/steps/Step1Client.tsx` (ate Step8Review.tsx)
- `src/components/dashboard/StatsCards.tsx`
- `src/components/dashboard/PipelineChart.tsx`
- `src/components/dashboard/RecentQuotes.tsx`

**Paginas a modificar:**
- `src/pages/Dashboard.tsx` - queries reais + graficos
- `src/pages/Clientes.tsx` - editar/excluir
- `src/pages/Produtos.tsx` - CRUD completo
- `src/pages/Pipeline.tsx` - drag & drop + CRUD leads
- `src/pages/Orcamentos.tsx` - wizard + detalhes
- `src/pages/Usuarios.tsx` - CRUD usuarios

**Edge Functions:**
- `supabase/functions/generate-pdf/index.ts`

**Migrations:**
- Fix user_roles trigger
- Audit triggers
- Seed data adicional

### Ordem de implementacao sugerida:
1. Corrigir RBAC + seed (fundamental)
2. Dashboard real (impacto visual imediato)
3. CRUD completo de Clientes e Produtos (base para orcamentos)
4. Pipeline com drag & drop (funcionalidade core)
5. Wizard de Orcamentos (modulo mais complexo)
6. Geracao de PDF (depende de orcamentos)
7. Auditoria automatica (finalizacao)

Cada fase sera implementada incrementalmente e testada antes de avancar.

