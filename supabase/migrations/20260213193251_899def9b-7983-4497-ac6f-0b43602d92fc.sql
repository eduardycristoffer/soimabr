
-- Deny all direct access to email_verification_tokens (only service_role bypasses RLS)
CREATE POLICY "No direct access to verification tokens"
  ON public.email_verification_tokens
  FOR ALL
  USING (false)
  WITH CHECK (false);
