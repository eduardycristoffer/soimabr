
# Reordenacao de Etapas e Vista de Lista de Leads

## O que sera feito

### 1. Permitir reordenacao de TODAS as etapas (fixas e editaveis)

**Problema atual:** O trigger `prevent_fixed_stage_mutation` no banco bloqueia qualquer UPDATE em etapas fixas, incluindo mudanca de `order_index`. Isso impede reordenar etapas fixas.

**Solucao:**
- Atualizar o trigger SQL para permitir alteracao de `order_index` e `color` em etapas fixas, mantendo o bloqueio apenas em `name`, `is_fixed` e `stage_type`
- Adicionar botoes de mover para cima/baixo no `PipelineStageManager` (as setas ja estao implicitas pelo grip icon, mas nao funciona de fato)
- Implementar reordenacao funcional com botoes de seta para todas as etapas

### 2. Vista de Lista de todos os Leads

**Problema atual:** Hoje so e possivel ver leads dentro do Kanban, agrupados por etapa. Nao ha uma visao geral em lista.

**Solucao:**
- Adicionar toggle Kanban/Lista no header do Pipeline
- Na vista Lista, mostrar uma tabela com todos os leads contendo:
  - Titulo
  - Empresa
  - Contato (nome, email, telefone)
  - Etapa atual (badge colorido)
  - Origem (source)
  - Valor estimado
  - Data de criacao
  - Status (Lead / Proposta / Convertido)
- Clicar em um lead abre o mesmo `LeadDetailModal` (com opcao de editar)
- O lead funciona como um **pre-cadastro** ate ser convertido em cliente

---

## Detalhes tecnicos

### Migracao SQL
Atualizar o trigger `prevent_fixed_stage_mutation` para:
- Permitir `UPDATE` de `order_index` e `color` em etapas fixas
- Continuar bloqueando `name`, `is_fixed`, `stage_type` em etapas fixas

### PipelineStageManager.tsx
- Adicionar botoes de seta (ChevronUp / ChevronDown) para TODAS as etapas
- Ao clicar, trocar `order_index` com a etapa adjacente (swap)
- Mutation para atualizar ambos os registros no banco

### Pipeline.tsx
- Adicionar toggle de visualizacao: "Kanban" | "Lista"
- Quando "Lista" selecionado, renderizar novo componente `PipelineLeadList`

### Novo: PipelineLeadList.tsx
- Tabela responsiva com todos os leads (sem agrupamento por etapa)
- Colunas: Titulo, Empresa, Contato, Etapa, Origem, Valor, Data, Status
- Ordenacao por coluna (click no header)
- Clicar na linha abre `LeadDetailModal`
- Mesmo filtro de tipo (Todos/Leads/Propostas) ja existente

### Arquivos modificados
| Arquivo | Acao |
|---------|------|
| Migracao SQL | Atualizar trigger para permitir reorder de fixas |
| `src/components/pipeline/PipelineStageManager.tsx` | Botoes de reordenacao para todas as etapas |
| `src/pages/Pipeline.tsx` | Toggle Kanban/Lista |
| `src/components/pipeline/PipelineLeadList.tsx` | Novo: vista de lista/tabela |
