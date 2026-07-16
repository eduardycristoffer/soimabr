## Objetivo
Tornar o botão **Gerar Contrato** mais acessível e garantir que os dados da SOIMA (vendedora) e da proposta venham pré-preenchidos no diálogo de geração.

## 1. Atalho "Gerar Contrato" na lista de Propostas (`/orcamentos`)
- No `DropdownMenu` de ações de cada linha em `src/pages/Orcamentos.tsx`, adicionar item **"Gerar Contrato"** (ícone `FileSignature`) — visível apenas quando `quote.status === "finalized"`.
- Ao clicar, abrir o `GenerateContractDialog` já existente, passando o `quote.id`.
- Estado local novo: `generatingContractQuoteId`.

## 2. Atalho "Gerar Contrato" na lista de Contratos (`/contratos`)
- Adicionar botão primário **"Gerar Contrato"** no topo direito (mesmo padrão do "Nova Proposta").
- Ao clicar, abrir um seletor simples de propostas finalizadas ainda sem contrato → depois abrir o `GenerateContractDialog`.
- Implementação: novo pequeno modal `SelectQuoteForContractDialog` que lista quotes com `status='finalized'` (respeitando RLS) e que ainda não tenham contrato associado (subquery em `contracts.quote_id`). Ao selecionar, dispara o `GenerateContractDialog`.

## 3. Pré-preenchimento da SOIMA (vendedora) no diálogo
Hoje `GenerateContractDialog` só coleta dados do comprador e gestores. Os dados da vendedora só entram na geração via `company_settings` (silenciosamente). Vamos torná-los visíveis e editáveis, já pré-preenchidos:

- No `GenerateContractDialog.tsx`, adicionar `useQuery` para `company_settings` (já é buscado na hora de gerar — mover para carregamento inicial).
- Nova seção **"Representante legal da vendedora (SOIMA)"** com campos `seller_rep_name / cpf / rg / cargo`, `defaultValue` vindo de `company_settings.representante_nome/cpf/rg/cargo`. Se o usuário editar, o valor entra em `inputs.seller_rep_*` (que o `contractPlaceholders` já usa com prioridade sobre o company_settings).
- Persistir esses campos no `INSERT` em `contracts` (novas colunas `seller_rep_*` já existem no schema — confirmar; se faltar, migration adiciona).

## 4. Pré-preenchimento a partir da proposta
Reforçar o que o diálogo já faz (delivery_days, cronograma 40/60 baseado no total) e adicionar:
- **Representante da compradora**: se `clients.representante_nome/cpf/rg/cargo` existir, usar como `defaultValue` dos campos do comprador.
- **Gestor vendedora**: pré-preencher com `company_settings.gestor_padrao_*` se existir; caso contrário, com dados do usuário autenticado (`profiles.name/email`).
- **Gestor compradora**: pré-preencher com `clients.contato_nome/email/telefone`.

## 5. Detalhes técnicos
- Reaproveitar `GenerateContractDialog` em ambos os pontos de entrada; nenhuma duplicação de lógica.
- Manter o fluxo/telas de quotes intactos: só adicionar o item de menu.
- Sem alterações no schema, exceto se os campos `seller_rep_*` não existirem em `contracts` — nesse caso, migration mínima para adicioná-los (nullable).
- Nenhuma mudança em edge functions nem em `contractPlaceholders.ts` (já suporta os `seller_rep_*` como override).

## Arquivos afetados
- `src/pages/Orcamentos.tsx` — novo item de menu + estado
- `src/pages/Contratos.tsx` — novo botão + modal seletor
- `src/components/contracts/SelectQuoteForContractDialog.tsx` — **novo**
- `src/components/contracts/GenerateContractDialog.tsx` — nova seção vendedora, `useQuery` do `company_settings` e `clients` para prefill
- (condicional) migration adicionando `seller_rep_name/cpf/rg/cargo` em `contracts`
