
-- Create password_reset_tokens table
CREATE TABLE public.password_reset_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  token TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '1 hour'),
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- No direct access policy (only via Edge Function with service role)
CREATE POLICY "No direct access to password reset tokens"
  ON public.password_reset_tokens
  FOR ALL
  USING (false)
  WITH CHECK (false);
