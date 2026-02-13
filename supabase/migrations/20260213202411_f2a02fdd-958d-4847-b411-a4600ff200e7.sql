
-- Create a safe directory view without email
CREATE VIEW public.profiles_directory
WITH (security_invoker = on) AS
  SELECT user_id, name
  FROM public.profiles;

-- Grant access to authenticated users
GRANT SELECT ON public.profiles_directory TO authenticated;
