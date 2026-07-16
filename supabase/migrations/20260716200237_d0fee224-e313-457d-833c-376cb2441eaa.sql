
-- Storage policies para bucket 'contracts'
-- Convenção de path: contracts/{contract_id}/{filename}

CREATE POLICY "Users can view own contract files" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'contracts'
  AND EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND (public.can_view_quote(c.quote_id, auth.uid()) OR c.created_by = auth.uid())
  )
);

CREATE POLICY "Users can upload contract files" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'contracts'
  AND EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND (c.created_by = auth.uid() OR public.has_role(auth.uid(),'admin'))
  )
);

CREATE POLICY "Users can update own contract files" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'contracts'
  AND EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND (c.created_by = auth.uid() OR public.has_role(auth.uid(),'admin'))
  )
);

CREATE POLICY "Users can delete own contract files" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'contracts'
  AND EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND (c.created_by = auth.uid() OR public.has_role(auth.uid(),'admin'))
  )
);
