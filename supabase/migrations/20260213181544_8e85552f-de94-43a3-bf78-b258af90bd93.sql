
-- 1. webhook_configs (singleton for inbound webhook settings)
CREATE TABLE public.webhook_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active boolean NOT NULL DEFAULT true,
  secret_token text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view webhook configs"
  ON public.webhook_configs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update webhook configs"
  ON public.webhook_configs FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert webhook configs"
  ON public.webhook_configs FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Insert default singleton row
INSERT INTO public.webhook_configs (is_active, secret_token) VALUES (true, null);

-- Trigger for updated_at
CREATE TRIGGER update_webhook_configs_updated_at
  BEFORE UPDATE ON public.webhook_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. outbound_webhooks
CREATE TABLE public.outbound_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  target_url text NOT NULL,
  headers jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  retry_count integer NOT NULL DEFAULT 3,
  timeout_ms integer NOT NULL DEFAULT 5000,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.outbound_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access outbound webhooks"
  ON public.outbound_webhooks FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_outbound_webhooks_updated_at
  BEFORE UPDATE ON public.outbound_webhooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. webhook_logs
CREATE TABLE public.webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction text NOT NULL,
  event_type text,
  endpoint text,
  status text NOT NULL,
  http_status integer,
  payload jsonb,
  response jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view webhook logs"
  ON public.webhook_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- No INSERT policy for authenticated users; edge functions use service_role

-- 4. google_sheets_config (singleton)
CREATE TABLE public.google_sheets_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active boolean NOT NULL DEFAULT false,
  apps_script_url text,
  spreadsheet_id text,
  sheet_name text,
  trigger_on text NOT NULL DEFAULT 'created',
  trigger_stage_id uuid REFERENCES public.pipeline_stages(id),
  field_mapping jsonb NOT NULL DEFAULT '{"name":"contact_name","email":"contact_email","phone":"contact_phone","company":"company_name","source":"lead_origin","stage":"stage_name","created_at":"created_at"}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.google_sheets_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access google sheets config"
  ON public.google_sheets_config FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.google_sheets_config (is_active) VALUES (false);

CREATE TRIGGER update_google_sheets_config_updated_at
  BEFORE UPDATE ON public.google_sheets_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
