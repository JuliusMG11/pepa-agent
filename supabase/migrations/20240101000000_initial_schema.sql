-- migrate:up
-- =============================================================
-- Pepa Agent — Initial Schema
-- PostgreSQL 15 + pgvector + RLS
-- =============================================================

-- -------------------------
-- Extensions
-- -------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS moddatetime;
CREATE EXTENSION IF NOT EXISTS vector;

-- -------------------------
-- Enums
-- -------------------------
CREATE TYPE property_type AS ENUM ('byt', 'dum', 'komercni', 'pozemek', 'garaze');
CREATE TYPE property_status AS ENUM ('active', 'pending', 'sold', 'withdrawn');
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'viewing_scheduled', 'offer_made', 'closed_won', 'closed_lost');
CREATE TYPE lead_source AS ENUM ('referral', 'sreality', 'bezrealitky', 'reality_cz', 'direct', 'social', 'event', 'other');
CREATE TYPE activity_type AS ENUM ('call', 'email', 'viewing', 'offer', 'contract', 'note', 'task');
CREATE TYPE report_type AS ENUM ('weekly', 'monthly', 'quarterly', 'custom');
CREATE TYPE user_role AS ENUM ('admin', 'agent', 'viewer');

-- -------------------------
-- profiles (extends auth.users)
-- -------------------------
CREATE TABLE profiles (
  id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name      text NOT NULL,
  email          text NOT NULL,
  role           user_role NOT NULL DEFAULT 'agent',
  avatar_url     text,
  telegram_chat_id bigint,
  google_access_token  text,
  google_refresh_token text,
  google_token_expiry  timestamptz,
  google_email         text,
  telegram_link_code   text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

-- -------------------------
-- properties
-- -------------------------
CREATE TABLE properties (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title                 text NOT NULL,
  address               text NOT NULL,
  city                  text NOT NULL DEFAULT 'Praha',
  district              text NOT NULL,
  type                  property_type NOT NULL,
  status                property_status NOT NULL DEFAULT 'active',
  price                 bigint NOT NULL,
  area_m2               numeric(8,2) NOT NULL,
  floor                 smallint,
  total_floors          smallint,
  year_built            smallint,
  last_renovation       date,
  reconstruction_notes  text,
  permit_data           text,
  source_url            text,
  owner_id              uuid REFERENCES profiles(id) ON DELETE SET NULL,
  agent_id              uuid REFERENCES profiles(id) ON DELETE SET NULL,
  deleted_at            timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

-- -------------------------
-- clients
-- -------------------------
CREATE TABLE clients (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name         text NOT NULL,
  email             text,
  phone             text,
  source            lead_source,
  notes             text,
  assigned_agent_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  deleted_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

-- -------------------------
-- leads
-- -------------------------
CREATE TABLE leads (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  property_id       uuid REFERENCES properties(id) ON DELETE SET NULL,
  assigned_agent_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status            lead_status NOT NULL DEFAULT 'new',
  source            lead_source,
  utm_source        text,
  utm_medium        text,
  first_contact_at  timestamptz,
  last_contact_at   timestamptz,
  closed_at         timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

-- -------------------------
-- activities
-- -------------------------
CREATE TABLE activities (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type            activity_type NOT NULL,
  title           text NOT NULL,
  description     text,
  related_to_type text,                 -- 'property' | 'lead' | 'client'
  related_to_id   uuid,
  performed_by    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  scheduled_at    timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- -------------------------
-- reports
-- -------------------------
CREATE TABLE reports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  type          report_type NOT NULL,
  period_start  date NOT NULL,
  period_end    date NOT NULL,
  generated_by  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  storage_path  text,
  format        text NOT NULL DEFAULT 'pdf',
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- -------------------------
-- agent_conversations
-- -------------------------
CREATE TABLE agent_conversations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES profiles(id) ON DELETE CASCADE,
  session_id  uuid NOT NULL,
  role        text NOT NULL CHECK (role IN ('user', 'assistant', 'tool')),
  content     text,
  tool_calls  jsonb,
  tokens_used integer,
  embedding   vector(1536),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- -------------------------
-- monitoring_jobs
-- -------------------------
CREATE TABLE monitoring_jobs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  query            text NOT NULL,
  locations        text[] NOT NULL DEFAULT '{}',
  enabled          boolean NOT NULL DEFAULT true,
  last_run_at      timestamptz,
  next_run_at      timestamptz,
  notify_telegram  boolean NOT NULL DEFAULT true,
  notify_email     boolean NOT NULL DEFAULT false,
  filters          jsonb NOT NULL DEFAULT '{}',
  telegram_chat_id bigint,
  created_by       uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- -------------------------
-- market_listings (scraped)
-- -------------------------
CREATE TABLE market_listings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source        text NOT NULL,
  external_id   text NOT NULL,
  title         text NOT NULL,
  address       text,
  district      text NOT NULL,
  property_type text,
  price         bigint,
  area_m2       numeric(8,2),
  url           text NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  is_new        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, external_id)
);

-- -------------------------
-- Indexes
-- -------------------------
-- Foreign keys
CREATE INDEX idx_leads_client_id       ON leads(client_id);
CREATE INDEX idx_leads_property_id     ON leads(property_id);
CREATE INDEX idx_leads_agent_id        ON leads(assigned_agent_id);
CREATE INDEX idx_activities_related    ON activities(related_to_type, related_to_id);
CREATE INDEX idx_agent_conversations_user ON agent_conversations(user_id, created_at DESC);
CREATE INDEX idx_market_listings_district ON market_listings(district, first_seen_at DESC);

-- Common filters
CREATE INDEX idx_properties_status   ON properties(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_properties_district ON properties(district) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_status        ON leads(status);
CREATE INDEX idx_leads_created       ON leads(created_at DESC);
CREATE INDEX idx_clients_created     ON clients(created_at DESC);

-- pgvector semantic search
CREATE INDEX ON agent_conversations USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- -------------------------
-- Row Level Security
-- -------------------------
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties          ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients             ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads               ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities          ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports             ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_jobs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_listings     ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_read_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_admin_read_all" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- properties
CREATE POLICY "properties_agent_read" ON properties
  FOR SELECT USING (
    auth.uid() = agent_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "properties_agent_insert" ON properties
  FOR INSERT WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "properties_agent_update" ON properties
  FOR UPDATE USING (
    auth.uid() = agent_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- clients
CREATE POLICY "clients_agent_read" ON clients
  FOR SELECT USING (
    auth.uid() = assigned_agent_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "clients_agent_insert" ON clients
  FOR INSERT WITH CHECK (auth.uid() = assigned_agent_id);

CREATE POLICY "clients_agent_update" ON clients
  FOR UPDATE USING (
    auth.uid() = assigned_agent_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- leads
CREATE POLICY "leads_agent_read" ON leads
  FOR SELECT USING (
    auth.uid() = assigned_agent_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "leads_agent_insert" ON leads
  FOR INSERT WITH CHECK (auth.uid() = assigned_agent_id);

CREATE POLICY "leads_agent_update" ON leads
  FOR UPDATE USING (
    auth.uid() = assigned_agent_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- activities
CREATE POLICY "activities_agent_read" ON activities
  FOR SELECT USING (
    auth.uid() = performed_by OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "activities_agent_insert" ON activities
  FOR INSERT WITH CHECK (auth.uid() = performed_by);

-- agent_conversations
CREATE POLICY "conversations_read_own" ON agent_conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "conversations_insert_own" ON agent_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- monitoring_jobs
CREATE POLICY "monitoring_jobs_read" ON monitoring_jobs
  FOR SELECT USING (
    auth.uid() = created_by OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "monitoring_jobs_insert" ON monitoring_jobs
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "monitoring_jobs_update" ON monitoring_jobs
  FOR UPDATE USING (
    auth.uid() = created_by OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- market_listings — all authenticated users read; service role writes
CREATE POLICY "market_listings_read" ON market_listings
  FOR SELECT USING (auth.role() = 'authenticated');

-- reports
CREATE POLICY "reports_read" ON reports
  FOR SELECT USING (
    auth.uid() = generated_by OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "reports_insert" ON reports
  FOR INSERT WITH CHECK (auth.uid() = generated_by);

-- -------------------------
-- Views
-- -------------------------
CREATE VIEW v_property_summary AS
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

CREATE VIEW v_lead_pipeline AS
SELECT
  l.id,
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
JOIN clients c         ON c.id = l.client_id
LEFT JOIN properties p ON p.id = l.property_id
LEFT JOIN profiles pr  ON pr.id = l.assigned_agent_id;

CREATE VIEW v_weekly_kpis AS
SELECT
  DATE_TRUNC('week', created_at)                                    AS week,
  COUNT(*) FILTER (WHERE status = 'new')                            AS new_leads,
  COUNT(*) FILTER (WHERE status = 'closed_won')                     AS closed_won,
  COUNT(*) FILTER (WHERE status = 'closed_lost')                    AS closed_lost,
  COUNT(*) FILTER (WHERE status = 'viewing_scheduled')              AS viewings_scheduled,
  COUNT(*) FILTER (WHERE status IN ('new', 'contacted',
    'viewing_scheduled', 'offer_made'))                             AS active_pipeline
FROM leads
GROUP BY DATE_TRUNC('week', created_at)
ORDER BY week DESC;
