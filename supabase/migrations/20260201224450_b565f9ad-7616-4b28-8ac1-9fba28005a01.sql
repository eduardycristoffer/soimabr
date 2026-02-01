-- Corrigir política de audit_logs para ser mais restritiva
DROP POLICY IF EXISTS "System can create audit logs" ON public.audit_logs;

CREATE POLICY "Authenticated users can create audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());