-- ============================================
-- SOIMA CRM - Schema Completo
-- ============================================

-- 1. Criar enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'operator');

-- 2. Criar enum para status de cliente
CREATE TYPE public.client_type AS ENUM ('nacional', 'internacional');

-- 3. Criar enum para status de orçamento
CREATE TYPE public.quote_status AS ENUM ('draft', 'finalized', 'cancelled');

-- 4. Criar enum para moeda
CREATE TYPE public.currency AS ENUM ('BRL', 'USD', 'EUR');

-- 5. Criar enum para categoria de produto
CREATE TYPE public.product_category AS ENUM ('grua', 'configuracao', 'torre', 'tramo', 'chassis', 'acessorio');

-- ============================================
-- TABELA: user_roles (roles separados para segurança)
-- ============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'operator',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- FUNÇÃO: has_role (security definer para evitar recursão RLS)
-- ============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- ============================================
-- TABELA: profiles
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TABELA: clients
-- ============================================
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_type client_type NOT NULL DEFAULT 'nacional',
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT,
  cpf TEXT,
  inscricao_estadual TEXT,
  tax_id TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  pais TEXT NOT NULL DEFAULT 'Brasil',
  telefone TEXT,
  email TEXT,
  contato_nome TEXT,
  contato_telefone TEXT,
  contato_email TEXT,
  observacoes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TABELA: products
-- ============================================
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  categoria product_category NOT NULL,
  preco DECIMAL(15, 2) NOT NULL DEFAULT 0,
  unidade TEXT NOT NULL DEFAULT 'UN',
  is_active BOOLEAN NOT NULL DEFAULT true,
  needs_review BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TABELA: discount_rules
-- ============================================
CREATE TABLE public.discount_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  max_discount_percent DECIMAL(5, 2) NOT NULL,
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.discount_rules ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TABELA: pipeline_stages
-- ============================================
CREATE TABLE public.pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  is_final BOOLEAN NOT NULL DEFAULT false,
  is_lost BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TABELA: leads
-- ============================================
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  stage_id UUID REFERENCES public.pipeline_stages(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  company_name TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  estimated_value DECIMAL(15, 2),
  notes TEXT,
  expected_close_date DATE,
  is_converted BOOLEAN NOT NULL DEFAULT false,
  converted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TABELA: lead_histories
-- ============================================
CREATE TABLE public.lead_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  from_stage_id UUID REFERENCES public.pipeline_stages(id) ON DELETE SET NULL,
  to_stage_id UUID REFERENCES public.pipeline_stages(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_histories ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TABELA: quotes
-- ============================================
CREATE TABLE public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  status quote_status NOT NULL DEFAULT 'draft',
  
  -- Dados do projeto
  project_name TEXT,
  project_location TEXT,
  
  -- Condições comerciais
  currency currency NOT NULL DEFAULT 'BRL',
  payment_terms TEXT,
  delivery_time TEXT,
  freight_terms TEXT,
  validity_days INTEGER NOT NULL DEFAULT 30,
  
  -- Valores
  subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
  discount_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
  discount_value DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total DECIMAL(15, 2) NOT NULL DEFAULT 0,
  
  -- Aprovação de desconto
  discount_approved BOOLEAN NOT NULL DEFAULT false,
  discount_approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  discount_approved_at TIMESTAMP WITH TIME ZONE,
  
  -- PDF
  pdf_hash TEXT,
  pdf_generated_at TIMESTAMP WITH TIME ZONE,
  
  notes TEXT,
  finalized_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TABELA: quote_items
-- ============================================
CREATE TABLE public.quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_code TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_category product_category NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(15, 2) NOT NULL,
  total_price DECIMAL(15, 2) NOT NULL,
  notes TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TABELA: audit_logs
-- ============================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS RLS
-- ============================================

-- user_roles: apenas admins podem ver/modificar
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- profiles: usuários veem próprio perfil, admins veem todos
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- clients: operadores veem seus clientes, admins veem todos
CREATE POLICY "Users can view clients"
  ON public.clients FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR created_by = auth.uid());

CREATE POLICY "Users can create clients"
  ON public.clients FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own clients"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR created_by = auth.uid());

CREATE POLICY "Admins can delete clients"
  ON public.clients FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- products: todos podem ver, apenas admins modificam
CREATE POLICY "Everyone can view products"
  ON public.products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage products"
  ON public.products FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- discount_rules: todos podem ver, apenas admins modificam
CREATE POLICY "Everyone can view discount rules"
  ON public.discount_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage discount rules"
  ON public.discount_rules FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- pipeline_stages: todos podem ver, apenas admins modificam
CREATE POLICY "Everyone can view pipeline stages"
  ON public.pipeline_stages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage pipeline stages"
  ON public.pipeline_stages FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- leads: operadores veem seus leads, admins veem todos
CREATE POLICY "Users can view leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR owner_id = auth.uid());

CREATE POLICY "Users can create leads"
  ON public.leads FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own leads"
  ON public.leads FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR owner_id = auth.uid());

CREATE POLICY "Admins can delete leads"
  ON public.leads FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- lead_histories: segue acesso do lead
CREATE POLICY "Users can view lead histories"
  ON public.lead_histories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.leads
      WHERE leads.id = lead_histories.lead_id
      AND (public.has_role(auth.uid(), 'admin') OR leads.owner_id = auth.uid())
    )
  );

CREATE POLICY "Users can create lead histories"
  ON public.lead_histories FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- quotes: operadores veem seus orçamentos, admins veem todos
CREATE POLICY "Users can view quotes"
  ON public.quotes FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR created_by = auth.uid());

CREATE POLICY "Users can create quotes"
  ON public.quotes FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own quotes"
  ON public.quotes FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR created_by = auth.uid());

CREATE POLICY "Admins can delete quotes"
  ON public.quotes FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- quote_items: segue acesso do quote
CREATE POLICY "Users can view quote items"
  ON public.quote_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes
      WHERE quotes.id = quote_items.quote_id
      AND (public.has_role(auth.uid(), 'admin') OR quotes.created_by = auth.uid())
    )
  );

CREATE POLICY "Users can manage own quote items"
  ON public.quote_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes
      WHERE quotes.id = quote_items.quote_id
      AND (public.has_role(auth.uid(), 'admin') OR quotes.created_by = auth.uid())
    )
  );

-- audit_logs: apenas admins podem ver
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can create audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- TRIGGERS para updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- TRIGGER para criar profile automaticamente
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- FUNÇÃO: gerar número do orçamento
-- ============================================
CREATE OR REPLACE FUNCTION public.generate_quote_number()
RETURNS TRIGGER AS $$
DECLARE
  year_suffix TEXT;
  sequence_num INTEGER;
BEGIN
  year_suffix := to_char(now(), 'YY');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(quote_number FROM 4 FOR 4) AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM public.quotes
  WHERE quote_number LIKE 'ORC' || year_suffix || '%';
  
  NEW.quote_number := 'ORC' || year_suffix || LPAD(sequence_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER generate_quote_number_trigger
  BEFORE INSERT ON public.quotes
  FOR EACH ROW
  WHEN (NEW.quote_number IS NULL OR NEW.quote_number = '')
  EXECUTE FUNCTION public.generate_quote_number();