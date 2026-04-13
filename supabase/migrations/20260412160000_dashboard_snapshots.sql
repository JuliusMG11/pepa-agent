-- Cached dashboard payloads (e.g. AI top picks from monitoring listings)
CREATE TABLE IF NOT EXISTS public.dashboard_snapshots (
  key text PRIMARY KEY,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dashboard_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dashboard_snapshots_select"
  ON public.dashboard_snapshots FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "dashboard_snapshots_insert"
  ON public.dashboard_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "dashboard_snapshots_update"
  ON public.dashboard_snapshots FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
