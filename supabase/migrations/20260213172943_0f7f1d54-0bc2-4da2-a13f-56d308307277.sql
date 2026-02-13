
-- Allow users to delete their own quote_versions (for draft quote cleanup)
CREATE POLICY "Users can delete own quote versions"
ON public.quote_versions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM quotes
    WHERE quotes.id = quote_versions.quote_id
      AND (has_role(auth.uid(), 'admin'::app_role) OR quotes.created_by = auth.uid())
      AND quotes.status = 'draft'
  )
);

-- Allow users to delete their own discount_approval_requests (for draft quote cleanup)
CREATE POLICY "Users can delete own discount approval requests"
ON public.discount_approval_requests
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM quotes
    WHERE quotes.id = discount_approval_requests.quote_id
      AND (has_role(auth.uid(), 'admin'::app_role) OR quotes.created_by = auth.uid())
      AND quotes.status = 'draft'
  )
);

-- Allow users to delete their own draft quotes (not just admins)
CREATE POLICY "Users can delete own draft quotes"
ON public.quotes
FOR DELETE
USING (
  created_by = auth.uid() AND status = 'draft'
);
