
# Renomear "Orcamento" para "Proposta Comercial" / "Proposta"

## Resumo
Substituir todas as ocorrencias do termo "Orcamento" por "Proposta Comercial" ou "Proposta" em toda a aplicacao, incluindo o PDF gerado pela Edge Function.

## Arquivos e mudancas

### 1. `src/components/layout/Sidebar.tsx`
- Linha 27: `"Orçamentos"` -> `"Propostas"`

### 2. `src/pages/Orcamentos.tsx`
- Linha 165: titulo `"Orçamentos"` -> `"Propostas Comerciais"`
- Linha 170: botao `"Novo Orçamento"` -> `"Nova Proposta"`
- Linha 194: `"Nenhum orçamento encontrado"` -> `"Nenhuma proposta encontrada"`
- Linha 195: `"Crie seu primeiro orçamento..."` -> `"Crie sua primeira proposta..."`
- Linha 110: toast `"Orçamento ... pronto para impressão"` -> `"Proposta ... pronta para impressão"`

### 3. `src/components/quotes/QuoteWizard.tsx`
- Linha 140: `"Orçamento finalizado!"` -> `"Proposta finalizada!"`
- Linha 142: `"Orçamento ... aguardando..."` -> `"Proposta ... aguardando..."`
- Linha 153: `"Erro ao salvar orçamento"` -> `"Erro ao salvar proposta"`
- Linha 168: `"Novo Orçamento"` -> `"Nova Proposta Comercial"`

### 4. `src/hooks/useQuoteWizard.ts`
- Nenhuma mudanca necessaria (nao contem textos visíveis com "orcamento")

### 5. `src/components/quotes/steps/StepReview.tsx`
- Linha 135: `"Este orçamento requer aprovação..."` -> `"Esta proposta requer aprovação..."`
- Linha 157: `"Finalizar Orçamento"` -> `"Finalizar Proposta"`

### 6. `src/components/quotes/steps/StepCommercial.tsx`
- Linha 74: placeholder `"Notas adicionais do orçamento..."` -> `"Notas adicionais da proposta..."`

### 7. `src/components/clients/ClientDetailModal.tsx`
- Linha 131: comentario (nao visivel, mas atualizar por consistencia)
- Linha 133: `"Orçamentos (N)"` -> `"Propostas (N)"`
- Linha 135: `"Nenhum orçamento vinculado"` -> `"Nenhuma proposta vinculada"`

### 8. `src/components/dashboard/RecentQuotes.tsx`
- Linha 43: `"Orçamentos Recentes"` -> `"Propostas Recentes"`
- Linha 44: `"Últimos orçamentos criados"` -> `"Ultimas propostas criadas"`
- Linha 51: `"Nenhum orçamento ainda"` -> `"Nenhuma proposta ainda"`

### 9. `src/components/dashboard/StatsCards.tsx`
- Linha 31: comentario (atualizar)
- Linha 85: `"Orçamentos"` -> `"Propostas"`

### 10. `src/pages/Aprovacoes.tsx`
- Linha 107: `"finalizar o orçamento"` -> `"finalizar a proposta"`
- Linha 267: `"finalizar o orçamento com este desconto"` -> `"finalizar a proposta com este desconto"`

### 11. `src/pages/Auditoria.tsx`
- Linha 25: `"Orçamentos"` -> `"Propostas"`

### 12. `src/pages/Login.tsx`
- Linha 89: `"orçamentos e propostas comerciais"` -> `"propostas comerciais"`

### 13. `supabase/functions/generate-pdf/index.ts` (Edge Function - PDF)
- Linha 58: `"Orçamento não encontrado"` -> `"Proposta não encontrada"`
- Linha 152: `<title>Orçamento ...` -> `<title>Proposta Comercial ...`
- Linha 234: `"Itens do Orçamento"` -> `"Itens da Proposta"`

## Notas
- Nomes de tabelas, colunas e rotas no banco/codigo permanecem como `quotes`, `quote_number`, `/orcamentos` etc. Apenas textos visiveis ao usuario sao alterados.
- A Edge Function `generate-pdf` sera re-deployed automaticamente apos a edicao.
