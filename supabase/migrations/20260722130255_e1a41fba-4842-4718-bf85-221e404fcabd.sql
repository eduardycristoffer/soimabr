DROP POLICY IF EXISTS "Users can view quotes" ON public.quotes;

CREATE POLICY "Users can view quotes"
ON public.quotes
FOR SELECT
TO public
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.quote_shares s
    WHERE s.quote_id = quotes.id
      AND s.shared_with_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.user_quote_access a
    WHERE a.owner_id = quotes.created_by
      AND a.viewer_id = auth.uid()
  )
);