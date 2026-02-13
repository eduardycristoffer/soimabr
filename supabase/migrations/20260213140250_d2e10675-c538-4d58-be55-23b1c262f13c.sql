
-- 1.1 Add assigned_to column to clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS assigned_to UUID;
UPDATE public.clients SET assigned_to = created_by WHERE assigned_to IS NULL;

-- 1.2 Add cnpj_digits column for uniqueness
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cnpj_digits TEXT;
UPDATE public.clients 
  SET cnpj_digits = regexp_replace(cnpj, '[^0-9]', '', 'g') 
  WHERE cnpj IS NOT NULL AND cnpj != '' AND cnpj_digits IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_cnpj_digits_unique 
  ON public.clients (cnpj_digits) 
  WHERE cnpj_digits IS NOT NULL AND cnpj_digits != '' AND is_active = true;

-- 1.3 Trigger to prevent CNPJ changes
CREATE OR REPLACE FUNCTION public.prevent_cnpj_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.cnpj_digits IS NOT NULL AND OLD.cnpj_digits != '' 
     AND NEW.cnpj_digits IS DISTINCT FROM OLD.cnpj_digits THEN
    RAISE EXCEPTION 'CNPJ não pode ser alterado após criação do cliente';
  END IF;
  IF OLD.cnpj IS NOT NULL AND OLD.cnpj != '' 
     AND NEW.cnpj IS DISTINCT FROM OLD.cnpj THEN
    RAISE EXCEPTION 'CNPJ não pode ser alterado após criação do cliente';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_prevent_cnpj_change
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.prevent_cnpj_change();

-- 1.4 Client access requests table
DO $$ BEGIN
  CREATE TYPE public.access_request_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.client_access_requests (
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

CREATE POLICY "Users can create own access requests"
  ON public.client_access_requests FOR INSERT
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Users can view access requests"
  ON public.client_access_requests FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR requester_id = auth.uid());

CREATE POLICY "Admins can update access requests"
  ON public.client_access_requests FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 1.5 Quote versions table
CREATE TABLE IF NOT EXISTS public.quote_versions (
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
    AND (has_role(auth.uid(), 'admin'::app_role) OR quotes.created_by = auth.uid())
  ));

CREATE POLICY "Users can create quote versions"
  ON public.quote_versions FOR INSERT
  WITH CHECK (edited_by = auth.uid());

-- 1.6 Add grua_altura_trabalho_m to quotes
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS grua_altura_trabalho_m NUMERIC;

-- 1.7 Update clients RLS for operator visibility
DROP POLICY IF EXISTS "Authenticated users can view all clients" ON public.clients;

CREATE POLICY "Users can view accessible clients"
  ON public.clients FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR created_by = auth.uid() 
    OR assigned_to = auth.uid()
  );
