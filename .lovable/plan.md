

## Evolucao do PDF de Propostas: Escopo, Painel e Garantia

Este plano implementa 3 novas secoes no PDF e toda a infraestrutura necessaria (banco, UI, geracao).

---

### Visao Geral da Arquitetura

A abordagem escolhida e **armazenar defaults no produto (grua) e overrides na proposta**, usando colunas adicionais nas tabelas existentes (`products` e `quotes`) e uma nova tabela para itens do painel. Isso mantem consistencia com o padrao atual do projeto.

---

### Fase 1: Banco de Dados (4 migracoes)

#### 1.1 Adicionar campos de especificacoes e garantia na tabela `products`

Novos campos para defaults do modelo de grua:

```
spec_tipo               TEXT        (ex: "Torre ascensional")
spec_vel_elevacao       TEXT        (ex: "MULT SPEED 2.5/58 m/min")
spec_vel_rotacao        TEXT        (ex: "0 - 0,9 rpm")
spec_vel_translacao     TEXT        (ex: "0 - 50 m/min")
default_panel_voltage   TEXT        (ex: "380")
default_panel_include_motors BOOLEAN DEFAULT false
default_motor_elev_kw   NUMERIC
default_motor_elev_hp   NUMERIC
default_motor_elev_vel  TEXT
default_motor_trans_kw  NUMERIC
default_motor_trans_hp  NUMERIC
default_motor_trans_vel TEXT
default_motor_rot_kw    NUMERIC
default_motor_rot_hp    NUMERIC
default_motor_rot_vel   TEXT
default_warranty_struct_years  INTEGER DEFAULT 3
default_warranty_paint_years   INTEGER DEFAULT 2
default_warranty_components_years INTEGER DEFAULT 1
```

#### 1.2 Adicionar campos de override na tabela `quotes`

```
spec_override_enabled     BOOLEAN DEFAULT false
spec_tipo                 TEXT
spec_vel_elevacao         TEXT
spec_vel_rotacao          TEXT
spec_vel_translacao       TEXT
panel_voltage             TEXT DEFAULT '380'
panel_include_motors      BOOLEAN DEFAULT false
panel_motor_elev_kw       NUMERIC
panel_motor_elev_hp       NUMERIC
panel_motor_elev_vel      TEXT
panel_motor_trans_kw      NUMERIC
panel_motor_trans_hp      NUMERIC
panel_motor_trans_vel     TEXT
panel_motor_rot_kw        NUMERIC
panel_motor_rot_hp        NUMERIC
panel_motor_rot_vel       TEXT
warranty_struct_years     INTEGER DEFAULT 3
warranty_paint_years      INTEGER DEFAULT 2
warranty_components_years INTEGER DEFAULT 1
```

#### 1.3 Criar tabela `quote_panel_items`

```
id              UUID PK DEFAULT gen_random_uuid()
quote_id        UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE
item_text       TEXT NOT NULL
order_index     INTEGER NOT NULL DEFAULT 0
created_at      TIMESTAMPTZ DEFAULT now()
```

RLS: mesma politica das `quote_items` (acesso via join com `quotes`).

#### 1.4 Criar tabela `default_panel_items`

Itens padrao vinculados ao produto (grua):

```
id              UUID PK DEFAULT gen_random_uuid()
product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE
item_text       TEXT NOT NULL
order_index     INTEGER NOT NULL DEFAULT 0
created_at      TIMESTAMPTZ DEFAULT now()
```

RLS: leitura para autenticados, escrita para admin.

Dados iniciais (seed) para todos os produtos grua existentes:
- Fim de curso para translacao e rotacao da grua
- Fim de curso de posicao alto e baixo do gancho
- Sistema de protecao dos motores atraves de inversor
- Sinalizacao audio e visual
- Anemometro
- Chave de destrava para posicao de giro livre (catavento)
- Limitador de carga
- Inversor de frequencia nos movimentos de elevacao, translacao e rotacao
- Projetada/construida conforme ABNT NBR 8400
- Painel eletrico anticorrosao

---

### Fase 2: UI - Nova Etapa no Wizard

#### 2.1 Atualizar o hook `useQuoteWizard`

Adicionar campos ao `QuoteWizardData`:

```typescript
// Escopo specs
spec_override_enabled: boolean;
spec_tipo: string;
spec_vel_elevacao: string;
spec_vel_rotacao: string;
spec_vel_translacao: string;

// Painel
panel_items: { text: string; order: number }[];
panel_voltage: string;
panel_include_motors: boolean;
panel_motor_elev_kw: number | null;
panel_motor_elev_hp: number | null;
panel_motor_elev_vel: string;
panel_motor_trans_kw: number | null;
panel_motor_trans_hp: number | null;
panel_motor_trans_vel: string;
panel_motor_rot_kw: number | null;
panel_motor_rot_hp: number | null;
panel_motor_rot_vel: string;

// Garantia
warranty_struct_years: number;
warranty_paint_years: number;
warranty_components_years: number;
```

Aumentar o wizard de 8 para 9 etapas, inserindo a nova etapa "Tecnico" como etapa 6 (antes de Comercial).

Nova ordem:
1. Cliente
2. Projeto
3. Equipamento
4. Componentes
5. Acessorios
6. **Tecnico / Escopo** (NOVO)
7. Comercial
8. Descontos
9. Revisao

#### 2.2 Criar componente `StepTechnical.tsx`

Nova etapa com 3 blocos em cards:

**Bloco 1 - Escopo do Fornecimento:**
- Toggle "Sobrescrever dados do modelo"
- Campos: Tipo, Velocidade de elevacao, Velocidade de rotacao, Velocidade de translacao
- Botao "Preencher com padrao do modelo" (busca dados do produto selecionado)
- Campos de lanca, torre, cargas ja existem na etapa 3 e serao reutilizados

**Bloco 2 - Itens do Painel:**
- Lista editavel (adicionar/remover/reordenar)
- Botao "Carregar itens padrao do modelo"
- Select de tensao (220V, 380V, 440V, Outro)
- Toggle "Incluir mini-tabela de motorredutores"
- Se ligado: campos de potencia kW/hp e velocidade para elevacao, translacao e rotacao

**Bloco 3 - Garantia:**
- 3 campos numericos (estrutural, pintura, componentes) com validacao 0-10
- Botao "Usar padrao do modelo"
- Texto informativo sobre renderizacao no PDF
- Se valor = 0: a linha correspondente sera ocultada no PDF

#### 2.3 Atualizar `QuoteWizard.tsx`

- Importar e renderizar `StepTechnical` na etapa 6
- Ajustar numeracao das etapas seguintes
- No `saveMutation`, persistir os novos campos na tabela `quotes`
- Persistir `quote_panel_items` (deletar e re-inserir, mesmo padrao de `quote_items`)
- Na carga de proposta existente (edicao/duplicacao), carregar os novos campos

#### 2.4 Atualizar `StepReview.tsx`

Adicionar secao de resumo mostrando:
- Especificacoes tecnicas configuradas
- Numero de itens do painel
- Prazos de garantia

---

### Fase 3: Geracao do PDF

#### 3.1 Atualizar Edge Function `generate-pdf`

**Buscar dados adicionais:**
- Carregar `quote_panel_items` da proposta
- Carregar dados default do produto grua (se override nao habilitado)
- Carregar `default_panel_items` do produto (se nao houver override)

**Logica de resolucao de dados (prioridade):**
1. Override da proposta (se campo preenchido)
2. Default do modelo/produto
3. Default global do sistema (hardcoded)

**Novas secoes HTML (inseridas apos itens/condicoes, antes da contracapa):**

**Secao "ESCOPO DO FORNECIMENTO: {MODELO}"**
- Tabela de 2 colunas com estilo corporativo SOIMA
- Header azul (#0047AB) com texto branco
- Zebra rows
- Campos: Tipo, Comprimento da lanca, Altura da torre, Altura de trabalho, Carga a ponta, Carga maxima, Velocidade de elevacao, Velocidade de rotacao, Velocidade de translacao
- Campos vazios sao omitidos
- Formatacao automatica de unidades (m, kg com separador de milhar, m/min, rpm)

**Secao "ITENS INTEGRANTES DO PAINEL"**
- Lista com bullets estilizados
- Item de tensao inserido automaticamente (ex: "Tensao de alimentacao: 380V")
- Mini-tabela de motorredutores (se habilitada e com dados):
  - Header azul, 2 colunas (Item / Especificacao)
  - Linhas: Motorredutor de elevacao, translacao, rotacao
  - Formato: "{kW} kW / {hp} HP - {vel}"

**Secao "GARANTIA"**
- Paragrafo introdutorio com texto padrao SOIMA
- Lista de bullets:
  - Certificado de garantia com prazos dinamicos
  - Entrega tecnica
  - Plano de manutencao
  - Normas/recomendacoes
- Frase automatica: "{X} anos no estrutural, {Y} anos na pintura e {Z} ano(s) nos componentes..."
- Tratamento de plural (1 ano / 2 anos)
- Se prazo = 0: linha omitida; se todos = 0: secao mostra "Garantia nao inclusa"

**CSS adicional:**
```css
.scope-table { width: 100%; border-collapse: collapse; }
.scope-table th { background: #0047AB; color: white; padding: 8px 12px; text-align: left; }
.scope-table td { padding: 6px 12px; border-bottom: 1px solid #e0e0e0; }
.scope-table tr:nth-child(even) { background: #f0f4fa; }
.scope-table .label-cell { font-weight: 600; color: #333; width: 45%; }

.panel-list { list-style: none; padding: 0; }
.panel-list li { padding: 4px 0 4px 20px; position: relative; font-size: 10px; }
.panel-list li::before { content: "\\2713"; position: absolute; left: 0; color: #0047AB; font-weight: bold; }

.warranty-section { page-break-inside: avoid; }
```

**Ordem final das secoes no PDF:**
1. Capa (full-bleed)
2. Dados do cliente + proposta
3. Especificacoes da grua (existente, mantido)
4. Itens da proposta + totais + condicoes
5. **ESCOPO DO FORNECIMENTO** (NOVO)
6. **ITENS INTEGRANTES DO PAINEL** (NOVO)
7. **GARANTIA** (NOVO)
8. Assinaturas + Footer
9. Contracapa (full-bleed)

#### 3.2 Compatibilidade retroativa

- Propostas antigas sem os novos campos geram PDF normalmente
- Secoes novas so aparecem se houver dados (do modelo ou override)
- Garantia usa defaults globais (3/2/1) se nenhum valor configurado

---

### Fase 4: Traducoes

Adicionar ao dicionario `translations` no generate-pdf:
- `scope_title`: "ESCOPO DO FORNECIMENTO" / "SUPPLY SCOPE"
- `panel_title`: "ITENS INTEGRANTES DO PAINEL" / "PANEL COMPONENTS"  
- `warranty_title`: "GARANTIA" / "WARRANTY"
- Labels de todos os campos tecnicos em PT-BR e EN

---

### Arquivos modificados

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/migrations/` | 4 migracoes (products, quotes, quote_panel_items, default_panel_items + seed) |
| `src/hooks/useQuoteWizard.ts` | Novos campos + 9 etapas |
| `src/components/quotes/steps/StepTechnical.tsx` | **NOVO** - Etapa tecnica |
| `src/components/quotes/QuoteWizard.tsx` | Renderizar StepTechnical, persistir dados |
| `src/components/quotes/steps/StepReview.tsx` | Resumo dos dados tecnicos |
| `supabase/functions/generate-pdf/index.ts` | 3 novas secoes HTML + CSS + traducoes |
| `src/integrations/supabase/types.ts` | Atualizado automaticamente |

---

### Estimativa de complexidade

- Banco de dados: 4 migracoes SQL
- UI: 1 componente novo + 3 componentes alterados
- PDF: ~200 linhas adicionais de HTML/CSS
- Total: mudanca significativa mas bem contida nos limites do padrao existente

