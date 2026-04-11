# Project Business Context

## What is Pepa?
Pepa is an AI-powered Back Office Operations Agent for a Czech/Slovak real estate company. It replaces the manual, repetitive coordination work of a back office manager — aggregating data, drafting communications, generating reports, and monitoring the market.

## The problem being solved
A back office manager ("Pepa") spends their day:
- Manually pulling data from multiple systems to answer management questions
- Writing emails to leads and clients based on calendar availability
- Creating weekly/monthly reports and presentations for leadership
- Tracking down missing property data and chasing colleagues to fill it in
- Monitoring real estate portals for new listings in target areas
- Coordinating between agents, clients, and management

This is high-volume, repeatable, context-dependent work — exactly what an LLM agent is suited for.

## Core user stories

### 1. Natural language data queries
**User says:** "Jaké nové klienty máme za 1. kvartál? Odkud přišli?"
**Agent does:** Queries `clients` table filtered by `created_at` in Q1, joins with `leads.source`, groups by source, returns structured answer + renders a chart in the UI.

### 2. Trend charts and reports
**User says:** "Vytvoř graf vývoje počtu leadů a prodaných nemovitostí za posledních 6 měsíců."
**Agent does:** Queries `leads` and `properties` grouped by month, returns data rendered as a Recharts line chart in the dashboard, optionally exports as a CSV or PDF link.

### 3. Email drafting with calendar context
**User says:** "Napiš e-mail pro zájemce o moji nemovitost a doporuč mu termín prohlídky na základě mé dostupnosti v kalendáři."
**Agent does:** Calls Google Calendar API to fetch free slots in the next 7 days, identifies the property from context, drafts a professional Czech-language email with 2-3 proposed viewing times.

### 4. Data gap detection
**User says:** "Najdi nemovitosti, u kterých nám v systému chybí data o rekonstrukci a stavebních úpravách."
**Agent does:** Queries properties where `reconstruction_notes IS NULL OR permit_data IS NULL`, returns a table of affected properties with address and assigned agent, suggests exporting the list or assigning follow-up tasks.

### 5. Weekly report + presentation
**User says:** "Shrň výsledky minulého týdne do krátkého reportu pro vedení a připrav k tomu prezentaci se třemi slidy."
**Agent does:** Aggregates last week's activities, leads, closings, and revenue. Generates a written summary. Creates a 3-slide PPTX (or PDF) with key metrics, exported to Supabase Storage and returned as a download link.

### 6. Automated market monitoring
**User says:** "Sleduj všechny hlavní realitní servery a každé ráno mě informuj o nových nabídkách v lokalitě Praha Holešovice."
**Agent does:** Saves a monitoring job to the `monitoring_jobs` table. A Supabase Edge Function runs daily at 7:00 AM, scrapes Sreality.cz and Bezrealitky.cz for the configured location, compares against `market_listings` to find new entries, and sends a Telegram notification with a summary and links.

## Telegram integration
Pepa is accessible via a Telegram bot so the user can query the agent from mobile without opening the web app.

- Bot name: `@PepaRealitniBot` (or similar)
- Authorised users: defined by `TELEGRAM_ALLOWED_USER_IDS` env var
- Supported commands:
  - `/start` — welcome message and help
  - `/report` — generate quick weekly summary
  - `/leads` — today's lead activity
  - `/alert [location]` — subscribe to market monitoring for a location
  - Free text — any natural language question routed to the Claude agent
- Responses: text for short answers, photo for charts (rendered server-side), document for PDF reports
- Webhook endpoint: `POST /api/telegram/webhook`

## Data domain

### Properties
Czech/Slovak residential and commercial real estate. Key attributes: address (Prague districts), type (byt/dům/komerční), status (active/pending/sold/withdrawn), price in CZK, area in m², renovation history, permit documentation.

### Clients & Leads
Clients are tracked individuals. Leads link a client to a specific property interest. Sources: referral, portal (Sreality/Bezrealitky/Reality.cz), direct, social media, event.

### Agents
Internal team members. Each property and lead is assigned to an agent. The agent's calendar is accessed via Google Calendar OAuth.

### Market listings
Scraped from external portals. Used for morning briefings and competitive intelligence. Not synced with internal properties — treated as external data.

## Key business metrics tracked
- New clients per period (week/month/quarter)
- Lead conversion rate (lead → closed deal)
- Average days from first contact to close
- Revenue by agent and period
- Active listings by district and type
- Properties with incomplete data (quality score)
- Market price trends by district

## Integrations
| Integration | Purpose | Auth method |
|---|---|---|
| Supabase | Primary DB and auth | Service role (server), anon key (client) |
| Anthropic Claude API | Agent intelligence | API key (server only) |
| Google Calendar | Read agent availability | OAuth 2.0 per user |
| Telegram Bot API | Mobile access | Bot token + webhook secret |
| Sreality.cz | Market monitoring scraping | None (public scraping) |
| Bezrealitky.cz | Market monitoring scraping | None (public scraping) |
| Resend | Email drafts and delivery | API key (server only) |

## Language
- UI: Czech/Slovak (primary), English (secondary for developer-facing parts)
- Agent responses: Czech (matches the language of the input question)
- Code, comments, and documentation: English
- Property addresses: Czech format (street, city, postal code)
- Currency: CZK primary, EUR secondary (for international clients)

## Non-goals (out of scope for MVP)
- Full CRM (Pepa augments existing data, doesn't replace a CRM)
- Accounting or financial transactions
- Legal document generation
- Client-facing portal (internal tool only)
- Mobile app (Telegram covers mobile access)
