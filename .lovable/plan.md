## Plano: 7 ajustes em Propostas

### 1) Compartilhar propostas com outros vendedores (modo Ambos)
- Nova tabela `public.quote_shares` (`quote_id`, `shared_with_user_id`, `granted_by`) — compartilhamento individual por proposta.
- Nova tabela `public.user_quote_access` (`owner_id`, `viewer_id`, `granted_at`) — compartilhamento global (o vendedor passa a ver todas as propostas atuais e futuras do owner).
- Função `public.can_view_quote(_quote_id uuid, _user uuid)` SECURITY DEFINER que retorna true se: admin, criador, compartilhada individualmente, ou acesso global concedido pelo criador.
- Atualizar a policy SELECT de `quotes` e de `quote_items` para usar essa função.
- UI:
  - Em `QuoteDetailModal`: novo card "Compartilhar" (apenas para o dono/admin) com lista de vendedores ativos (multi-select) → grava em `quote_shares`.
  - Nova página "Meus Acessos" em `MeuPerfil` (ou nova rota) onde o vendedor concede acesso global a outros vendedores específicos → grava em `user_quote_access`.
- Página `Orcamentos.tsx` já usa o SELECT do RLS, então passa a listar automaticamente as propostas compartilhadas.

### 2) Cadastro de grua nova não carrega itens na proposta
- Causa: ao criar produto em `ProductFormModal`, não há inserção em `default_panel_items`, então o wizard nunca pré-popula.
- Ajuste: adicionar editor de "Itens integrantes padrão" no `ProductFormModal` (lista editável) — salvo em `default_panel_items` na criação/edição (delete+insert).
- Fallback: quando `defaultPanelItems` vier vazio no `StepTechnical`, carregar um catálogo padrão global (ex.: itens comuns SGT) para o usuário poder remover/editar — assim novos modelos não saem "vazios".

### 3) Nome do vendedor na última página do PDF
- Em `generate-pdf/index.ts`, na seção final/aceite, buscar `profiles.name` via `quote.created_by` (já há fetch parecido na linha 459) e renderizar uma linha "Vendedor: {nome}" acima do bloco de assinatura.

### 5) Esconder valores → mostrar "A combinar"
- Quando `hide_unit_prices` (ou flag de esconder valores) estiver ativa:
  - PDF: substituir o valor unitário, subtotal e total por "A combinar" (PT) / "To be defined" (EN).
  - Wizard `StepReview`/preview: mesma substituição na UI quando a flag está marcada.

### 6) Quadro de potências no cadastro do produto (grua)
- Adicionar em `ProductFormModal` (aba/seção "Potências padrão") os campos faltantes:
  - Elevação: `default_motor_elev_kw` (daN.m), `default_motor_elev_hp` (kW), `default_motor_elev_vel`
  - Distribuição: idem `default_motor_trans_*`
  - Rotação: idem `default_motor_rot_*`
  - Já existe `default_panel_voltage`; adicionar `default_panel_potencia_total` (kW) e `default_panel_include_motors`.
- O wizard já lê esses campos em `loadPanelDefaults` — basta passarem a ter valor real.

### 7) Reorganizar quadro de potências/velocidades no PDF
- Em `generate-pdf/index.ts` (linhas ~1296-1304), reordenar colunas para:
  `Item | Velocidade | Potência (com tensão embutida) | Capacidade máx. (com potência máx.)`
- Mover linha "Tensão" para dentro da coluna Potência de cada motor; adicionar coluna "Capacidade máxima" puxando de `grua_carga_maxima_kg` + potência total.

### 8) Reordenar normas — NR 12 e NR 18 ao final
- Em `generate-pdf/index.ts` linhas 220 e 346 alterar a string `warranty_norms`:
  - PT: `F.E.M. 1.001-A3 – NBR 8400-1:2019 - NBR 8800:2008 - NBR 16147:2021 - NBR 10084:2020 - NBR 8681 – NBE ISO 13.849-2 – 02/2019 – NR 12 – NR 18`
  - EN: mesma ordem.

### Arquivos afetados
| Arquivo | Mudança |
|---|---|
| `supabase/migrations/...` (novo) | tabelas `quote_shares`, `user_quote_access`, função `can_view_quote`, novos campos em `products` (motores + potência total), update policies de `quotes`/`quote_items` |
| `src/components/quotes/QuoteDetailModal.tsx` | Card "Compartilhar com vendedores" |
| `src/pages/MeuPerfil.tsx` (ou nova rota) | Seção "Vendedores com acesso às minhas propostas" |
| `src/components/products/ProductFormModal.tsx` | Editor de itens padrão + quadro de potências padrão |
| `src/components/quotes/steps/StepTechnical.tsx` | Fallback de itens padrão globais |
| `src/components/quotes/steps/StepReview.tsx` | "A combinar" quando esconder valores |
| `supabase/functions/generate-pdf/index.ts` | Nome do vendedor no rodapé, "A combinar", reordenação do quadro de motores, reordenação das normas |