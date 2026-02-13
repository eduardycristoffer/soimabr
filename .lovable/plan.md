
# Travar 1 Grua por Proposta (Single-Grua)

## Situacao Atual

Hoje, o passo "Equipamento" do wizard usa o `ProductPicker` generico com multi-select, permitindo adicionar varias gruas. Dados existentes confirmam que 2 propostas antigas tem multiplas gruas (ORC260002 com 4 gruas, ORC260004 com 3 gruas). A grua e armazenada como um item normal em `quote_items` com `product_category = 'grua'`.

## Abordagem

Manter a grua dentro de `quote_items` (sem criar FK `crane_id` na tabela `quotes`) por ser a abordagem mais simples e compativel. A restricao de "1 grua por proposta" sera aplicada em 3 camadas: UI, logica do wizard, e validacao no backend (trigger SQL).

---

## 1. Banco de Dados -- Trigger de Validacao

Criar um trigger `BEFORE INSERT` em `quote_items` que conta quantos itens com `product_category = 'grua'` ja existem para aquele `quote_id`. Se ja houver 1, bloqueia o INSERT com erro.

Isso garante a regra no nivel do banco, independente do frontend.

**Propostas antigas com multiplas gruas** (ORC260002 e ORC260004): nao serao migradas automaticamente. O trigger so se aplica a novos inserts. Elas continuam funcionando como estao, mas se forem editadas o usuario precisara remover as gruas extras.

## 2. StepEquipment -- Selecao Unica

Substituir o `ProductPicker` multi-select por uma interface de selecao unica:

- Exibir o catalogo de gruas com busca (como hoje)
- Ao clicar numa grua, ela **substitui** a grua atual (em vez de acumular)
- Quando ja ha uma grua selecionada, mostrar um card de resumo com:
  - Nome e codigo da grua
  - Botao "Trocar grua"
  - Campos de especificacoes tecnicas (lanca, altura torre, cargas, etc.) -- igual ao atual
- Remover os botoes de +/- quantidade (grua sempre tem qty = 1)
- Mensagem informativa: "Cada proposta permite 1 grua. Para vender mais de uma grua, crie outra proposta."

## 3. Validacao no Wizard (Frontend)

- No `StepEquipment`, bloquear o botao "Proximo" se nenhuma grua estiver selecionada
- No `StepReview`, bloquear "Finalizar" e "Salvar Rascunho" se `equipment.length === 0`
- Mensagem: "Selecione 1 grua para continuar."
- O array `equipment` no wizard tera no maximo 1 item

## 4. QuoteWizard -- Logica de Save

Nenhuma mudanca estrutural no save. O array `equipment` ja e salvo em `quote_items`. Com a restricao de 1 item no frontend + trigger no banco, a regra esta completa.

## 5. PDF

Nenhuma mudanca estrutural necessaria. O PDF ja separa gruas de outros itens. A unica grua aparecera na secao de equipamento. A logica atual ja funciona com 1 grua.

## 6. QuoteDetailModal

Nenhuma mudanca necessaria -- ja exibe os itens por categoria.

---

## Detalhes Tecnicos -- Arquivos

| Arquivo | Acao |
|---------|------|
| Migracao SQL | **Nova**: trigger `enforce_single_grua_per_quote` em `quote_items` |
| `src/components/quotes/steps/StepEquipment.tsx` | **Refatorar**: substituir ProductPicker por selecao unica com card de resumo |
| `src/components/quotes/steps/StepReview.tsx` | Adicionar validacao: bloquear finalizacao sem grua |
| `src/hooks/useQuoteWizard.ts` | Sem mudanca (equipment[] ja funciona, apenas limitar a 1 item no UI) |
| `src/components/quotes/QuoteWizard.tsx` | Sem mudanca |

### Trigger SQL (resumo)

```text
BEFORE INSERT ON quote_items
  IF NEW.product_category = 'grua' THEN
    SELECT count(*) FROM quote_items
      WHERE quote_id = NEW.quote_id AND product_category = 'grua';
    IF count >= 1 THEN
      RAISE EXCEPTION 'Apenas 1 grua permitida por proposta';
    END IF;
  END IF;
```

Note: o save do wizard ja faz DELETE de todos os items antes de re-inserir, entao o trigger funciona corretamente no fluxo de edicao.
