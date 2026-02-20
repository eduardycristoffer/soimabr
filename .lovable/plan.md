

## Adicionar campos internacionais e dados padrao da grua no cadastro de produtos

### Resumo

3 grandes mudancas:

1. **Nome e Descricao em Ingles** no cadastro de produtos (gruas) -- usados automaticamente em propostas com idioma ingles/USD
2. **Dados padrao da grua** (lanca, altura torre, cargas, altura trabalho) cadastrados no produto e puxados automaticamente na proposta (com opcao de sobrescrever)
3. **Renomear "Painel" para "Grua"** em todo o sistema: "Itens Integrantes do Painel" vira "Itens Integrantes da Grua"

---

### Detalhes tecnicos

#### 1. Migracao do banco de dados

Adicionar 7 novas colunas na tabela `products`:

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `nome_en` | text, nullable | Nome do produto em ingles |
| `descricao_en` | text, nullable | Descricao do produto em ingles |
| `default_lanca_m` | numeric, nullable | Lanca padrao (m) |
| `default_altura_torre_m` | numeric, nullable | Altura da torre padrao (m) |
| `default_carga_maxima_kg` | numeric, nullable | Carga maxima padrao (kg) |
| `default_carga_ponta_kg` | numeric, nullable | Carga na ponta padrao (kg) |
| `default_altura_trabalho_m` | numeric, nullable | Altura de trabalho padrao (m) |

#### 2. Formulario de produto (`ProductFormModal.tsx`)

Quando a categoria for **grua**, exibir campos adicionais:
- Nome em Ingles (`nome_en`)
- Descricao em Ingles (`descricao_en`)
- Secao "Especificacoes padrao da grua":
  - Lanca (m), Altura torre (m), Carga maxima (kg), Carga na ponta (kg), Altura de trabalho (m)
  - Tipo, Velocidade elevacao, Velocidade rotacao, Velocidade translacao (ja existem na tabela)
  - Tensao de alimentacao padrao (ja existe: `default_panel_voltage`)
- Todos esses campos ja existentes no banco serao expostos no formulario quando categoria = grua

O modal precisa ser ampliado (`max-w-2xl`) para acomodar os campos extras.

#### 3. Wizard da proposta - puxar dados automaticos

**StepEquipment.tsx**: Ao selecionar uma grua, preencher automaticamente os campos de lanca, torre, cargas e altura de trabalho com os valores padrao do produto (se existirem). O usuario pode editar.

**StepTechnical.tsx**: 
- O botao "Preencher com padrao" ja funciona para spec_tipo e velocidades -- manter
- Ao carregar itens do painel, tambem puxar `default_panel_voltage` automaticamente -- ja funciona
- Tensao de alimentacao: ja puxa do produto, sem alteracao necessaria

#### 4. PDF (`generate-pdf/index.ts`)

- Quando o idioma da proposta for `en`, usar `nome_en` (se preenchido) em vez de `nome` para exibir o nome do produto nos itens
- Renomear `panel_title` de "ITENS INTEGRANTES DO PAINEL" para "ITENS INTEGRANTES DA GRUA" (pt-BR) e "CRANE COMPONENTS" (en)

#### 5. Renomear "Painel" para "Grua" no sistema

Arquivos afetados:
- `StepTechnical.tsx`: Titulo "Itens Integrantes do Painel" vira "Itens Integrantes da Grua", descricao "painel eletrico" vira "grua"
- `generate-pdf/index.ts`: Traducoes pt-BR e en do `panel_title`

#### 6. Tabela de produtos (`Produtos.tsx`)

Sem alteracao visual na listagem -- os novos campos sao editados apenas no modal.

---

### Arquivos modificados

| Arquivo | Tipo de alteracao |
|---------|-------------------|
| Migracao SQL | Adicionar 7 colunas |
| `src/components/products/ProductFormModal.tsx` | Campos extras para gruas |
| `src/components/quotes/steps/StepEquipment.tsx` | Auto-preencher specs da grua |
| `src/components/quotes/steps/StepTechnical.tsx` | Renomear "Painel" para "Grua" |
| `supabase/functions/generate-pdf/index.ts` | nome_en no PDF + renomear titulo |
| `src/hooks/useQuoteWizard.ts` | Sem alteracao (campos ja existem) |

