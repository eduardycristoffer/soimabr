
# Controle de Acesso (RBAC), Regras de CNPJ, Edicao de Propostas e Altura de Trabalho

## Resumo

Implementacao de controle de acesso granular para Operadores vs Admins, CNPJ obrigatorio e travado, sistema de solicitacao de acesso a clientes, edicao de propostas com versionamento e novo campo "Altura de Trabalho" na grua.

---

## 1. Alteracoes no Banco de Dados (Migrations)

### 1.1 Coluna `assigned_to` na tabela `clients`

Adicionar coluna `assigned_to UUID` para controlar qual operador tem acesso a um cliente alem do criador. Inicialmente, `assigned_to = created_by` para clientes existentes.

```text
ALTER TABLE public.clients ADD COLUMN assigned_to UUID;
UPDATE public.clients SET assigned_to = created_by WHERE assigned_to IS NULL;
```

### 1.2 Coluna `cnpj_digits` na tabela `clients`

Campo computado (somente digitos) para garantir unicidade de CNPJ:

```text
ALTER TABLE public.clients ADD COLUMN cnpj_digits TEXT;
CREATE UNIQUE INDEX idx_clients_cnpj_digits_unique 
  ON public.clients (cnpj_digits) 
  WHERE cnpj_digits IS NOT NULL AND cnpj_digits != '' AND is_active = true;

-- Preencher existentes
UPDATE public.clients 
  SET cnpj_digits = regexp_replace(cnpj, '[^0-9]', '', 'g') 
  WHERE cnpj IS NOT NULL AND cnpj != '';
```

### 1.3 Trigger para travar CNPJ apos criacao

```text
CREATE OR REPLACE FUNCTION public.prevent_cnpj_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.cnpj_digits IS NOT NULL AND OLD.cnpj_digits != '' 
     AND NEW.cnpj_digits IS DISTINCT FROM OLD.cnpj_digits THEN
    RAISE EXCEPTION 'CNPJ nao pode ser alterado apos criacao do cliente';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_cnpj_change
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.prevent_cnpj_change();
```

### 1.4 Tabela `client_access_requests` (solicitacoes de acesso)

```text
CREATE TYPE public.access_request_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.client_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL,
  cnpj_digits TEXT NOT NULL,
  reason TEXT,
  status access_request_status NOT NULL DEFAULT 'pending',
  decided_by UUID,
  decided_at TIMESTAMPTZ,
  decision_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_access_requests ENABLE ROW LEVEL SECURITY;

-- Operador cria suas solicitacoes
CREATE POLICY "Users can create own access requests"
  ON public.client_access_requests FOR INSERT
  WITH CHECK (requester_id = auth.uid());

-- Operador ve suas solicitacoes, Admin ve todas
CREATE POLICY "Users can view access requests"
  ON public.client_access_requests FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR requester_id = auth.uid());

-- Admin atualiza (aprovar/rejeitar)
CREATE POLICY "Admins can update access requests"
  ON public.client_access_requests FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));
```

### 1.5 Tabela `quote_versions` (versionamento de propostas)

```text
CREATE TABLE public.quote_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.quotes(id),
  version_number INTEGER NOT NULL DEFAULT 1,
  snapshot JSONB NOT NULL,
  edited_by UUID NOT NULL,
  edited_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view quote versions"
  ON public.quote_versions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM quotes 
    WHERE quotes.id = quote_versions.quote_id 
    AND (has_role(auth.uid(), 'admin') OR quotes.created_by = auth.uid())
  ));

CREATE POLICY "Users can create quote versions"
  ON public.quote_versions FOR INSERT
  WITH CHECK (edited_by = auth.uid());
```

### 1.6 Coluna `grua_altura_trabalho_m` na tabela `quotes`

```text
ALTER TABLE public.quotes ADD COLUMN grua_altura_trabalho_m NUMERIC;
```

### 1.7 Atualizar RLS de `clients` (visibilidade por operador)

Substituir a politica atual `Authenticated users can view all clients` por uma que restringe operadores:

```text
DROP POLICY "Authenticated users can view all clients" ON public.clients;

CREATE POLICY "Users can view accessible clients"
  ON public.clients FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') 
    OR created_by = auth.uid() 
    OR assigned_to = auth.uid()
  );
```

### 1.8 Atualizar trigger `prevent_finalized_quote_edit`

Relaxar a trigger para permitir edicao de propostas em status `draft` (o bloqueio de finalizadas continua):

- Propostas `draft` podem ser editadas normalmente
- Propostas `finalized` continuam bloqueadas (exceto campos especificos como PDF/desconto)

---

## 2. Alteracoes no Frontend

### 2.1 Cadastro de Cliente (`ClientFormModal.tsx`)

- Tornar CNPJ **obrigatorio** no schema de validacao para clientes nacionais
- Na mutation de criacao: salvar `cnpj_digits` (somente digitos) junto com `cnpj` formatado
- Definir `assigned_to = user.id` na criacao
- Na edicao: **desabilitar** o campo CNPJ (readonly + tooltip "CNPJ nao pode ser alterado")
- Na mutation: verificar erro de unicidade do CNPJ e exibir modal de "Solicitar acesso" quando o CNPJ ja existe mas nao pertence ao operador

### 2.2 Lista de Clientes (`Clientes.tsx`)

- **Operador**: A RLS ja filtra automaticamente. Remover qualquer filtro manual.
- **Admin**: Adicionar colunas "Cadastrado por" e "Atribuido a" na tabela. Buscar nomes via join com `profiles`.
- Admin pode clicar para reatribuir um cliente a outro operador (dropdown simples)

### 2.3 Tela de Solicitacoes de Acesso (nova pagina `SolicitacoesAcesso.tsx`)

- Adicionar item "Solicitacoes" no Sidebar (visivel para Admin, com badge de pendentes)
- Pagina semelhante a `Aprovacoes.tsx`: lista de solicitacoes pendentes com botoes Aprovar/Rejeitar
- Ao aprovar: atualizar `clients.assigned_to = requester_id` para o cliente com aquele CNPJ

### 2.4 Modal "Solicitar Acesso" (novo componente)

- Exibido quando operador tenta cadastrar cliente com CNPJ existente
- Mostra apenas: "CNPJ ja cadastrado e nao atribuido a voce."
- Campo opcional de motivo
- Botao "Solicitar acesso ao administrador"

### 2.5 Wizard de Proposta - Step Cliente (`StepClient.tsx`)

- A query de clientes ja sera filtrada pela RLS (operador so ve os seus)
- Nenhuma mudanca estrutural necessaria; a seguranca e no backend

### 2.6 Wizard de Proposta - Step Equipamento (`StepEquipment.tsx`)

- Adicionar campo "Altura de Trabalho (m)" no card de especificacoes tecnicas

### 2.7 Hook `useQuoteWizard.ts`

- Adicionar `grua_altura_trabalho_m: number | null` ao `QuoteWizardData`
- Incluir no `INITIAL_DATA`

### 2.8 Edicao de Proposta (`QuoteWizard.tsx` e `Orcamentos.tsx`)

- Na lista de propostas: adicionar botao "Editar" (apenas para propostas `draft`)
- Ao clicar em Editar: carregar os dados da proposta no wizard (pre-preencher todos os steps)
- Antes de salvar a edicao: criar um registro em `quote_versions` com snapshot JSON da versao anterior
- Usar UPDATE ao inves de INSERT quando editando

### 2.9 Revisao da Proposta (`StepReview.tsx`)

- Mostrar campo "Altura de Trabalho" quando preenchido

### 2.10 Sidebar (`Sidebar.tsx`)

- Adicionar link "Solicitacoes" para Admin

---

## 3. Edge Function `generate-pdf`

- Adicionar "Altura de Trabalho" no bloco de especificacoes tecnicas do HTML:
  ```text
  ${quote.grua_altura_trabalho_m ? `<div><span class="label">Altura de Trabalho:</span> 
    <span class="value">${quote.grua_altura_trabalho_m} m</span></div>` : ""}
  ```

---

## 4. Salvamento da Proposta (`QuoteWizard.tsx`)

- Incluir `grua_altura_trabalho_m` no INSERT/UPDATE da proposta
- Na edicao: antes do UPDATE, buscar a versao atual e salvar em `quote_versions`
- Gerar `quote_number` apenas para propostas novas (na edicao manter o numero existente)

---

## 5. Seguranca Backend (RLS)

Todas as regras estao implementadas via RLS no banco:

- Clientes: operador so ve `created_by = uid OR assigned_to = uid`; admin ve todos
- Propostas: ja tem RLS por `created_by`; admin ve todas
- Solicitacoes de acesso: operador ve as suas; admin ve todas e pode atualizar
- Versoes de proposta: segue a mesma regra da proposta pai
- Trigger impede alteracao de CNPJ
- Unique index impede CNPJ duplicado (apenas entre clientes ativos)

---

## Arquivos Modificados/Criados

| Arquivo | Acao |
|---------|------|
| Migration SQL | Criar tabelas, colunas, triggers, RLS |
| `src/hooks/useQuoteWizard.ts` | Adicionar `grua_altura_trabalho_m` |
| `src/components/quotes/steps/StepEquipment.tsx` | Campo Altura de Trabalho |
| `src/components/quotes/steps/StepReview.tsx` | Exibir Altura de Trabalho |
| `src/components/quotes/QuoteWizard.tsx` | Logica de edicao + salvar versao + `grua_altura_trabalho_m` |
| `src/pages/Orcamentos.tsx` | Botao Editar + carregar proposta no wizard |
| `src/components/clients/ClientFormModal.tsx` | CNPJ obrigatorio, travado na edicao, `cnpj_digits`, `assigned_to`, deteccao duplicata |
| `src/pages/Clientes.tsx` | Colunas admin (created_by, assigned_to), reatribuicao |
| `src/components/clients/ClientAccessRequestModal.tsx` | **Novo** - modal solicitar acesso |
| `src/pages/SolicitacoesAcesso.tsx` | **Novo** - fila de solicitacoes para admin |
| `src/components/layout/Sidebar.tsx` | Link Solicitacoes |
| `src/App.tsx` | Rota `/solicitacoes-acesso` |
| `supabase/functions/generate-pdf/index.ts` | Altura de Trabalho no PDF |
| `src/lib/validators.ts` | Sem alteracao (ja tem validacao CNPJ) |
