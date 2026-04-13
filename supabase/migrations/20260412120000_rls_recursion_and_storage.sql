-- RLS: odstránenie nekonečnej rekurzie (politiky čítali profiles cez EXISTS → znova profiles)
-- + bucket reports pre upload reportov
-- + DELETE politiky pre nemovitosti, klientov, leady

-- Bezpečná kontrola role bez rekurzie (SECURITY DEFINER = obíde RLS pri čítaní profiles)
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.user_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- --- profiles: jedna SELECT politika (agent/admin vidí adresár kolegov) ---
DROP POLICY IF EXISTS "profiles_read_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_read_all" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR public.user_role() IN ('agent', 'admin')
    OR public.is_admin()
  );

-- --- properties ---
DROP POLICY IF EXISTS "properties_agent_read" ON public.properties;
DROP POLICY IF EXISTS "properties_agent_update" ON public.properties;

CREATE POLICY "properties_agent_read" ON public.properties
  FOR SELECT USING (
    auth.uid() = agent_id
    OR public.is_admin()
  );

CREATE POLICY "properties_agent_update" ON public.properties
  FOR UPDATE USING (
    auth.uid() = agent_id
    OR public.is_admin()
  );

CREATE POLICY "properties_agent_delete" ON public.properties
  FOR DELETE USING (
    auth.uid() = agent_id
    OR public.is_admin()
  );

-- --- clients ---
DROP POLICY IF EXISTS "clients_agent_read" ON public.clients;
DROP POLICY IF EXISTS "clients_agent_update" ON public.clients;
DROP POLICY IF EXISTS "clients_agent_insert" ON public.clients;

CREATE POLICY "clients_agent_read" ON public.clients
  FOR SELECT USING (
    auth.uid() = assigned_agent_id
    OR public.is_admin()
  );

CREATE POLICY "clients_agent_update" ON public.clients
  FOR UPDATE USING (
    auth.uid() = assigned_agent_id
    OR public.is_admin()
  );

CREATE POLICY "clients_agent_insert" ON public.clients
  FOR INSERT WITH CHECK (
    auth.uid() = assigned_agent_id
    OR public.is_admin()
  );

CREATE POLICY "clients_agent_delete" ON public.clients
  FOR DELETE USING (
    auth.uid() = assigned_agent_id
    OR public.is_admin()
  );

-- --- leads ---
DROP POLICY IF EXISTS "leads_agent_read" ON public.leads;
DROP POLICY IF EXISTS "leads_agent_update" ON public.leads;
DROP POLICY IF EXISTS "leads_agent_insert" ON public.leads;

CREATE POLICY "leads_agent_read" ON public.leads
  FOR SELECT USING (
    auth.uid() = assigned_agent_id
    OR public.is_admin()
  );

CREATE POLICY "leads_agent_update" ON public.leads
  FOR UPDATE USING (
    auth.uid() = assigned_agent_id
    OR public.is_admin()
  );

CREATE POLICY "leads_agent_insert" ON public.leads
  FOR INSERT WITH CHECK (
    auth.uid() = assigned_agent_id
    OR public.is_admin()
  );

CREATE POLICY "leads_agent_delete" ON public.leads
  FOR DELETE USING (
    auth.uid() = assigned_agent_id
    OR public.is_admin()
  );

-- --- activities ---
DROP POLICY IF EXISTS "activities_agent_read" ON public.activities;
DROP POLICY IF EXISTS "activities_agent_insert" ON public.activities;
DROP POLICY IF EXISTS "activities_agent_update" ON public.activities;

CREATE POLICY "activities_agent_read" ON public.activities
  FOR SELECT USING (
    auth.uid() = performed_by
    OR public.is_admin()
  );

CREATE POLICY "activities_agent_insert" ON public.activities
  FOR INSERT WITH CHECK (
    auth.uid() = performed_by
    OR public.is_admin()
  );

CREATE POLICY "activities_agent_update" ON public.activities
  FOR UPDATE USING (
    auth.uid() = performed_by
    OR public.is_admin()
  );

CREATE POLICY "activities_agent_delete" ON public.activities
  FOR DELETE USING (
    auth.uid() = performed_by
    OR public.is_admin()
  );

-- --- monitoring_jobs ---
DROP POLICY IF EXISTS "monitoring_jobs_read" ON public.monitoring_jobs;
DROP POLICY IF EXISTS "monitoring_jobs_update" ON public.monitoring_jobs;

CREATE POLICY "monitoring_jobs_read" ON public.monitoring_jobs
  FOR SELECT USING (
    auth.uid() = created_by
    OR public.is_admin()
  );

CREATE POLICY "monitoring_jobs_update" ON public.monitoring_jobs
  FOR UPDATE USING (
    auth.uid() = created_by
    OR public.is_admin()
  );

-- --- reports ---
DROP POLICY IF EXISTS "reports_read" ON public.reports;
DROP POLICY IF EXISTS "reports_insert" ON public.reports;

CREATE POLICY "reports_insert" ON public.reports
  FOR INSERT WITH CHECK (
    auth.uid() = generated_by
    OR public.is_admin()
  );

CREATE POLICY "reports_read" ON public.reports
  FOR SELECT USING (
    auth.uid() = generated_by
    OR public.is_admin()
  );

CREATE POLICY "reports_update" ON public.reports
  FOR UPDATE USING (
    auth.uid() = generated_by
    OR public.is_admin()
  );

CREATE POLICY "reports_delete" ON public.reports
  FOR DELETE USING (
    auth.uid() = generated_by
    OR public.is_admin()
  );

-- --- Storage: bucket reports (ak ešte neexistuje) ---
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reports',
  'reports',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Politiky pre objekty v buckete reports: priečinok = user id
DROP POLICY IF EXISTS "reports_storage_select_own" ON storage.objects;
DROP POLICY IF EXISTS "reports_storage_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "reports_storage_update_own" ON storage.objects;
DROP POLICY IF EXISTS "reports_storage_delete_own" ON storage.objects;

CREATE POLICY "reports_storage_select_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'reports' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "reports_storage_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'reports' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "reports_storage_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'reports' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "reports_storage_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'reports' AND (storage.foldername(name))[1] = auth.uid()::text);
