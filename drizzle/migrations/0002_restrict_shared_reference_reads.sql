DROP POLICY IF EXISTS "Anyone authenticated can view templates" ON public.contract_templates;
CREATE POLICY "Active users can view templates" ON public.contract_templates FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_active));

DROP POLICY IF EXISTS "Anyone authenticated can view clauses" ON public.contract_clauses;
CREATE POLICY "Active users can view clauses" ON public.contract_clauses FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_active));

DROP POLICY IF EXISTS "Authenticated users can view system settings" ON public.system_settings;
CREATE POLICY "Active users can view system settings" ON public.system_settings FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_active));