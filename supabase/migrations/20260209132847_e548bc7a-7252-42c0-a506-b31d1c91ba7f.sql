
-- 1. Create enum for approval status
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');

-- 2. Create discount_approval_requests table
CREATE TABLE public.discount_approval_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  discount_percent NUMERIC NOT NULL,
  justification TEXT NOT NULL,
  status public.approval_status NOT NULL DEFAULT 'pending',
  decided_by UUID,
  decided_at TIMESTAMPTZ,
  decision_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.discount_approval_requests ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Operators can create their own requests
CREATE POLICY "Users can create own approval requests"
ON public.discount_approval_requests
FOR INSERT
WITH CHECK (requested_by = auth.uid());

-- Users can view their own requests, admins can view all
CREATE POLICY "Users can view own or admin sees all"
ON public.discount_approval_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR requested_by = auth.uid());

-- Only admins can update (approve/reject)
CREATE POLICY "Admins can update approval requests"
ON public.discount_approval_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. Trigger to prevent editing finalized quotes (except pdf/discount_approved fields)
CREATE OR REPLACE FUNCTION public.prevent_finalized_quote_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status = 'finalized' THEN
    -- Allow only specific field updates on finalized quotes
    IF NEW.status = OLD.status
       AND NEW.pdf_generated_at IS DISTINCT FROM OLD.pdf_generated_at
       OR NEW.pdf_hash IS DISTINCT FROM OLD.pdf_hash
       OR NEW.discount_approved IS DISTINCT FROM OLD.discount_approved
       OR NEW.discount_approved_by IS DISTINCT FROM OLD.discount_approved_by
       OR NEW.discount_approved_at IS DISTINCT FROM OLD.discount_approved_at
    THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Orçamento finalizado não pode ser editado';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_finalized_quote_edit_trigger
BEFORE UPDATE ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.prevent_finalized_quote_edit();

-- 6. Add audit trigger to discount_approval_requests
CREATE TRIGGER audit_discount_approval_requests
AFTER INSERT OR UPDATE OR DELETE ON public.discount_approval_requests
FOR EACH ROW
EXECUTE FUNCTION public.audit_trigger_func();

-- 7. Add realtime for approval requests so operators see updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.discount_approval_requests;
