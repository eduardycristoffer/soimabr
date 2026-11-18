REVOKE ALL ON public.contract_signature_requests FROM anon, authenticated;
REVOKE ALL ON public.contract_signature_events   FROM anon, authenticated;
REVOKE ALL ON public.proposal_email_dispatches   FROM anon, authenticated;
GRANT SELECT ON public.contract_signature_requests TO authenticated;
GRANT SELECT ON public.contract_signature_events   TO authenticated;
GRANT SELECT ON public.proposal_email_dispatches   TO authenticated;