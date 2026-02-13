
-- Table to track OTP verification attempts
CREATE TABLE public.otp_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  last_attempt_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_otp_attempts_user_id ON public.otp_attempts (user_id);

-- RLS: no direct access, only service_role
ALTER TABLE public.otp_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct access to otp_attempts"
  ON public.otp_attempts FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);
