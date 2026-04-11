-- =============================================================
-- Pepa Agent — Seed Data
-- Realistic Czech real estate data for development and demo
-- Run: pnpm supabase db reset (applies migrations then this file)
-- =============================================================

-- -------------------------
-- PROFILES (agents)
-- Note: auth.users must be created first via Supabase Auth
-- For local dev, these UUIDs are used as placeholders
-- -------------------------
INSERT INTO profiles (id, full_name, email, role, created_at) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Jan Novák', 'jan.novak@pepa-demo.cz', 'admin', NOW() - INTERVAL '6 months'),
  ('00000000-0000-0000-0000-000000000002', 'Marie Kovaříková', 'marie.kovarikova@pepa-demo.cz', 'agent', NOW() - INTERVAL '6 months'),
  ('00000000-0000-0000-0000-000000000003', 'Tomáš Hrubý', 'tomas.hruby@pepa-demo.cz', 'agent', NOW() - INTERVAL '4 months')
ON CONFLICT (id) DO NOTHING;

-- -------------------------
-- PROPERTIES (25 total)
-- 15 active, 5 pending, 4 sold, 1 withdrawn
-- 8 intentionally missing reconstruction_notes or permit_data
-- -------------------------
INSERT INTO properties (
  id, title, address, city, district, type, status, price, area_m2,
  floor, total_floors, year_built, last_renovation, reconstruction_notes,
  permit_data, agent_id, created_at, updated_at
) VALUES

-- ACTIVE (15)
('10000000-0000-0000-0000-000000000001', 'Světlý byt 2+kk, Osadní', 'Osadní 35', 'Praha', 'Holešovice', 'byt', 'active', 6200000, 58, 3, 5, 1965, '2019-03-01', 'Kompletní rekonstrukce 2019: nová kuchyňská linka, koupelna, podlahy', 'Kolaudace 2019/45678', '00000000-0000-0000-0000-000000000001', NOW() - INTERVAL '45 days', NOW() - INTERVAL '2 days'),

('10000000-0000-0000-0000-000000000002', 'Prostorný byt 3+kk, Mánesova', 'Mánesova 28', 'Praha', 'Vinohrady', 'byt', 'active', 9800000, 82, 2, 4, 1930, '2021-06-15', 'Rekonstrukce 2021: původní prvky zachovány, nová elektrika a voda', 'Stavební povolení SP-2021-1234', '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '30 days', NOW() - INTERVAL '1 day'),

('10000000-0000-0000-0000-000000000003', 'Moderní byt 1+kk, Seifertova', 'Seifertova 12', 'Praha', 'Žižkov', 'byt', 'active', 4200000, 38, 4, 6, 2003, NULL, NULL, NULL, '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '20 days', NOW()),

('10000000-0000-0000-0000-000000000004', 'Byt 4+1 s terasou, Plzeňská', 'Plzeňská 45', 'Praha', 'Smíchov', 'byt', 'active', 12500000, 112, 5, 6, 1998, '2020-09-01', 'Kompletní rekonstrukce 2020 včetně terasy', 'ÚR-2020-789', '00000000-0000-0000-0000-000000000001', NOW() - INTERVAL '15 days', NOW()),

('10000000-0000-0000-0000-000000000005', 'Cihlový byt 2+1, Máchova', 'Máchova 8', 'Praha', 'Vinohrady', 'byt', 'active', 7400000, 65, 1, 3, 1912, '2018-01-01', NULL, 'Stavební povolení SP-2018-5678', '00000000-0000-0000-0000-000000000003', NOW() - INTERVAL '60 days', NOW() - INTERVAL '5 days'),

('10000000-0000-0000-0000-000000000006', 'Byt 2+kk, Letohradská', 'Letohradská 22', 'Praha', 'Holešovice', 'byt', 'active', 5800000, 54, 2, 4, 1975, '2022-04-01', 'Nová koupelna a kuchyň 2022', 'Kolaudace 2022/11223', '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', NOW()),

('10000000-0000-0000-0000-000000000007', 'Rodinný dům, Hanspaulka', 'K Hanspaulce 15', 'Praha', 'Dejvice', 'dum', 'active', 17800000, 210, NULL, 2, 1935, '2017-08-01', 'Rozsáhlá rekonstrukce 2017: střecha, fasáda, interiér', 'ÚR-Dejvice-2017-345', '00000000-0000-0000-0000-000000000001', NOW() - INTERVAL '25 days', NOW() - INTERVAL '3 days'),

('10000000-0000-0000-0000-000000000008', 'Komerční prostor, Argentinská', 'Argentinská 18', 'Praha', 'Holešovice', 'komercni', 'active', 8900000, 145, NULL, NULL, 2001, NULL, NULL, NULL, '00000000-0000-0000-0000-000000000003', NOW() - INTERVAL '8 days', NOW()),

('10000000-0000-0000-0000-000000000009', 'Byt 3+1, Blanická', 'Blanická 6', 'Praha', 'Vinohrady', 'byt', 'active', 11200000, 95, 3, 5, 1928, '2023-02-01', 'Kompletní rekonstrukce 2023', 'SP-2023-9876', '00000000-0000-0000-0000-000000000001', NOW() - INTERVAL '5 days', NOW()),

('10000000-0000-0000-0000-000000000010', 'Byt 2+kk, Korunní', 'Korunní 33', 'Praha', 'Vinohrady', 'byt', 'active', 8100000, 68, 4, 5, 1935, '2016-03-01', NULL, NULL, '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '40 days', NOW() - INTERVAL '7 days'),

('10000000-0000-0000-0000-000000000011', 'Moderní byt 1+kk, Cimburkova', 'Cimburkova 9', 'Praha', 'Žižkov', 'byt', 'active', 3800000, 32, 3, 5, 2010, NULL, NULL, 'Kolaudace 2010/44556', '00000000-0000-0000-0000-000000000003', NOW() - INTERVAL '18 days', NOW()),

('10000000-0000-0000-0000-000000000012', 'Byt 2+kk, Dukelských hrdinů', 'Dukelských hrdinů 14', 'Praha', 'Holešovice', 'byt', 'active', 6700000, 61, 1, 3, 1970, '2020-11-01', 'Renovace koupelny a kuchyně 2020', 'Kolaudace 2020/33445', '00000000-0000-0000-0000-000000000001', NOW() - INTERVAL '35 days', NOW() - INTERVAL '4 days'),

('10000000-0000-0000-0000-000000000013', 'Byt 3+kk s balkónem, Štefánikova', 'Štefánikova 41', 'Praha', 'Smíchov', 'byt', 'active', 8600000, 78, 3, 4, 1960, '2019-07-01', NULL, NULL, '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '50 days', NOW() - INTERVAL '6 days'),

('10000000-0000-0000-0000-000000000014', 'Podkrovní byt 2+kk, Milešovská', 'Milešovská 7', 'Praha', 'Žižkov', 'byt', 'active', 5400000, 55, 5, 5, 1905, '2022-09-01', 'Kompletní rekonstrukce podkroví 2022', 'ÚR-Žižkov-2022-123', '00000000-0000-0000-0000-000000000003', NOW() - INTERVAL '12 days', NOW()),

('10000000-0000-0000-0000-000000000015', 'Byt 2+1, Verdunská', 'Verdunská 16', 'Praha', 'Dejvice', 'byt', 'active', 7200000, 62, 2, 3, 1955, '2015-05-01', NULL, NULL, '00000000-0000-0000-0000-000000000001', NOW() - INTERVAL '55 days', NOW() - INTERVAL '10 days'),

-- PENDING (5)
('10000000-0000-0000-0000-000000000016', 'Byt 3+1, Chelčického', 'Chelčického 12', 'Praha', 'Žižkov', 'byt', 'pending', 8300000, 80, 2, 4, 1922, '2021-03-01', 'Rekonstrukce 2021: koupelna, kuchyň, podlahy', 'SP-2021-5544', '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '90 days', NOW() - INTERVAL '14 days'),

('10000000-0000-0000-0000-000000000017', 'Rodinný dům, Bubeneč', 'Nad Pahorkem 8', 'Praha', 'Dejvice', 'dum', 'pending', 15200000, 185, NULL, 2, 1948, '2023-05-01', 'Nová střecha a okna 2023', 'ÚR-2023-6789', '00000000-0000-0000-0000-000000000001', NOW() - INTERVAL '70 days', NOW() - INTERVAL '7 days'),

('10000000-0000-0000-0000-000000000018', 'Byt 2+kk, Fügnerovo náměstí', 'Fügnerovo nám. 3', 'Praha', 'Vinohrady', 'byt', 'pending', 9100000, 72, 4, 5, 1926, '2018-12-01', NULL, 'Kolaudace 1926, ÚR-1999-1122 (přestavba)', '00000000-0000-0000-0000-000000000003', NOW() - INTERVAL '65 days', NOW() - INTERVAL '5 days'),

('10000000-0000-0000-0000-000000000019', 'Komerční prostor, Holečkova', 'Holečkova 31', 'Praha', 'Smíchov', 'komercni', 'pending', 5600000, 88, NULL, NULL, 1990, NULL, NULL, NULL, '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '80 days', NOW() - INTERVAL '20 days'),

('10000000-0000-0000-0000-000000000020', 'Byt 4+kk, Nábřeží Edvarda Beneše', 'Nábřeží E. Beneše 22', 'Praha', 'Holešovice', 'byt', 'pending', 13800000, 118, 6, 8, 2005, NULL, NULL, 'Kolaudace 2005/88990', '00000000-0000-0000-0000-000000000001', NOW() - INTERVAL '85 days', NOW() - INTERVAL '3 days'),

-- SOLD (4)
('10000000-0000-0000-0000-000000000021', 'Byt 2+kk, Mánesova — prodáno', 'Mánesova 52', 'Praha', 'Vinohrady', 'byt', 'sold', 7800000, 64, 3, 4, 1932, '2020-02-01', 'Rekonstrukce 2020', 'SP-2020-2233', '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '180 days', NOW() - INTERVAL '30 days'),

('10000000-0000-0000-0000-000000000022', 'Byt 3+1, Žižkova — prodáno', 'Žižkova 4', 'Praha', 'Žižkov', 'byt', 'sold', 7100000, 75, 1, 3, 1955, '2017-09-01', 'Rekonstrukce 2017', 'SP-2017-7788', '00000000-0000-0000-0000-000000000001', NOW() - INTERVAL '160 days', NOW() - INTERVAL '45 days'),

('10000000-0000-0000-0000-000000000023', 'Dům Smíchov — prodáno', 'Na Příkopě 9', 'Praha', 'Smíchov', 'dum', 'sold', 16500000, 220, NULL, 2, 1960, '2022-01-01', 'Celková rekonstrukce 2022', 'ÚR-2022-4455', '00000000-0000-0000-0000-000000000003', NOW() - INTERVAL '120 days', NOW() - INTERVAL '60 days'),

('10000000-0000-0000-0000-000000000024', 'Byt 2+kk, Dejvice — prodáno', 'Jugoslávských partyzánů 5', 'Praha', 'Dejvice', 'byt', 'sold', 6900000, 57, 2, 5, 1978, '2021-10-01', 'Rekonstrukce koupelny 2021', 'Kolaudace 2021/55667', '00000000-0000-0000-0000-000000000001', NOW() - INTERVAL '150 days', NOW() - INTERVAL '90 days'),

-- WITHDRAWN (1)
('10000000-0000-0000-0000-000000000025', 'Byt 1+1, Korunní — staženo', 'Korunní 71', 'Praha', 'Vinohrady', 'byt', 'withdrawn', 5100000, 42, 5, 5, 1940, NULL, NULL, NULL, '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '200 days', NOW() - INTERVAL '100 days');

-- -------------------------
-- CLIENTS (20 total)
-- Sources: 8 referral, 6 sreality, 3 bezrealitky, 2 direct, 1 social
-- -------------------------
INSERT INTO clients (id, full_name, email, phone, source, notes, assigned_agent_id, created_at) VALUES
('20000000-0000-0000-0000-000000000001', 'Pavel Kratochvíl', 'p.kratochvil@email.cz', '+420 602 111 222', 'referral', 'Zájem o 2+kk v Holešovicích, max 7M Kč', '00000000-0000-0000-0000-000000000001', NOW() - INTERVAL '3 months'),
('20000000-0000-0000-0000-000000000002', 'Lenka Procházková', 'lenka.prochazka@gmail.com', '+420 737 444 555', 'sreality', 'Hledá byt pro rodinu, 3+kk+, Vinohrady nebo Žižkov', '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '2 months' - INTERVAL '15 days'),
('20000000-0000-0000-0000-000000000003', 'Martin Blažek', 'martin.blazek@firma.cz', '+420 723 666 777', 'referral', 'Investor, zájem o komerční prostory', '00000000-0000-0000-0000-000000000001', NOW() - INTERVAL '4 months'),
('20000000-0000-0000-0000-000000000004', 'Eva Horáčková', 'eva.horackova@seznam.cz', '+420 608 888 999', 'bezrealitky', 'Zájem o podkrovní byt, kreativní profese', '00000000-0000-0000-0000-000000000003', NOW() - INTERVAL '1 month' - INTERVAL '20 days'),
('20000000-0000-0000-0000-000000000005', 'Jiří Sedláček', 'j.sedlacek@email.cz', '+420 775 123 456', 'referral', 'Manažer, rozpočet 10-13M, chce Vinohrady', '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '5 months'),
('20000000-0000-0000-0000-000000000006', 'Andrea Málková', 'andrea.malkova@gmail.com', '+420 604 234 567', 'direct', 'Zájem o rodinný dům, Dejvice nebo Bubeneč', '00000000-0000-0000-0000-000000000001', NOW() - INTERVAL '2 months'),
('20000000-0000-0000-0000-000000000007', 'Ondřej Fiala', 'ondrej.fiala@outlook.com', '+420 739 345 678', 'sreality', 'Hledá 1+kk jako investici k pronájmu', '00000000-0000-0000-0000-000000000003', NOW() - INTERVAL '6 weeks'),
('20000000-0000-0000-0000-000000000008', 'Petra Novotná', 'petra.novotna@email.cz', '+420 603 456 789', 'sreality', '2+kk, max 7M, Smíchov nebo Holešovice', '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '5 weeks'),
('20000000-0000-0000-0000-000000000009', 'Radek Krejčí', 'radek.krejci@firma.cz', '+420 736 567 890', 'referral', 'Zájem o prémiové bydlení, VP 12-18M', '00000000-0000-0000-0000-000000000001', NOW() - INTERVAL '3 months' - INTERVAL '10 days'),
('20000000-0000-0000-0000-000000000010', 'Hana Vlčková', 'hana.vlckova@gmail.com', '+420 605 678 901', 'bezrealitky', 'Mladý pár, první koupě, max 6.5M', '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '4 weeks'),
('20000000-0000-0000-0000-000000000011', 'Tomáš Mareš', 'tomas.mares@email.cz', '+420 724 789 012', 'referral', 'Zájem o 3+1 pro rodinu s dětmi', '00000000-0000-0000-0000-000000000003', NOW() - INTERVAL '10 weeks'),
('20000000-0000-0000-0000-000000000012', 'Lucie Kopecká', 'lucie.kopecka@seznam.cz', '+420 607 890 123', 'social', 'Instagram follower, zájem o Vinohrady', '00000000-0000-0000-0000-000000000001', NOW() - INTERVAL '3 weeks'),
('20000000-0000-0000-0000-000000000013', 'Michal Veselý', 'michal.vesely@gmail.com', '+420 730 901 234', 'sreality', 'Zájem o 2+kk v Holešovicích', '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '2 weeks'),
('20000000-0000-0000-0000-000000000014', 'Jana Benešová', 'jana.benesova@email.cz', '+420 602 012 345', 'referral', 'Zájem o dům nebo velký byt', '00000000-0000-0000-0000-000000000001', NOW() - INTERVAL '7 months'),
('20000000-0000-0000-0000-000000000015', 'Petr Šimánek', 'petr.simanek@firma.cz', '+420 737 123 456', 'bezrealitky', 'Zájem o komerční prostor', '00000000-0000-0000-0000-000000000003', NOW() - INTERVAL '9 weeks'),
('20000000-0000-0000-0000-000000000016', 'Karolína Dvořáčková', 'k.dvorackova@gmail.com', '+420 606 234 567', 'direct', 'Expat, zájem o prémiový byt, platí EUR', '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '5 weeks'),
('20000000-0000-0000-0000-000000000017', 'Vladimír Pokorný', 'v.pokorny@email.cz', '+420 722 345 678', 'referral', 'Hledá byt pro dceru (studentka), max 5M', '00000000-0000-0000-0000-000000000001', NOW() - INTERVAL '6 weeks'),
('20000000-0000-0000-0000-000000000018', 'Barbora Čermáková', 'b.cermakova@seznam.cz', '+420 609 456 789', 'sreality', '2+kk nebo 3+kk, max 9M', '00000000-0000-0000-0000-000000000003', NOW() - INTERVAL '3 weeks'),
('20000000-0000-0000-0000-000000000019', 'David Pospíšil', 'david.pospisil@gmail.com', '+420 731 567 890', 'sreality', 'Zájem o Žižkov nebo Holešovice', '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days'),
('20000000-0000-0000-0000-000000000020', 'Monika Hrušková', 'monika.hruskova@email.cz', '+420 604 678 901', 'referral', 'VIP klient, zájem o exkluzivní nemovitost', '00000000-0000-0000-0000-000000000001', NOW() - INTERVAL '4 months');

-- -------------------------
-- LEADS (35 total — spread across all statuses and 6 months)
-- -------------------------
INSERT INTO leads (id, client_id, property_id, status, source, assigned_agent_id, first_contact_at, last_contact_at, closed_at, created_at) VALUES
-- closed_won (4 leads)
('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000021', 'closed_won', 'referral', '00000000-0000-0000-0000-000000000002', NOW()-INTERVAL '175 days', NOW()-INTERVAL '35 days', NOW()-INTERVAL '30 days', NOW()-INTERVAL '175 days'),
('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000022', 'closed_won', 'referral', '00000000-0000-0000-0000-000000000001', NOW()-INTERVAL '155 days', NOW()-INTERVAL '50 days', NOW()-INTERVAL '45 days', NOW()-INTERVAL '155 days'),
('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000023', 'closed_won', 'direct', '00000000-0000-0000-0000-000000000003', NOW()-INTERVAL '115 days', NOW()-INTERVAL '65 days', NOW()-INTERVAL '60 days', NOW()-INTERVAL '115 days'),
('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000024', 'closed_won', 'referral', '00000000-0000-0000-0000-000000000001', NOW()-INTERVAL '145 days', NOW()-INTERVAL '95 days', NOW()-INTERVAL '90 days', NOW()-INTERVAL '145 days'),

-- closed_lost (5 leads)
('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000003', 'closed_lost', 'sreality', '00000000-0000-0000-0000-000000000003', NOW()-INTERVAL '90 days', NOW()-INTERVAL '60 days', NOW()-INTERVAL '55 days', NOW()-INTERVAL '90 days'),
('30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000000008', 'closed_lost', 'bezrealitky', '00000000-0000-0000-0000-000000000003', NOW()-INTERVAL '70 days', NOW()-INTERVAL '50 days', NOW()-INTERVAL '45 days', NOW()-INTERVAL '70 days'),
('30000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000025', 'closed_lost', 'bezrealitky', '00000000-0000-0000-0000-000000000002', NOW()-INTERVAL '185 days', NOW()-INTERVAL '110 days', NOW()-INTERVAL '100 days', NOW()-INTERVAL '185 days'),
('30000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000017', '10000000-0000-0000-0000-000000000015', 'closed_lost', 'referral', '00000000-0000-0000-0000-000000000001', NOW()-INTERVAL '80 days', NOW()-INTERVAL '55 days', NOW()-INTERVAL '50 days', NOW()-INTERVAL '80 days'),
('30000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000013', 'closed_lost', 'referral', '00000000-0000-0000-0000-000000000003', NOW()-INTERVAL '95 days', NOW()-INTERVAL '70 days', NOW()-INTERVAL '65 days', NOW()-INTERVAL '95 days'),

-- offer_made (3 leads)
('30000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000020', '10000000-0000-0000-0000-000000000007', 'offer_made', 'referral', '00000000-0000-0000-0000-000000000001', NOW()-INTERVAL '25 days', NOW()-INTERVAL '3 days', NULL, NOW()-INTERVAL '25 days'),
('30000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000002', 'offer_made', 'referral', '00000000-0000-0000-0000-000000000002', NOW()-INTERVAL '30 days', NOW()-INTERVAL '5 days', NULL, NOW()-INTERVAL '30 days'),
('30000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000016', '10000000-0000-0000-0000-000000000009', 'offer_made', 'direct', '00000000-0000-0000-0000-000000000001', NOW()-INTERVAL '20 days', NOW()-INTERVAL '2 days', NULL, NOW()-INTERVAL '20 days'),

-- viewing_scheduled (5 leads)
('30000000-0000-0000-0000-000000000013', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'viewing_scheduled', 'referral', '00000000-0000-0000-0000-000000000001', NOW()-INTERVAL '10 days', NOW()-INTERVAL '1 day', NULL, NOW()-INTERVAL '10 days'),
('30000000-0000-0000-0000-000000000014', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000009', 'viewing_scheduled', 'sreality', '00000000-0000-0000-0000-000000000002', NOW()-INTERVAL '8 days', NOW()-INTERVAL '2 days', NULL, NOW()-INTERVAL '8 days'),
('30000000-0000-0000-0000-000000000015', '20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000014', 'viewing_scheduled', 'bezrealitky', '00000000-0000-0000-0000-000000000003', NOW()-INTERVAL '6 days', NOW()-INTERVAL '1 day', NULL, NOW()-INTERVAL '6 days'),
('30000000-0000-0000-0000-000000000016', '20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000010', 'viewing_scheduled', 'social', '00000000-0000-0000-0000-000000000001', NOW()-INTERVAL '12 days', NOW()-INTERVAL '3 days', NULL, NOW()-INTERVAL '12 days'),
('30000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000018', '10000000-0000-0000-0000-000000000006', 'viewing_scheduled', 'sreality', '00000000-0000-0000-0000-000000000002', NOW()-INTERVAL '5 days', NOW()-INTERVAL '1 day', NULL, NOW()-INTERVAL '5 days'),

-- contacted (8 leads)
('30000000-0000-0000-0000-000000000018', '20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000012', 'contacted', 'sreality', '00000000-0000-0000-0000-000000000002', NOW()-INTERVAL '14 days', NOW()-INTERVAL '7 days', NULL, NOW()-INTERVAL '14 days'),
('30000000-0000-0000-0000-000000000019', '20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000017', 'contacted', 'direct', '00000000-0000-0000-0000-000000000001', NOW()-INTERVAL '18 days', NOW()-INTERVAL '10 days', NULL, NOW()-INTERVAL '18 days'),
('30000000-0000-0000-0000-000000000020', '20000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000001', 'contacted', 'sreality', '00000000-0000-0000-0000-000000000002', NOW()-INTERVAL '9 days', NOW()-INTERVAL '4 days', NULL, NOW()-INTERVAL '9 days'),
('30000000-0000-0000-0000-000000000021', '20000000-0000-0000-0000-000000000019', '10000000-0000-0000-0000-000000000003', 'contacted', 'sreality', '00000000-0000-0000-0000-000000000003', NOW()-INTERVAL '7 days', NOW()-INTERVAL '3 days', NULL, NOW()-INTERVAL '7 days'),
('30000000-0000-0000-0000-000000000022', '20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000016', 'contacted', 'referral', '00000000-0000-0000-0000-000000000003', NOW()-INTERVAL '22 days', NOW()-INTERVAL '12 days', NULL, NOW()-INTERVAL '22 days'),
('30000000-0000-0000-0000-000000000023', '20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000020', 'contacted', 'referral', '00000000-0000-0000-0000-000000000002', NOW()-INTERVAL '16 days', NOW()-INTERVAL '8 days', NULL, NOW()-INTERVAL '16 days'),
('30000000-0000-0000-0000-000000000024', '20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000019', 'contacted', 'direct', '00000000-0000-0000-0000-000000000001', NOW()-INTERVAL '28 days', NOW()-INTERVAL '14 days', NULL, NOW()-INTERVAL '28 days'),
('30000000-0000-0000-0000-000000000025', '20000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000000004', 'contacted', 'bezrealitky', '00000000-0000-0000-0000-000000000003', NOW()-INTERVAL '35 days', NOW()-INTERVAL '20 days', NULL, NOW()-INTERVAL '35 days'),

-- new (10 leads)
('30000000-0000-0000-0000-000000000026', '20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000011', 'new', 'sreality', '00000000-0000-0000-0000-000000000003', NOW()-INTERVAL '2 days', NOW()-INTERVAL '2 days', NULL, NOW()-INTERVAL '2 days'),
('30000000-0000-0000-0000-000000000027', '20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000005', 'new', 'bezrealitky', '00000000-0000-0000-0000-000000000002', NOW()-INTERVAL '1 day', NOW()-INTERVAL '1 day', NULL, NOW()-INTERVAL '1 day'),
('30000000-0000-0000-0000-000000000028', '20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000006', 'new', 'bezrealitky', '00000000-0000-0000-0000-000000000003', NOW()-INTERVAL '3 days', NOW()-INTERVAL '3 days', NULL, NOW()-INTERVAL '3 days'),
('30000000-0000-0000-0000-000000000029', '20000000-0000-0000-0000-000000000017', '10000000-0000-0000-0000-000000000003', 'new', 'referral', '00000000-0000-0000-0000-000000000001', NOW()-INTERVAL '4 days', NOW()-INTERVAL '4 days', NULL, NOW()-INTERVAL '4 days'),
('30000000-0000-0000-0000-000000000030', '20000000-0000-0000-0000-000000000016', '10000000-0000-0000-0000-000000000002', 'new', 'direct', '00000000-0000-0000-0000-000000000002', NOW()-INTERVAL '5 days', NOW()-INTERVAL '5 days', NULL, NOW()-INTERVAL '5 days'),
('30000000-0000-0000-0000-000000000031', '20000000-0000-0000-0000-000000000018', '10000000-0000-0000-0000-000000000015', 'new', 'sreality', '00000000-0000-0000-0000-000000000002', NOW(), NOW(), NULL, NOW()),
('30000000-0000-0000-0000-000000000032', '20000000-0000-0000-0000-000000000019', '10000000-0000-0000-0000-000000000011', 'new', 'sreality', '00000000-0000-0000-0000-000000000003', NOW(), NOW(), NULL, NOW()),
('30000000-0000-0000-0000-000000000033', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000012', 'new', 'referral', '00000000-0000-0000-0000-000000000001', NOW()-INTERVAL '6 hours', NOW()-INTERVAL '6 hours', NULL, NOW()-INTERVAL '6 hours'),
('30000000-0000-0000-0000-000000000034', '20000000-0000-0000-0000-000000000020', '10000000-0000-0000-0000-000000000004', 'new', 'referral', '00000000-0000-0000-0000-000000000001', NOW()-INTERVAL '12 hours', NOW()-INTERVAL '12 hours', NULL, NOW()-INTERVAL '12 hours'),
('30000000-0000-0000-0000-000000000035', '20000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000007', 'new', 'referral', '00000000-0000-0000-0000-000000000001', NOW()-INTERVAL '8 hours', NOW()-INTERVAL '8 hours', NULL, NOW()-INTERVAL '8 hours');

-- -------------------------
-- ACTIVITIES (sample — 20 activities)
-- -------------------------
INSERT INTO activities (id, type, title, description, related_to_type, related_to_id, performed_by, scheduled_at, completed_at, created_at) VALUES
('40000000-0000-0000-0000-000000000001', 'call', 'Úvodní hovor — Pavel Kratochvíl', 'Zájem potvrzen, domluvena prohlídka', 'lead', '30000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', NOW()-INTERVAL '9 days', NOW()-INTERVAL '9 days', NOW()-INTERVAL '9 days'),
('40000000-0000-0000-0000-000000000002', 'viewing', 'Prohlídka Osadní 35', 'Klient spokojený, žádá o technické podklady', 'property', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', NOW()-INTERVAL '5 days', NOW()-INTERVAL '5 days', NOW()-INTERVAL '5 days'),
('40000000-0000-0000-0000-000000000003', 'email', 'E-mail s podklady — Kratochvíl', 'Zaslány technické listy a energetický štítek', 'lead', '30000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', NOW()-INTERVAL '4 days', NOW()-INTERVAL '4 days', NOW()-INTERVAL '4 days'),
('40000000-0000-0000-0000-000000000004', 'call', 'Telefonát — Lenka Procházková', 'Zájem o Blanická 6, zaslána prohlídka', 'lead', '30000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000002', NOW()-INTERVAL '7 days', NOW()-INTERVAL '7 days', NOW()-INTERVAL '7 days'),
('40000000-0000-0000-0000-000000000005', 'viewing', 'Prohlídka Mánesova 28', 'Klientka nadšena, přemýšlí nad nabídkou', 'property', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', NOW()-INTERVAL '3 days', NOW()-INTERVAL '3 days', NOW()-INTERVAL '3 days'),
('40000000-0000-0000-0000-000000000006', 'offer', 'Nabídka — Jiří Sedláček', 'Nabídka 9.5M Kč na Mánesova, čekáme na odpověď', 'lead', '30000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000002', NOW()-INTERVAL '5 days', NOW()-INTERVAL '5 days', NOW()-INTERVAL '5 days'),
('40000000-0000-0000-0000-000000000007', 'contract', 'Podpis smlouvy — Radek Krejčí', 'Rezervační smlouva podepsána', 'lead', '30000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', NOW()-INTERVAL '3 days', NOW()-INTERVAL '3 days', NOW()-INTERVAL '3 days'),
('40000000-0000-0000-0000-000000000008', 'note', 'Interní poznámka — Holešovice trh', 'Trh v Holešovicích velmi aktivní, ceny rostou ~3% QoQ', 'property', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', NOW()-INTERVAL '2 days', NOW()-INTERVAL '2 days', NOW()-INTERVAL '2 days'),
('40000000-0000-0000-0000-000000000009', 'call', 'Hovor — Eva Horáčková', 'Zájem potvrzen, prohlídka naplánována na příští týden', 'lead', '30000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000003', NOW()-INTERVAL '6 days', NOW()-INTERVAL '6 days', NOW()-INTERVAL '6 days'),
('40000000-0000-0000-0000-000000000010', 'viewing', 'Prohlídka Milešovská 7', 'Klientka chce vidět i druhý pokoj — domluvena další prohlídka', 'property', '10000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000003', NOW()-INTERVAL '2 days', NOW()-INTERVAL '2 days', NOW()-INTERVAL '2 days'),
('40000000-0000-0000-0000-000000000011', 'task', 'Doplnit stavební dokumentaci — Argentinská 18', 'Klient žádal certifikát energetické náročnosti', 'property', '10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000003', NOW()+INTERVAL '2 days', NULL, NOW()-INTERVAL '1 day'),
('40000000-0000-0000-0000-000000000012', 'email', 'Nabídka zaslána — Monika Hrušková', 'Poslán přehled tří nejvhodnějších nemovitostí', 'client', '20000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', NOW()-INTERVAL '11 hours', NOW()-INTERVAL '11 hours', NOW()-INTERVAL '11 hours'),
('40000000-0000-0000-0000-000000000013', 'call', 'Hovor — nový lead Michal Veselý', 'Přišel ze Sreality, zájem o Holešovice do 7.5M', 'lead', '30000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000002', NOW()-INTERVAL '8 hours', NOW()-INTERVAL '8 hours', NOW()-INTERVAL '8 hours'),
('40000000-0000-0000-0000-000000000014', 'note', 'Poznámka — sezónní aktivita', 'Jaro 2025: zvýšený zájem, 3 nové leady za poslední týden', 'lead', '30000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000001', NOW()-INTERVAL '4 hours', NOW()-INTERVAL '4 hours', NOW()-INTERVAL '4 hours'),
('40000000-0000-0000-0000-000000000015', 'viewing', 'Prohlídka Korunní 33', 'Zájem dvojice, žádají informace o hypotéce', 'property', '10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', NOW()-INTERVAL '3 days', NOW()-INTERVAL '3 days', NOW()-INTERVAL '3 days');

-- -------------------------
-- MONITORING JOBS (3 active)
-- -------------------------
INSERT INTO monitoring_jobs (id, name, locations, enabled, notify_telegram, schedule, last_run_at, next_run_at, created_at) VALUES
('50000000-0000-0000-0000-000000000001', 'Praha Holešovice — byty do 8M', ARRAY['Praha Holešovice'], true, true, 'daily_morning', NOW()-INTERVAL '1 day', NOW()+INTERVAL '23 hours', NOW()-INTERVAL '30 days'),
('50000000-0000-0000-0000-000000000002', 'Praha Vinohrady — byty 3+kk a větší', ARRAY['Praha Vinohrady'], true, true, 'daily_morning', NOW()-INTERVAL '1 day', NOW()+INTERVAL '23 hours', NOW()-INTERVAL '25 days'),
('50000000-0000-0000-0000-000000000003', 'Praha Žižkov — všechny typy', ARRAY['Praha Žižkov'], true, false, 'daily_morning', NOW()-INTERVAL '1 day', NOW()+INTERVAL '23 hours', NOW()-INTERVAL '20 days');

-- -------------------------
-- MARKET LISTINGS (sample scraped data — 15 listings)
-- -------------------------
INSERT INTO market_listings (id, source, external_id, title, address, district, price, area_m2, url, is_new, first_seen_at, last_seen_at, created_at) VALUES
('60000000-0000-0000-0000-000000000001', 'sreality', 'sr-123456', 'Byt 2+kk, 56 m², Praha 7', 'Janovského 22, Praha 7', 'Holešovice', 6500000, 56, 'https://www.sreality.cz/detail/prodej/byt/2+kk/praha-holesovice-janovskeho/123456', true, NOW()-INTERVAL '6 hours', NOW()-INTERVAL '6 hours', NOW()-INTERVAL '6 hours'),
('60000000-0000-0000-0000-000000000002', 'bezrealitky', 'bz-789012', 'Byt 3+kk s terasou, Praha 7', 'Strojnická 8, Praha 7', 'Holešovice', 8900000, 80, 'https://www.bezrealitky.cz/nemovitosti-byty-domy/789012', true, NOW()-INTERVAL '8 hours', NOW()-INTERVAL '8 hours', NOW()-INTERVAL '8 hours'),
('60000000-0000-0000-0000-000000000003', 'sreality', 'sr-234567', 'Byt 2+1, 68 m², Praha 7', 'Antonínská 14, Praha 7', 'Holešovice', 7200000, 68, 'https://www.sreality.cz/detail/prodej/byt/234567', true, NOW()-INTERVAL '3 hours', NOW()-INTERVAL '3 hours', NOW()-INTERVAL '3 hours'),
('60000000-0000-0000-0000-000000000004', 'sreality', 'sr-345678', 'Byt 3+1, 88 m², Vinohrady', 'Mánesova 71, Praha 2', 'Vinohrady', 10500000, 88, 'https://www.sreality.cz/detail/prodej/byt/345678', true, NOW()-INTERVAL '5 hours', NOW()-INTERVAL '5 hours', NOW()-INTERVAL '5 hours'),
('60000000-0000-0000-0000-000000000005', 'bezrealitky', 'bz-456789', 'Cihlový byt 2+kk, Žižkov', 'Seifertova 45, Praha 3', 'Žižkov', 4800000, 52, 'https://www.bezrealitky.cz/nemovitosti-byty-domy/456789', false, NOW()-INTERVAL '3 days', NOW()-INTERVAL '5 hours', NOW()-INTERVAL '3 days'),
('60000000-0000-0000-0000-000000000006', 'sreality', 'sr-567890', 'Byt 1+kk, 35 m², Žižkov', 'Pražačka 3, Praha 3', 'Žižkov', 3900000, 35, 'https://www.sreality.cz/detail/prodej/byt/567890', false, NOW()-INTERVAL '5 days', NOW()-INTERVAL '5 hours', NOW()-INTERVAL '5 days'),
('60000000-0000-0000-0000-000000000007', 'sreality', 'sr-678901', 'Byt 4+kk, 115 m², Vinohrady', 'Blanická 28, Praha 2', 'Vinohrady', 14200000, 115, 'https://www.sreality.cz/detail/prodej/byt/678901', false, NOW()-INTERVAL '7 days', NOW()-INTERVAL '7 hours', NOW()-INTERVAL '7 days'),
('60000000-0000-0000-0000-000000000008', 'bezrealitky', 'bz-789123', 'Novostavba 2+kk, Holešovice', 'Dělnická 55, Praha 7', 'Holešovice', 7800000, 62, 'https://www.bezrealitky.cz/nemovitosti-byty-domy/789123', false, NOW()-INTERVAL '4 days', NOW()-INTERVAL '4 hours', NOW()-INTERVAL '4 days'),
('60000000-0000-0000-0000-000000000009', 'sreality', 'sr-890234', 'Byt 2+kk, balkon, Smíchov', 'Štefánikova 22, Praha 5', 'Smíchov', 6100000, 59, 'https://www.sreality.cz/detail/prodej/byt/890234', false, NOW()-INTERVAL '6 days', NOW()-INTERVAL '6 hours', NOW()-INTERVAL '6 days'),
('60000000-0000-0000-0000-000000000010', 'sreality', 'sr-901345', 'Byt 3+kk, zahrada, Dejvice', 'Lotyšská 8, Praha 6', 'Dejvice', 11800000, 90, 'https://www.sreality.cz/detail/prodej/byt/901345', false, NOW()-INTERVAL '2 days', NOW()-INTERVAL '2 hours', NOW()-INTERVAL '2 days');
