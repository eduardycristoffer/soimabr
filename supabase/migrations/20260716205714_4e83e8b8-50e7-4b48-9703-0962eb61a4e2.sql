
CREATE TABLE public.cnpj_lookup_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj text NOT NULL,
  status text NOT NULL CHECK (status IN ('success','warning','error')),
  message text,
  situacao_cadastral text,
  provider text NOT NULL DEFAULT 'brasilapi',
  http_status int,
  duration_ms int,
  user_id uuid,
  user_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cnpj_lookup_logs_created_at ON public.cnpj_lookup_logs (created_at DESC);
CREATE INDEX idx_cnpj_lookup_logs_cnpj ON public.cnpj_lookup_logs (cnpj);

GRANT SELECT ON public.cnpj_lookup_logs TO authenticated;
GRANT ALL ON public.cnpj_lookup_logs TO service_role;

ALTER TABLE public.cnpj_lookup_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read cnpj lookup logs"
ON public.cnpj_lookup_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));
