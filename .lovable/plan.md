# Revisões, datas e ajustes de proposta

## 1. Opções de esconder ativas por padrão
- Em toda proposta nova (venda e locação), as opções "Esconder valor do desconto no PDF" e "Esconder valores unitários dos itens no PDF" já vêm marcadas.
- O usuário continua podendo desmarcar.
- Propostas já existentes mantêm o que foi salvo nelas.

## 2. Revisões catalogadas
- Cada vez que uma proposta é salva (rascunho ou finalização de edição), o sistema guarda uma revisão com: número da revisão, quem salvou, data e hora, e uma cópia do conteúdo daquele momento.
- Na listagem de propostas, o selo passa a mostrar a revisão: "Rascunho · rev. 3", "Finalizado · rev. 5".
- No detalhe da proposta, uma nova seção "Histórico de salvamentos" lista todas as revisões (mais recente primeiro) com número, autor e data/hora.

## 3. Datas
- A data de última alteração é atualizada em todo salvamento.
- A listagem mostra duas colunas: "Criado em" e "Alterado em".

## 4. Observações com quebra de texto no PDF
- O texto digitado em Observações passa a sair no PDF respeitando as quebras de linha e parágrafos, em vez de virar um bloco corrido. Vale para o PDF de venda e o de locação.

## Detalhes técnicos
- `useQuoteWizard.ts` / `useRentalWizard.ts`: `hide_discount_value` e `hide_unit_prices` iniciam como `true` no `INITIAL_DATA` (carregamento de proposta existente continua usando o valor salvo).
- Revisões: reutilizar a tabela existente `quote_versions` (`quote_id`, `version_number`, `snapshot`, `edited_by`, `edited_at`). Inserir uma linha em cada save de `QuoteWizard.tsx` e `RentalWizard.tsx`, com `version_number = COALESCE(max,0)+1` obtido por consulta prévia. Snapshot = payload da proposta + itens.
- Ajustar RLS/GRANT de `quote_versions` se o insert pelo próprio criador não estiver coberto (verificar policies atuais antes de migrar; migração só se necessário).
- `Orcamentos.tsx`: buscar contagem/máximo de revisão por proposta (agregação em uma consulta a `quote_versions`) para o selo; adicionar coluna "Alterado em" usando `updated_at` (o trigger `update_quotes_updated_at` já existe).
- `QuoteDetailModal.tsx`: nova seção que consulta `quote_versions` da proposta com join no nome do autor via `profiles`.
- `supabase/functions/generate-pdf/index.ts`: renderizar o bloco de observações dentro de um container com `white-space: pre-line` (aplicar nos dois pontos onde `quote.notes` é impresso, venda e locação), mantendo o limite de 1500 caracteres.
