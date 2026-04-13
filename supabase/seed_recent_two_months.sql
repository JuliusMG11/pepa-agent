-- =============================================================
-- Pepa — doplnkové vzorové dáta: posledné ~2 mesiace + dnes
-- =============================================================
-- Priradenie agenta: všetko ide na jeden profil (nižšie TIMELINE_AGENT_ID). Zmeň UUID pri inom účte.
-- Nemovitosti majú platné UUID (8+4+4+4+12 hex); starý tvar b10000000-… bol neplatný (9 znakov v 1. bloku).
-- Vyžaduje aspoň 1 riadok v profiles.
-- Skript vkladá vzorové NEMOVITOSTI + klientov + leady + aktivity.
-- Spúšťaj v Supabase → SQL Editor (spojenie s právami na zápis), nie cez anon kľúč.
--
-- LOKÁLNE: pnpm supabase start && pnpm db:seed:timeline
-- PRODUKCIA: Dashboard → SQL Editor → celý súbor, alebo pnpm db:seed:timeline:remote
--
-- Bezpečné opakovanie: ON CONFLICT DO NOTHING
-- =============================================================

-- Preferovaný profil (produkcia); lokálne po db resete často chýba → padáme na prvý profil v tabuľke.
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM public.profiles) = 0 THEN
    RAISE EXCEPTION 'V tabuľke profiles nie je žiadny používateľ — najprv registrácia / prvý účet.';
  END IF;
END $$;

-- -------------------------
-- Nemovitosti (8 ks) — stabilné UUID (platný tvar)
-- -------------------------
WITH
  demo_agent AS (
    SELECT COALESCE(
      (SELECT id FROM public.profiles WHERE id = '15e62688-f1a7-49a6-80ac-c6a31a23620f'::uuid),
      (SELECT id FROM public.profiles ORDER BY created_at NULLS LAST LIMIT 1)
    ) AS id
  )
INSERT INTO properties (
  id, title, address, city, district, type, status, price, area_m2,
  floor, total_floors, year_built, last_renovation, reconstruction_notes,
  permit_data, agent_id, created_at, updated_at
)
SELECT
  v.id,
  v.title,
  v.address,
  'Praha',
  v.district,
  v.typ::property_type,
  v.st::property_status,
  v.price,
  v.area,
  v.fl,
  v.tfl,
  v.yb,
  v.reno,
  v.notes,
  v.permit,
  (SELECT id FROM demo_agent),
  v.ts,
  v.ts
FROM (VALUES
  ('b1000001-0000-4000-8000-000000000001'::uuid, 'Byt 2+kk — Vinohrady (demo)', 'Mánesova 14', 'Vinohrady', 'byt', 'active', 9200000::bigint, 72::numeric, 3::smallint, 5::smallint, 1932::smallint, '2021-06-15'::date, 'Rekonstrukce 2021', 'SP-2021-9001', NOW() - INTERVAL '58 days'),
  ('b1000001-0000-4000-8000-000000000002'::uuid, 'Byt 3+kk — Holešovice (demo)', 'Osadní 22', 'Holešovice', 'byt', 'active', 7800000::bigint, 81::numeric, 2::smallint, 4::smallint, 1978::smallint, '2020-03-01'::date, 'Nová koupelna 2020', 'Kol-2020-4412', NOW() - INTERVAL '52 days'),
  ('b1000001-0000-4000-8000-000000000003'::uuid, 'Byt 1+kk — Žižkov (demo)', 'Seifertova 9', 'Žižkov', 'byt', 'active', 4500000::bigint, 36::numeric, 4::smallint, 6::smallint, 2005::smallint, NULL::date, NULL::text, NULL::text, NOW() - INTERVAL '45 days'),
  ('b1000001-0000-4000-8000-000000000004'::uuid, 'Byt 4+kk — Smíchov (demo)', 'Plzeňská 38', 'Smíchov', 'byt', 'active', 11800000::bigint, 105::numeric, 5::smallint, 6::smallint, 1995::smallint, '2019-09-01'::date, 'Terasa + rekonstrukce', 'ÚR-2019-771', NOW() - INTERVAL '40 days'),
  ('b1000001-0000-4000-8000-000000000005'::uuid, 'Rodinný dům — Dejvice (demo)', 'Na Babě 7', 'Dejvice', 'dum', 'active', 18500000::bigint, 195::numeric, NULL::smallint, 2::smallint, 1940::smallint, '2018-04-01'::date, 'Střecha a fasáda 2018', 'ÚR-Dej-2018-3', NOW() - INTERVAL '35 days'),
  ('b1000001-0000-4000-8000-000000000006'::uuid, 'Komerční prostor — Holešovice (demo)', 'Argentinská 5', 'Holešovice', 'komercni', 'active', 7200000::bigint, 120::numeric, NULL::smallint, NULL::smallint, 1998::smallint, NULL::date, NULL::text, NULL::text, NOW() - INTERVAL '30 days'),
  ('b1000001-0000-4000-8000-000000000007'::uuid, 'Byt 2+kk — Vinohrady (demo)', 'Blanická 11', 'Vinohrady', 'byt', 'pending', 8800000::bigint, 64::numeric, 2::smallint, 4::smallint, 1928::smallint, '2022-01-01'::date, 'Částečná rekonstrukce', 'SP-2022-2201', NOW() - INTERVAL '25 days'),
  ('b1000001-0000-4000-8000-000000000008'::uuid, 'Byt 3+1 — Žižkov (demo)', 'Cimburkova 4', 'Žižkov', 'byt', 'active', 6900000::bigint, 78::numeric, 1::smallint, 3::smallint, 1965::smallint, NULL::date, NULL::text, 'SP-1965-legacy', NOW() - INTERVAL '20 days')
) AS v(id, title, address, district, typ, st, price, area, fl, tfl, yb, reno, notes, permit, ts)
ON CONFLICT (id) DO NOTHING;

-- Klienti (timeline)
WITH
  demo_agent AS (
    SELECT COALESCE(
      (SELECT id FROM public.profiles WHERE id = '15e62688-f1a7-49a6-80ac-c6a31a23620f'::uuid),
      (SELECT id FROM public.profiles ORDER BY created_at NULLS LAST LIMIT 1)
    ) AS id
  )
INSERT INTO clients (id, full_name, email, phone, source, notes, assigned_agent_id, created_at)
SELECT v.id, v.full_name, v.email, v.phone, v.source::lead_source, v.notes,
       (SELECT id FROM demo_agent),
       v.ts
FROM (VALUES
  ('b2000000-0000-0000-0000-000000000021'::uuid, 'Filip Horák', 'filip.horak@email.cz', '+420 601 100 201', 'sreality', 'Timeline demo — záujem o Vinohrady', NOW() - INTERVAL '56 days'),
  ('b2000000-0000-0000-0000-000000000022'::uuid, 'Tereza Nováková', 'tereza.n@gmail.com', '+420 602 100 202', 'referral', 'Timeline demo — 2+kk Holešovice', NOW() - INTERVAL '49 days'),
  ('b2000000-0000-0000-0000-000000000023'::uuid, 'Jakub Svoboda', 'jakub.svoboda@firma.cz', '+420 603 100 203', 'direct', 'Timeline demo — investičný byt', NOW() - INTERVAL '38 days'),
  ('b2000000-0000-0000-0000-000000000024'::uuid, 'Kristýna Poláková', 'kristyna.p@seznam.cz', '+420 604 100 204', 'bezrealitky', 'Timeline demo — Žižkov', NOW() - INTERVAL '27 days'),
  ('b2000000-0000-0000-0000-000000000025'::uuid, 'Marek Urban', 'marek.urban@email.cz', '+420 605 100 205', 'sreality', 'Timeline demo — Smíchov', NOW() - INTERVAL '16 days'),
  ('b2000000-0000-0000-0000-000000000026'::uuid, 'Simona Richterová', 'simona.r@outlook.com', '+420 606 100 206', 'referral', 'Timeline demo — Dejvice', NOW() - INTERVAL '9 days'),
  ('b2000000-0000-0000-0000-000000000027'::uuid, 'Lukáš Bartoš', 'lukas.bartos@gmail.com', '+420 607 100 207', 'sreality', 'Timeline demo — dnes nový lead', NOW() - INTERVAL '4 hours'),
  ('b2000000-0000-0000-0000-000000000028'::uuid, 'Natálie Křížová', 'natalie.krizova@email.cz', '+420 608 100 208', 'direct', 'Timeline demo — registrácia dnes', NOW() - INTERVAL '25 minutes')
) AS v(id, full_name, email, phone, source, notes, ts)
ON CONFLICT (id) DO NOTHING;

-- Leady: klienti b2000… + property_id z nemovitostí (vrátane b1000001-…)
WITH
  demo_agent AS (
    SELECT COALESCE(
      (SELECT id FROM public.profiles WHERE id = '15e62688-f1a7-49a6-80ac-c6a31a23620f'::uuid),
      (SELECT id FROM public.profiles ORDER BY created_at NULLS LAST LIMIT 1)
    ) AS id
  ),
  pc AS (SELECT GREATEST(COUNT(*)::int, 1) AS c FROM public.properties WHERE deleted_at IS NULL),
  props AS (
    SELECT id, row_number() OVER (ORDER BY created_at DESC NULLS LAST) - 1 AS rn
    FROM public.properties
    WHERE deleted_at IS NULL
  )
INSERT INTO leads (
  id, client_id, property_id, status, source, assigned_agent_id,
  first_contact_at, last_contact_at, closed_at, created_at, updated_at
)
SELECT
  v.lid,
  v.cid,
  (SELECT id FROM props WHERE rn = (v.pidx % (SELECT c FROM pc))),
  v.st::lead_status,
  v.src::lead_source,
  (SELECT id FROM demo_agent),
  v.fc, v.lc, v.cl, v.cr, v.up
FROM (VALUES
  ('b3000000-0000-0000-0000-000000000101'::uuid, 'b2000000-0000-0000-0000-000000000022'::uuid, 0, 'closed_won', 'referral',
   NOW() - INTERVAL '50 days', NOW() - INTERVAL '44 days', NOW() - INTERVAL '44 days', NOW() - INTERVAL '50 days', NOW() - INTERVAL '44 days'),
  ('b3000000-0000-0000-0000-000000000102'::uuid, 'b2000000-0000-0000-0000-000000000023'::uuid, 1, 'closed_lost', 'direct',
   NOW() - INTERVAL '40 days', NOW() - INTERVAL '33 days', NOW() - INTERVAL '33 days', NOW() - INTERVAL '40 days', NOW() - INTERVAL '33 days'),
  ('b3000000-0000-0000-0000-000000000103'::uuid, 'b2000000-0000-0000-0000-000000000021'::uuid, 2, 'offer_made', 'sreality',
   NOW() - INTERVAL '30 days', NOW() - INTERVAL '2 days', NULL, NOW() - INTERVAL '30 days', NOW() - INTERVAL '2 days'),
  ('b3000000-0000-0000-0000-000000000104'::uuid, 'b2000000-0000-0000-0000-000000000024'::uuid, 3, 'viewing_scheduled', 'bezrealitky',
   NOW() - INTERVAL '22 days', NOW() - INTERVAL '1 day', NULL, NOW() - INTERVAL '22 days', NOW() - INTERVAL '1 day'),
  ('b3000000-0000-0000-0000-000000000105'::uuid, 'b2000000-0000-0000-0000-000000000025'::uuid, 4, 'contacted', 'sreality',
   NOW() - INTERVAL '14 days', NOW() - INTERVAL '5 days', NULL, NOW() - INTERVAL '14 days', NOW() - INTERVAL '5 days'),
  ('b3000000-0000-0000-0000-000000000106'::uuid, 'b2000000-0000-0000-0000-000000000026'::uuid, 5, 'contacted', 'referral',
   NOW() - INTERVAL '8 days', NOW() - INTERVAL '3 days', NULL, NOW() - INTERVAL '8 days', NOW() - INTERVAL '3 days'),
  ('b3000000-0000-0000-0000-000000000107'::uuid, 'b2000000-0000-0000-0000-000000000022'::uuid, 6, 'new', 'sreality',
   NOW() - INTERVAL '55 days', NOW() - INTERVAL '55 days', NULL, NOW() - INTERVAL '55 days', NOW() - INTERVAL '55 days'),
  ('b3000000-0000-0000-0000-000000000108'::uuid, 'b2000000-0000-0000-0000-000000000023'::uuid, 7, 'new', 'sreality',
   NOW() - INTERVAL '48 days', NOW() - INTERVAL '48 days', NULL, NOW() - INTERVAL '48 days', NOW() - INTERVAL '48 days'),
  ('b3000000-0000-0000-0000-000000000109'::uuid, 'b2000000-0000-0000-0000-000000000024'::uuid, 0, 'viewing_scheduled', 'bezrealitky',
   NOW() - INTERVAL '35 days', NOW() - INTERVAL '34 days', NULL, NOW() - INTERVAL '35 days', NOW() - INTERVAL '34 days'),
  ('b3000000-0000-0000-0000-000000000110'::uuid, 'b2000000-0000-0000-0000-000000000025'::uuid, 1, 'offer_made', 'sreality',
   NOW() - INTERVAL '20 days', NOW() - INTERVAL '4 days', NULL, NOW() - INTERVAL '20 days', NOW() - INTERVAL '4 days'),
  ('b3000000-0000-0000-0000-000000000111'::uuid, 'b2000000-0000-0000-0000-000000000026'::uuid, 2, 'new', 'sreality',
   NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days', NULL, NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days'),
  ('b3000000-0000-0000-0000-000000000112'::uuid, 'b2000000-0000-0000-0000-000000000021'::uuid, 3, 'contacted', 'referral',
   NOW() - INTERVAL '6 days', NOW() - INTERVAL '2 days', NULL, NOW() - INTERVAL '6 days', NOW() - INTERVAL '2 days'),
  ('b3000000-0000-0000-0000-000000000113'::uuid, 'b2000000-0000-0000-0000-000000000027'::uuid, 4, 'new', 'sreality',
   NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours', NULL, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours'),
  ('b3000000-0000-0000-0000-000000000114'::uuid, 'b2000000-0000-0000-0000-000000000028'::uuid, 5, 'new', 'direct',
   NOW() - INTERVAL '20 minutes', NOW() - INTERVAL '20 minutes', NULL, NOW() - INTERVAL '20 minutes', NOW() - INTERVAL '20 minutes'),
  ('b3000000-0000-0000-0000-000000000115'::uuid, 'b2000000-0000-0000-0000-000000000022'::uuid, 6, 'new', 'sreality',
   NOW() - INTERVAL '50 minutes', NOW() - INTERVAL '50 minutes', NULL, NOW() - INTERVAL '50 minutes', NOW() - INTERVAL '50 minutes'),
  ('b3000000-0000-0000-0000-000000000116'::uuid, 'b2000000-0000-0000-0000-000000000023'::uuid, 7, 'contacted', 'direct',
   NOW() - INTERVAL '2 hours', NOW() - INTERVAL '90 minutes', NULL, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '90 minutes'),
  ('b3000000-0000-0000-0000-000000000117'::uuid, 'b2000000-0000-0000-0000-000000000024'::uuid, 0, 'viewing_scheduled', 'bezrealitky',
   NOW() - INTERVAL '5 hours', NOW() - INTERVAL '4 hours', NULL, NOW() - INTERVAL '5 hours', NOW() - INTERVAL '4 hours'),
  ('b3000000-0000-0000-0000-000000000118'::uuid, 'b2000000-0000-0000-0000-000000000025'::uuid, 1, 'new', 'referral',
   NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '15 minutes', NULL, NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '15 minutes')
) AS v(lid, cid, pidx, st, src, fc, lc, cl, cr, up)
ON CONFLICT (id) DO NOTHING;

-- Aktivity: performed_by = tvoj profil; property = p1/p2 z nemovitostí
WITH
  demo_agent AS (
    SELECT COALESCE(
      (SELECT id FROM public.profiles WHERE id = '15e62688-f1a7-49a6-80ac-c6a31a23620f'::uuid),
      (SELECT id FROM public.profiles ORDER BY created_at NULLS LAST LIMIT 1)
    ) AS id
  ),
  p1 AS (SELECT id FROM public.properties WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 1),
  p2 AS (
    SELECT COALESCE(
      (SELECT id FROM public.properties WHERE deleted_at IS NULL ORDER BY created_at DESC OFFSET 1 LIMIT 1),
      (SELECT id FROM p1)
    ) AS id
  )
INSERT INTO activities (id, type, title, description, related_to_type, related_to_id, performed_by, scheduled_at, completed_at, created_at)
SELECT
  t.id,
  t.typ::activity_type,
  t.title,
  t.description,
  t.rtype,
  CASE t.rtype
    WHEN 'property' THEN CASE t.which_prop WHEN 1 THEN (SELECT id FROM p1) ELSE (SELECT id FROM p2) END
    ELSE t.rid
  END,
  (SELECT id FROM demo_agent),
  t.sched,
  t.comp,
  t.cre
FROM (
  VALUES
    ('b4000000-0000-0000-0000-000000000201'::uuid, 'call'::activity_type, 'Hovor — Filip Horák (timeline)', 'Domluven follow-up na nabídku', 'client', 'b2000000-0000-0000-0000-000000000021'::uuid, 0, NOW() - INTERVAL '52 days', NOW() - INTERVAL '52 days', NOW() - INTERVAL '52 days'),
    ('b4000000-0000-0000-0000-000000000202'::uuid, 'email'::activity_type, 'E-mail — Tereza Nováková', 'Zaslán výpis z katastru', 'lead', 'b3000000-0000-0000-0000-000000000101'::uuid, 0, NOW() - INTERVAL '48 days', NOW() - INTERVAL '48 days', NOW() - INTERVAL '48 days'),
    ('b4000000-0000-0000-0000-000000000203'::uuid, 'viewing'::activity_type, 'Prohlídka — timeline', 'Klient spokojen', 'property', NULL::uuid, 1, NOW() - INTERVAL '31 days', NOW() - INTERVAL '31 days', NOW() - INTERVAL '31 days'),
    ('b4000000-0000-0000-0000-000000000204'::uuid, 'note'::activity_type, 'Týdenní shrnutí trhu', 'Zájem o byty 2+kk', 'property', NULL::uuid, 2, NOW() - INTERVAL '21 days', NOW() - INTERVAL '21 days', NOW() - INTERVAL '21 days'),
    ('b4000000-0000-0000-0000-000000000205'::uuid, 'task'::activity_type, 'Follow-up — nabídka', 'Připomenout klientovi lhůtu', 'lead', 'b3000000-0000-0000-0000-000000000103'::uuid, 0, NOW() - INTERVAL '1 day', NULL, NOW() - INTERVAL '11 days'),
    ('b4000000-0000-0000-0000-000000000206'::uuid, 'call'::activity_type, 'Rychlý hovor — dnes dopoledne', 'Potvrzen zájem o prohlídku', 'lead', 'b3000000-0000-0000-0000-000000000117'::uuid, 0, NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours'),
    ('b4000000-0000-0000-0000-000000000207'::uuid, 'email'::activity_type, 'Denní souhrn — posláno vedení', 'Export nových leadů za 24 h', 'client', 'b2000000-0000-0000-0000-000000000028'::uuid, 0, NOW() - INTERVAL '35 minutes', NOW() - INTERVAL '35 minutes', NOW() - INTERVAL '35 minutes'),
    ('b4000000-0000-0000-0000-000000000208'::uuid, 'viewing'::activity_type, 'Prohlídka naplánována — dnes odpoledne', 'Kalendář synchronizován', 'lead', 'b3000000-0000-0000-0000-000000000104'::uuid, 0, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours')
) AS t(id, typ, title, description, rtype, rid, which_prop, sched, comp, cre)
ON CONFLICT (id) DO NOTHING;
