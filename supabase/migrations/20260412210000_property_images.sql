-- Náhľadová fotka + galéria (URL; upload cez Storage môže doplniť neskôr)
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS gallery_urls text[] NOT NULL DEFAULT '{}';

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
  p.owner_id,
  p.agent_id,
  p.created_at,
  p.updated_at,
  COUNT(DISTINCT l.id)       AS lead_count,
  MAX(a.created_at)          AS last_activity_at,
  pr.full_name               AS agent_name
FROM properties p
LEFT JOIN leads l      ON l.property_id = p.id
LEFT JOIN activities a ON a.related_to_id = p.id AND a.related_to_type = 'property'
LEFT JOIN profiles pr  ON pr.id = p.agent_id
WHERE p.deleted_at IS NULL
GROUP BY p.id, pr.full_name;
