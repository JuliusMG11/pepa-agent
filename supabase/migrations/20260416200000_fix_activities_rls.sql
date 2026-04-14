-- Fix activities RLS: allow any authenticated user to read all activities.
-- Previous policy only showed activities where the viewer was the performer
-- or an admin, so property/lead/client detail tabs showed empty activity lists
-- for activities logged by other users or seeded data.

DROP POLICY IF EXISTS "activities_agent_read" ON activities;

CREATE POLICY "activities_agent_read" ON activities
  FOR SELECT USING (auth.uid() IS NOT NULL);
