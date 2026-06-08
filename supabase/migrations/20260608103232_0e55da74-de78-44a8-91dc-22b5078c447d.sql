
-- 1) Quote shares (individual)
CREATE TABLE public.quote_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  shared_with_user_id uuid NOT NULL,
  granted_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(quote_id, shared_with_user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_shares TO authenticated;
GRANT ALL ON public.quote_shares TO service_role;
ALTER TABLE public.quote_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View shares of own quotes or shared with me"
  ON public.quote_shares FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR granted_by = auth.uid()
    OR shared_with_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_id AND q.created_by = auth.uid())
  );

CREATE POLICY "Quote owner can create shares"
  ON public.quote_shares FOR INSERT TO authenticated
  WITH CHECK (
    granted_by = auth.uid()
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_id AND q.created_by = auth.uid())
    )
  );

CREATE POLICY "Quote owner or admin can delete shares"
  ON public.quote_shares FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR granted_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_id AND q.created_by = auth.uid())
  );

-- 2) User quote access (global per-owner)
CREATE TABLE public.user_quote_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  viewer_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id, viewer_id),
  CHECK (owner_id <> viewer_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_quote_access TO authenticated;
GRANT ALL ON public.user_quote_access TO service_role;
ALTER TABLE public.user_quote_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View access I granted or that I received"
  ON public.user_quote_access FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR owner_id = auth.uid()
    OR viewer_id = auth.uid()
  );

CREATE POLICY "Owner grants access"
  ON public.user_quote_access FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owner revokes access"
  ON public.user_quote_access FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- 3) Helper function
CREATE OR REPLACE FUNCTION public.can_view_quote(_quote_id uuid, _user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user, 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = _quote_id
        AND (
          q.created_by = _user
          OR EXISTS (
            SELECT 1 FROM public.quote_shares s
            WHERE s.quote_id = q.id AND s.shared_with_user_id = _user
          )
          OR EXISTS (
            SELECT 1 FROM public.user_quote_access a
            WHERE a.owner_id = q.created_by AND a.viewer_id = _user
          )
        )
    )
$$;

-- 4) Update quotes SELECT policy
DROP POLICY IF EXISTS "Users can view quotes" ON public.quotes;
CREATE POLICY "Users can view quotes"
  ON public.quotes FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.quote_shares s
      WHERE s.quote_id = quotes.id AND s.shared_with_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_quote_access a
      WHERE a.owner_id = quotes.created_by AND a.viewer_id = auth.uid()
    )
  );

-- 5) Update quote_items SELECT policy to follow access
DROP POLICY IF EXISTS "Users can view quote items" ON public.quote_items;
DROP POLICY IF EXISTS "Users can view items of own quotes" ON public.quote_items;
CREATE POLICY "Users can view quote items"
  ON public.quote_items FOR SELECT TO authenticated
  USING (public.can_view_quote(quote_id, auth.uid()));

-- 6) Default panel potencia total field
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS default_panel_potencia_total numeric;
