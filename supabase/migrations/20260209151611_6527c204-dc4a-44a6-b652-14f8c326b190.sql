DROP POLICY "Users can view clients" ON public.clients;

CREATE POLICY "Authenticated users can view all clients"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (true);