
-- 1. Create email_verification_tokens table
CREATE TABLE public.email_verification_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  used_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- No direct client access - only service_role via edge functions

-- 2. Create security_logs table
CREATE TABLE public.security_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  action text NOT NULL,
  ip_address text NULL,
  user_agent text NULL,
  metadata jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view security logs"
  ON public.security_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Restrict public SELECT policies to authenticated users only
DROP POLICY IF EXISTS "Everyone can view products" ON public.products;
CREATE POLICY "Authenticated users can view products"
  ON public.products
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Everyone can view pipeline stages" ON public.pipeline_stages;
CREATE POLICY "Authenticated users can view pipeline stages"
  ON public.pipeline_stages
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Everyone can view company settings" ON public.company_settings;
CREATE POLICY "Authenticated users can view company settings"
  ON public.company_settings
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Everyone can view discount rules" ON public.discount_rules;
CREATE POLICY "Authenticated users can view discount rules"
  ON public.discount_rules
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
