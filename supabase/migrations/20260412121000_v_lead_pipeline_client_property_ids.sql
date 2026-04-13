-- Rozšírenie pohľadu o client_id a property_id (edit lead formulár)
DROP VIEW IF EXISTS public.v_lead_pipeline;

CREATE VIEW public.v_lead_pipeline AS
SELECT
  l.id,
  l.client_id,
  l.property_id,
  l.status,
  l.source,
  l.first_contact_at,
  l.last_contact_at,
  l.closed_at,
  l.created_at,
  l.updated_at,
  l.assigned_agent_id,
  c.full_name    AS client_name,
  c.email        AS client_email,
  c.phone        AS client_phone,
  p.title        AS property_title,
  p.address      AS property_address,
  p.price        AS property_price,
  pr.full_name   AS agent_name
FROM leads l
JOIN clients c         ON c.id = l.client_id AND c.deleted_at IS NULL
LEFT JOIN properties p ON p.id = l.property_id AND p.deleted_at IS NULL
LEFT JOIN profiles pr  ON pr.id = l.assigned_agent_id;
