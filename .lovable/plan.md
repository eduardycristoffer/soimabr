
# 🏗️ Plano de Implementação: SOIMA CRM no Lovable

## Visão Geral
Recriar o sistema **SOIMA CRM** originalmente desenvolvido em Next.js 14 + Prisma, adaptando para a stack do Lovable (React + Vite + Supabase). O sistema é um CRM completo para gestão comercial de gruas industriais, incluindo pipeline de vendas, orçamentos e geração de propostas em PDF.

---

## 🎨 Design System
- **Estilo**: Apple-like minimalista
- **Paleta**: Azul (#3B82F6) + Branco + Preto
- **Tipografia**: Inter (já configurado)
- **Componentes**: shadcn/ui (já disponível no projeto)

---

## 📦 Fase 1: Fundação (Banco de Dados + Auth)

### 1.1 Configurar Supabase (Lovable Cloud)
- Habilitar Lovable Cloud para banco PostgreSQL integrado
- Configurar autenticação por email/senha

### 1.2 Criar Schema do Banco de Dados
Criar as tabelas necessárias adaptadas para Supabase:

| Tabela | Descrição |
|--------|-----------|
| `profiles` | Perfil do usuário (nome, role_id, ativo) |
| `user_roles` | Papéis: ADMIN, OPERATOR (tabela separada para segurança) |
| `clients` | Clientes nacionais e internacionais |
| `products` | Catálogo de produtos (gruas, torres, acessórios) |
| `discount_rules` | Regras de desconto por perfil |
| `pipeline_stages` | Etapas do funil (7 etapas) |
| `leads` | Leads de vendas |
| `lead_histories` | Histórico de movimentações |
| `quotes` | Orçamentos/Propostas |
| `quote_items` | Itens de cada orçamento |
| `audit_logs` | Logs de auditoria |

### 1.3 Políticas RLS (Row Level Security)
- Operadores veem apenas seus próprios leads/orçamentos
- Admins veem tudo
- Função `has_role()` para verificação segura de permissões

---

## 📦 Fase 2: Layout e Navegação

### 2.1 Layout Principal
- **Sidebar** lateral com menu de navegação
- **Header** com usuário logado e logout
- Responsivo para mobile (sidebar colapsável)

### 2.2 Rotas da Aplicação
```
/login          → Página de login
/dashboard      → Dashboard (diferenciado por role)
/clientes       → Lista de clientes
/clientes/novo  → Cadastrar cliente
/produtos       → Catálogo de produtos (Admin)
/pipeline       → Kanban de leads
/orcamentos     → Lista de orçamentos
/orcamentos/novo → Wizard de orçamento
/usuarios       → Gestão de usuários (Admin)
/auditoria      → Logs do sistema (Admin)
```

---

## 📦 Fase 3: Módulos Core

### 3.1 Autenticação e RBAC
- Login com email/senha
- 2 perfis: **ADMIN** e **OPERATOR**
- Proteção de rotas por role
- Middleware de autenticação

### 3.2 Dashboard
**Visão Admin:**
- Total de leads, clientes, orçamentos
- Gráfico de conversão do pipeline
- Top vendedores

**Visão Operador:**
- Seus leads e orçamentos
- Métricas pessoais
- Próximas ações

### 3.3 Módulo de Clientes
- CRUD completo (criar, listar, editar, excluir)
- Suporte nacional (CNPJ/CPF) e internacional
- Campos: razão social, nome fantasia, documentos, contatos
- Histórico de orçamentos vinculados

### 3.4 Catálogo de Produtos (Admin)
- Organização por categorias:
  - 🏗️ Gruas (SGT 3610 TL - SGT 7020 TL)
  - ⚙️ Configurações
  - 🗼 Torres e Tramos
  - 🔧 Acessórios
- Campos: código, nome, preço, unidade, status
- Badge "Precisa Revisar" para preços R$ 0,00

---

## 📦 Fase 4: Pipeline de Vendas (Kanban)

### 4.1 Quadro Kanban
- **7 etapas** configuráveis:
  1. Novo Lead
  2. Primeiro Contato
  3. Qualificação
  4. Proposta Enviada
  5. Negociação
  6. Fechamento
  7. Perdido

### 4.2 Funcionalidades
- Drag & drop entre etapas
- Cards com info resumida do lead
- Filtros por operador, data, status
- Modal de detalhes com histórico
- Botão "Converter em Cliente"

---

## 📦 Fase 5: Sistema de Orçamentos

### 5.1 Lista de Orçamentos
- Tabela com busca e filtros
- Status: Rascunho, Finalizado, Cancelado
- Ações: ver, editar, duplicar, cancelar

### 5.2 Wizard de Criação (8 Etapas)
1. **Selecionar Cliente** - Busca ou cria novo
2. **Dados do Projeto** - Nome da obra, localização
3. **Equipamento Principal** - Escolher grua + configuração
4. **Componentes** - Torres, tramos, chassis
5. **Acessórios** - Sinalizadores, anemômetros, etc.
6. **Condições Comerciais** - Moeda, prazo, frete
7. **Descontos** - Validação conforme regras do perfil
8. **Revisão e Finalização** - Preview antes de salvar

### 5.3 Validações de Desconto
- Operador: máximo 5% sem aprovação
- Admin: até limite configurado
- Acima do limite: fluxo de aprovação

---

## 📦 Fase 6: Geração de PDF

### 6.1 Proposta Comercial
- Template profissional baseado no modelo SOIMA
- Geração via Edge Function com jsPDF
- Download direto pelo navegador
- Registro de hash no banco para verificação

### 6.2 Conteúdo do PDF
- Cabeçalho com logo SOIMA
- Dados do cliente e projeto
- Lista de produtos com preços
- Condições comerciais
- Validade da proposta

---

## 📦 Fase 7: Recursos Administrativos

### 7.1 Gestão de Usuários (Admin)
- Criar novos usuários
- Atribuir role (Admin/Operador)
- Ativar/desativar contas
- Reset de senha

### 7.2 Auditoria
- Log automático de ações críticas
- Filtros por ação, usuário, data
- Registro de before/after em JSON

---

## 📦 Fase 8: Dados Iniciais (Seed)

Após criar as tabelas, popular com:
- ✅ 7 modelos de Gruas (SGT 3610 TL até SGT 7020 TL)
- ✅ 6 configurações de gruas
- ✅ 60+ itens de torres, tramos e chassis
- ✅ 30+ acessórios
- ✅ 7 etapas de pipeline
- ✅ 4 regras de desconto
- ✅ 1 usuário admin (admin@soimabrasil.com.br / soima123)

---

## 🚀 Entregáveis Finais

1. **Sistema CRM funcional** com todos os módulos
2. **Autenticação segura** com RBAC
3. **Pipeline Kanban** com drag & drop
4. **Wizard de orçamentos** completo
5. **Geração de PDF** de propostas
6. **Auditoria** de todas as ações
7. **Design responsivo** Apple-like

---

## ⏱️ Considerações de Implementação

- A implementação será feita em **etapas incrementais**
- Cada módulo será testado antes de avançar
- Foco em experiência do usuário e performance
- Código limpo e bem organizado
