CREATE TABLE IF NOT EXISTS public.system_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  maintenance_banner_enabled boolean NOT NULL DEFAULT false,
  maintenance_banner_message text NOT NULL DEFAULT 'O sistema está passando por atualizações e pode apresentar lentidão ou instabilidade temporária.',
  super_admin_id uuid NOT NULL REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;
GRANT UPDATE ON public.system_settings TO authenticated;

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view system settings"
ON public.system_settings FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Only super admin can update system settings"
ON public.system_settings FOR UPDATE TO authenticated
USING (super_admin_id = auth.uid())
WITH CHECK (super_admin_id = auth.uid());

INSERT INTO public.system_settings (id, maintenance_banner_enabled, super_admin_id)
VALUES (true, false, '738dd5a5-c054-4c8f-b770-df96288e8bd9'::uuid)
ON CONFLICT (id) DO UPDATE
SET maintenance_banner_enabled = false,
    super_admin_id = EXCLUDED.super_admin_id,
    updated_at = now();
