
# Especificacoes Tecnicas da Grua, Descricao Tecnica e PDF Profissional

## Resumo
Implementar 7 mudancas principais: (1) campo de descricao tecnica no produto com toggle para PDF, (2) campos variaveis de especificacoes tecnicas da grua por proposta, (3) bloco "Partes Consideradas para a Cotacao" no PDF, (4) dados institucionais da empresa vindos de configuracao, (5) layout profissional do PDF, (6) tabela de configuracoes da empresa, (7) tela de configuracao para admin.

---

## 1. Migration SQL - Banco de Dados

### 1a. Novos campos na tabela `products`
```text
ALTER TABLE public.products
  ADD COLUMN descricao_tecnica text,
  ADD COLUMN show_tech_desc_pdf boolean NOT NULL DEFAULT false;
```

### 1b. Novos campos na tabela `quotes` (especificacoes tecnicas da grua por proposta)
```text
ALTER TABLE public.quotes
  ADD COLUMN grua_lanca_m numeric,
  ADD COLUMN grua_altura_torre_m numeric,
  ADD COLUMN grua_carga_maxima_kg numeric,
  ADD COLUMN grua_carga_ponta_kg numeric;
```

### 1c. Nova tabela `company_settings` (dados institucionais)
```text
CREATE TABLE public.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT 'SOIMA Brasil',
  razao_social text NOT NULL DEFAULT 'SOIMA Brasil Equipamentos Ltda',
  cnpj text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  website text DEFAULT '',
  address text DEFAULT '',
  logo_url text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view company settings"
  ON public.company_settings FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage company settings"
  ON public.company_settings FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Inserir registro padrao
INSERT INTO public.company_settings (company_name, razao_social, cnpj, phone, email, website, address)
VALUES (
  'SOIMA Brasil',
  'SOIMA Brasil Equipamentos para Construcao Civil Ltda',
  '',
  '',
  '',
  'www.soimabrasil.com.br',
  ''
);
```

---

## 2. Cadastro de Produto - `ProductFormModal.tsx`

- Adicionar campo `descricao_tecnica` (Textarea, max 5000 chars, opcional)
- Adicionar checkbox `show_tech_desc_pdf` ("Exibir descricao tecnica no PDF da proposta?")
- Ampliar o modal para `max-w-lg`
- Atualizar schema zod e payload de insert/update
- Somente admin pode editar (ja controlado por RLS)

---

## 3. Especificacoes Tecnicas da Grua no Wizard

### 3a. `useQuoteWizard.ts`
Adicionar ao `QuoteWizardData`:
```text
grua_lanca_m: number | null
grua_altura_torre_m: number | null
grua_carga_maxima_kg: number | null
grua_carga_ponta_kg: number | null
```

### 3b. `StepEquipment.tsx`
Apos o ProductPicker de grua, adicionar secao "Especificacoes Tecnicas da Grua" com 4 campos numericos:
- Lanca (m)
- Altura da torre (m)
- Carga maxima (kg)
- Carga na ponta (kg)

Esses campos so aparecem quando pelo menos uma grua esta selecionada.

### 3c. `QuoteWizard.tsx`
Ao salvar a proposta, incluir os 4 campos na insert do quote:
```text
grua_lanca_m, grua_altura_torre_m, grua_carga_maxima_kg, grua_carga_ponta_kg
```

---

## 4. PDF - Edge Function `generate-pdf/index.ts`

### 4a. Buscar dados da empresa
Antes de gerar o HTML, buscar `company_settings` (primeiro registro).

### 4b. Cabecalho com dados da empresa
Substituir texto hardcoded "SOIMA BRASIL" pelos dados dinamicos:
- Logo (se `logo_url` existir)
- Nome da empresa
- Telefone, email, site

### 4c. Bloco "PARTES CONSIDERADAS PARA A COTACAO"
Apos secao de Projeto e antes dos Itens, se a proposta tiver dados de grua (`grua_lanca_m` etc.), renderizar:
```text
PARTES CONSIDERADAS PARA A COTACAO
- [Nome da grua do item]
- Lanca: XX m
- Altura da torre: XX m
- Carga Maxima: XXXX kg
- Carga na ponta: XXXX kg
```

### 4d. Descricao tecnica condicional
Para cada item, buscar o produto original. Se `show_tech_desc_pdf = true` e `descricao_tecnica` existir, exibir abaixo do nome do produto no PDF.

### 4e. Rodape institucional
Substituir rodape hardcoded por dados de `company_settings`:
- Razao social
- CNPJ
- Endereco completo

### 4f. Buscar produtos para descricao tecnica
A Edge Function ja tem acesso ao `product_id` de cada item. Fazer um select nos products para trazer `descricao_tecnica` e `show_tech_desc_pdf`.

---

## 5. Pagina de Configuracoes da Empresa (nova)

### 5a. `src/pages/ConfiguracaoEmpresa.tsx`
Formulario admin-only para editar:
- Nome da empresa
- Razao social
- CNPJ
- Telefone
- Email
- Website
- Endereco completo

### 5b. Rota e menu
- Adicionar rota `/configuracao-empresa` no `App.tsx`
- Adicionar item "Empresa" no `Sidebar.tsx` com `adminOnly: true` e icone `Building2`

---

## 6. StepReview.tsx
Adicionar exibicao das especificacoes tecnicas da grua (quando preenchidas) no card de revisao.

---

## Arquivos alterados

| Arquivo | Mudanca |
|---------|---------|
| Migration SQL | 3 alteracoes (products, quotes, company_settings) |
| `src/components/products/ProductFormModal.tsx` | Campos descricao_tecnica e toggle |
| `src/hooks/useQuoteWizard.ts` | 4 novos campos de grua |
| `src/components/quotes/steps/StepEquipment.tsx` | Secao especificacoes tecnicas |
| `src/components/quotes/QuoteWizard.tsx` | Salvar campos grua no quote |
| `src/components/quotes/steps/StepReview.tsx` | Mostrar specs da grua |
| `supabase/functions/generate-pdf/index.ts` | Cabecalho, bloco tecnico, rodape, descricao condicional |
| `src/pages/ConfiguracaoEmpresa.tsx` (novo) | Tela de config da empresa |
| `src/components/layout/Sidebar.tsx` | Menu "Empresa" |
| `src/App.tsx` | Rota /configuracao-empresa |
| `src/pages/Produtos.tsx` | Coluna descricao tecnica na tabela (opcional) |

Tel: (62) 3314 2227
geral@soimabrasil.com.br
www.soimabrasil.com.br

Reg. Crea 19815/RF

Soíma Brasil - Ind. e Com. de Equi. p/ Const. Ltda

Vp-2D, QD 04 - MOD. 17 - DAIA, Anápolis - GO, 75132-045

CNPJ: 17.007.780/0001/02
