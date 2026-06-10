
-- Fix infinite recursion between quotes <-> quote_shares policies

-- 1) quotes SELECT uses SECURITY DEFINER function (bypasses RLS)
DROP POLICY IF EXISTS "Users can view quotes" ON public.quotes;
CREATE POLICY "Users can view quotes"
ON public.quotes
FOR SELECT
USING (public.can_view_quote(id, auth.uid()));

-- 2) quote_shares policies must not reference quotes table directly.
-- Create a SECURITY DEFINER helper to check ownership without RLS recursion.
CREATE OR REPLACE FUNCTION public.is_quote_owner(_quote_id uuid, _user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = _quote_id AND q.created_by = _user
  )
$$;

DROP POLICY IF EXISTS "Quote owner can create shares" ON public.quote_shares;
DROP POLICY IF EXISTS "Quote owner or admin can delete shares" ON public.quote_shares;
DROP POLICY IF EXISTS "View shares of own quotes or shared with me" ON public.quote_shares;

CREATE POLICY "Quote owner can create shares"
ON public.quote_shares
FOR INSERT
WITH CHECK (
  granted_by = auth.uid()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_quote_owner(quote_id, auth.uid())
  )
);

CREATE POLICY "Quote owner or admin can delete shares"
ON public.quote_shares
FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR granted_by = auth.uid()
  OR public.is_quote_owner(quote_id, auth.uid())
);

CREATE POLICY "View shares of own quotes or shared with me"
ON public.quote_shares
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR granted_by = auth.uid()
  OR shared_with_user_id = auth.uid()
  OR public.is_quote_owner(quote_id, auth.uid())
);
