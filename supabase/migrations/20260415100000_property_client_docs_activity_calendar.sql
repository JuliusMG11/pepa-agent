-- Klient u nemovitosti, dokumenty, typ aktivity „meeting“, odkaz na Google Calendar událost

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS document_urls text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_properties_client_id ON public.properties(client_id) WHERE deleted_at IS NULL;

ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'meeting';

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS google_calendar_event_id text;

-- View: přidat klienta u nemovitosti a dokumenty
DROP VIEW IF EXISTS public.v_property_summary;

CREATE VIEW public.v_property_summary AS
SELECT
  p.id,
  p.title,
  p.address,
  p.city,
  p.district,
  p.type,
  p.status,
  p.price,
  p.area_m2,
  p.floor,
  p.total_floors,
  p.year_built,
  p.last_renovation,
  p.reconstruction_notes,
  p.permit_data,
  p.source_url,
  p.cover_image_url,
  p.gallery_urls,
  p.client_id,
  cli.full_name AS client_name,
  p.document_urls,
  p.owner_id,
  p.agent_id,
  p.created_at,
  p.updated_at,
  (SELECT COUNT(*)::bigint FROM public.leads l WHERE l.property_id = p.id) AS lead_count,
  (
    SELECT MAX(a.created_at)
    FROM public.activities a
    WHERE a.related_to_id = p.id AND a.related_to_type = 'property'
  ) AS last_activity_at,
  pr.full_name AS agent_name
FROM public.properties p
LEFT JOIN public.clients cli ON cli.id = p.client_id AND cli.deleted_at IS NULL
LEFT JOIN public.profiles pr ON pr.id = p.agent_id
WHERE p.deleted_at IS NULL;

-- Bucket pro PDF / dokumenty k nemovitosti (odděleně od obrázků kvůli MIME limitům)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-documents',
  'property-documents',
  true,
  5242880,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "property_docs_public_read" ON storage.objects;
DROP POLICY IF EXISTS "property_docs_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "property_docs_update_own" ON storage.objects;
DROP POLICY IF EXISTS "property_docs_delete_own" ON storage.objects;

CREATE POLICY "property_docs_public_read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'property-documents');

CREATE POLICY "property_docs_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'property-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "property_docs_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'property-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "property_docs_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'property-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
