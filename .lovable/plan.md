

## Sistema de Orçamento de Locação de Gruas

Adicionar o tipo "Locação" ao módulo de Propostas existente, com wizard dedicado, campos específicos de aluguel e geração de PDF no mesmo layout premium.

### Arquitetura

O sistema existente de venda será mantido intacto. Um campo `quote_type` (`venda` | `locacao`) distinguirá os dois tipos. Ao criar nova proposta, o usuário escolhe o tipo antes de entrar no wizard. O wizard de locação terá etapas diferentes do de venda.

```text
Tela de Propostas
  └─ Botão "Nova Proposta"
       └─ Modal: "Venda" ou "Locação"
            ├─ Venda → Wizard atual (9 etapas)
            └─ Locação → Wizard novo (7 etapas)
```

### Migração SQL

```sql
-- Tipo de proposta
CREATE TYPE public.quote_type AS ENUM ('venda', 'locacao');
ALTER TABLE public.quotes ADD COLUMN quote_type quote_type NOT NULL DEFAULT 'venda';

-- Campos específicos de locação
ALTER TABLE public.quotes ADD COLUMN rental_duration_months integer;
ALTER TABLE public.quotes ADD COLUMN rental_monthly_value numeric;
ALTER TABLE public.quotes ADD COLUMN rental_mobilization numeric DEFAULT 0;
ALTER TABLE public.quotes ADD COLUMN rental_demobilization numeric DEFAULT 0;
ALTER TABLE public.quotes ADD COLUMN rental_freight numeric DEFAULT 0;
ALTER TABLE public.quotes ADD COLUMN rental_assembly numeric DEFAULT 0;
ALTER TABLE public.quotes ADD COLUMN rental_disassembly numeric DEFAULT 0;
ALTER TABLE public.quotes ADD COLUMN rental_operator_included boolean DEFAULT false;
ALTER TABLE public.quotes ADD COLUMN rental_maintenance_included boolean DEFAULT false;
ALTER TABLE public.quotes ADD COLUMN rental_insurance_included boolean DEFAULT false;
ALTER TABLE public.quotes ADD COLUMN rental_technical_assistance boolean DEFAULT false;
ALTER TABLE public.quotes ADD COLUMN rental_start_date date;
ALTER TABLE public.quotes ADD COLUMN rental_terrain_condition text;
ALTER TABLE public.quotes ADD COLUMN rental_special_foundation boolean DEFAULT false;
ALTER TABLE public.quotes ADD COLUMN rental_work_type text; -- residencial, comercial, industrial
ALTER TABLE public.quotes ADD COLUMN rental_height_needed numeric;
ALTER TABLE public.quotes ADD COLUMN rental_jib_needed numeric;
ALTER TABLE public.quotes ADD COLUMN rental_max_weight numeric;
ALTER TABLE public.quotes ADD COLUMN rental_tax_percent numeric DEFAULT 0;

-- Campos de locação no cadastro de produtos (grua)
ALTER TABLE public.products ADD COLUMN rental_monthly_price numeric;
ALTER TABLE public.products ADD COLUMN rental_mobilization_default numeric;
ALTER TABLE public.products ADD COLUMN rental_assembly_default numeric;
```

### Etapas do Wizard de Locação

| # | Etapa | Campos |
|---|-------|--------|
| 1 | Cliente | Selecionar cliente existente (reutiliza StepClient) |
| 2 | Obra | Endereço, altura necessária, lança necessária, peso máximo, prazo (meses), início previsto, tipo de obra, condição do terreno, fundação especial |
| 3 | Seleção da Grua | Lista de gruas do catálogo com filtro automático por requisitos da obra (altura, lança, carga). Mostra compatibilidade visual. Seleção manual também permitida |
| 4 | Configuração do Aluguel | Tempo de locação, valor mensal (pré-preenchido), mobilização, desmobilização, frete, montagem, desmontagem. Checkboxes: operador, manutenção, seguro, assistência técnica |
| 5 | Ajustes Comerciais | Desconto (% ou valor), impostos (%), condições de pagamento (à vista / parcelado / entrada + parcelas), observações, validade, idioma |
| 6 | Resumo | Equipamento selecionado, dados da obra, breakdown financeiro completo com cálculos em tempo real, valor total destacado |
| 7 | Revisão & Finalização | Confirmar e salvar (rascunho ou finalizar) |

### Novos Arquivos

| Arquivo | Função |
|---------|--------|
| `src/hooks/useRentalWizard.ts` | Estado e lógica do wizard de locação (7 etapas) |
| `src/components/quotes/RentalWizard.tsx` | Componente principal do wizard de locação (save/load) |
| `src/components/quotes/rental-steps/RentalStepWork.tsx` | Etapa 2: dados da obra |
| `src/components/quotes/rental-steps/RentalStepCrane.tsx` | Etapa 3: seleção da grua com sugestão automática |
| `src/components/quotes/rental-steps/RentalStepConfig.tsx` | Etapa 4: configuração do aluguel |
| `src/components/quotes/rental-steps/RentalStepCommercial.tsx` | Etapa 5: ajustes comerciais |
| `src/components/quotes/rental-steps/RentalStepSummary.tsx` | Etapa 6: resumo financeiro |
| `src/components/quotes/rental-steps/RentalStepReview.tsx` | Etapa 7: revisão final |
| `src/components/quotes/QuoteTypeSelector.tsx` | Modal para escolher "Venda" ou "Locação" |

### Arquivos Modificados

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Orcamentos.tsx` | Adicionar seletor de tipo antes de abrir wizard; exibir badge "Venda"/"Locação" na listagem; filtro por tipo |
| `src/components/quotes/QuoteDetailModal.tsx` | Renderizar campos de locação quando `quote_type === 'locacao'` |
| `src/components/products/ProductFormModal.tsx` | Adicionar campos de preço mensal de locação, mobilização padrão, montagem padrão |
| `supabase/functions/generate-pdf/index.ts` | Nova lógica de renderização para locação: especificação da grua, dados da obra, tabela de custos (mensal × meses + adicionais), extras inclusos, condições comerciais |

### Lógica de Sugestão Automática de Grua

Na etapa 3, o sistema filtra gruas do catálogo comparando:
- `default_lanca_m >= rental_jib_needed`
- `default_altura_torre_m >= rental_height_needed`
- `default_carga_maxima_kg >= rental_max_weight`

Gruas compatíveis aparecem primeiro com badge "Recomendada". As demais aparecem abaixo com indicação do que não atende.

### Cálculo Financeiro (Resumo)

```text
Valor mensal × Meses              = Subtotal Locação
+ Mobilização
+ Desmobilização
+ Frete
+ Montagem
+ Desmontagem
= Subtotal Geral
- Desconto (%)
+ Impostos (%)
= TOTAL FINAL
```

### PDF de Locação

Mesmo layout premium (capa SOIMA, cabeçalho institucional, contracapa). Conteúdo adaptado:
- Dados do cliente e da obra (tipo, terreno, fundação)
- Especificação técnica da grua selecionada
- Escopo do fornecimento (extras inclusos)
- Tabela de custos detalhada (valor mensal, mobilização, etc.)
- Condições comerciais e de pagamento
- Prazo de validade e assinatura

