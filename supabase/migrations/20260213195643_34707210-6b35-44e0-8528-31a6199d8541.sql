
-- Create login_otp_codes table
CREATE TABLE public.login_otp_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '5 minutes'),
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS: no direct access (everything via Edge Function with service role)
ALTER TABLE public.login_otp_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct access to OTP codes"
  ON public.login_otp_codes
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Add must_complete_profile column to profiles
ALTER TABLE public.profiles
  ADD COLUMN must_complete_profile BOOLEAN NOT NULL DEFAULT false;
