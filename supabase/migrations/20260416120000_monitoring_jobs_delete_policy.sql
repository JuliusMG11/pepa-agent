-- Smazání vlastních monitoring úloh z UI
DROP POLICY IF EXISTS "monitoring_jobs_delete" ON public.monitoring_jobs;

CREATE POLICY "monitoring_jobs_delete" ON public.monitoring_jobs
  FOR DELETE USING (
    auth.uid() = created_by
    OR public.is_admin()
  );
