

## Renomear "Velocidade de elevação" para "Velocidade de distribuição" e auto-preencher dados na etapa Técnico

### Resumo

1. **Renomear** "Velocidade de elevação" para "Velocidade de distribuição" em todo o sistema (formulário de produto, wizard da proposta e PDF em PT-BR e EN)
2. **Auto-preencher** os dados padrão da grua na etapa 6 (Técnico) quando a grua já estiver selecionada, mantendo a opção de editar

---

### Detalhes técnicos

| Arquivo | Alteração |
|---------|-----------|
| `src/components/products/ProductFormModal.tsx` | Renomear label "Vel. Elevação" para "Vel. Distribuição" |
| `src/components/quotes/steps/StepTechnical.tsx` | Renomear label "Velocidade de elevação" para "Velocidade de distribuição" + adicionar `useEffect` para auto-preencher specs, panel items, voltage e garantia ao entrar na etapa (se grua selecionada e campos ainda vazios) |
| `supabase/functions/generate-pdf/index.ts` | PT-BR: `scope_vel_elevation` de "Velocidade de elevação" para "Velocidade de distribuição". EN: "Hoisting speed" para "Distribution speed". Mesma troca no `panel_motor_elevation` PT-BR e EN |
| `src/components/quotes/steps/StepReview.tsx` | Verificar se exibe "elevação" e renomear se necessário |

#### Auto-preenchimento na etapa 6

Adicionar um `useEffect` em `StepTechnical` que, quando `productDefaults` e `defaultPanelItems` carregarem:
- Se `spec_tipo` estiver vazio, chama `loadSpecDefaults()` automaticamente
- Se `panel_items` estiver vazio e houver itens padrão, chama `loadPanelDefaults()` automaticamente
- Se garantia estiver nos valores iniciais (3/2/1), chama `loadWarrantyDefaults()` automaticamente

O usuario continua podendo editar tudo normalmente -- os botoes "Preencher com padrão" permanecem para recarregar manualmente se necessario.

#### Nomes de colunas no banco

O campo no banco continua sendo `spec_vel_elevacao` -- a mudanca e apenas no label exibido na UI e no PDF. Nao e necessaria migracao.

