

# Pipeline Kanban com Drag and Drop

## Resumo
Implementar funcionalidade completa de drag and drop no Pipeline de Vendas, permitindo mover leads entre etapas arrastando os cards. Inclui tambem CRUD completo de leads (criar, editar, visualizar detalhes com historico) e registro automatico de movimentacoes na tabela `lead_histories`.

## Funcionalidades

### 1. Drag and Drop nativo (HTML5 DnD API)
- Arrastar cards de leads entre colunas do Kanban
- Feedback visual durante o arrasto (destaque na coluna de destino, opacidade no card arrastado)
- Atualizacao otimista da UI (mover o card imediatamente, reverter se falhar)
- Registro automatico em `lead_histories` com etapa de origem e destino

### 2. Modal "Novo Lead"
- Formulario com campos: titulo, empresa, contato (nome, email, telefone), valor estimado, data prevista de fechamento, notas
- Etapa inicial padrao: "Novo Lead"
- Owner automatico: usuario logado

### 3. Modal de Detalhes do Lead
- Exibir todas as informacoes do lead ao clicar no card
- Historico de movimentacoes (timeline) buscando de `lead_histories`
- Botao para editar campos
- Botao para excluir (admin only)

### 4. Filtros
- Admin ve todos os leads; operador ve apenas os seus (ja implementado via RLS)
- Nao precisa de filtro adicional no frontend

---

## Detalhes Tecnicos

### Arquivos a criar:
- `src/components/pipeline/LeadFormModal.tsx` -- Modal para criar/editar lead com react-hook-form + zod
- `src/components/pipeline/LeadDetailModal.tsx` -- Modal de detalhes com timeline de historico

### Arquivos a modificar:
- `src/pages/Pipeline.tsx` -- Adicionar handlers de drag and drop (onDragStart, onDragOver, onDrop), integracao com modais, mutacoes para mover/criar/editar/excluir leads

### Logica de Drag and Drop:
1. Cada card de lead recebe `draggable="true"` e `onDragStart` que armazena o `lead.id` via `dataTransfer`
2. Cada coluna de stage recebe `onDragOver` (prevent default + estilo visual) e `onDrop`
3. No `onDrop`: atualiza `leads.stage_id` no banco + insere registro em `lead_histories` com `from_stage_id` e `to_stage_id`
4. Usa `useMutation` com `onMutate` para atualização otimista e `onError` para rollback

### Mutacoes necessarias:
- `moveLeadMutation`: UPDATE lead stage_id + INSERT lead_histories
- `createLeadMutation`: INSERT lead + INSERT lead_histories (acao "CREATED")
- `updateLeadMutation`: UPDATE lead
- `deleteLeadMutation`: DELETE lead (admin only)

### Validacao:
- Campos obrigatorios: titulo
- Owner_id automatico do usuario logado
- Stage_id padrao: primeira etapa (order_index = 1)

