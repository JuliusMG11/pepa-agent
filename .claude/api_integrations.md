# API Integrations

All external API integrations used by Pepa. Each section covers: setup, auth, key endpoints, error handling, and gotchas.

---

## 1. Anthropic Claude API

**Docs:** https://docs.anthropic.com/en/api/messages

### Setup
```typescript
// src/lib/claude/client.ts
import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})
```

### Streaming message with tool use
```typescript
// src/lib/claude/agent.ts
export async function runAgent(params: {
  messages: Anthropic.MessageParam[]
  systemPrompt: string
  onText: (text: string) => void
  onToolCall: (name: string, input: Record<string, unknown>) => Promise<unknown>
  onEvent: (type: string, payload: unknown) => void
}) {
  const tools = getAllToolDefinitions()
  let continueLoop = true
  const allMessages = [...params.messages]

  while (continueLoop) {
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: params.systemPrompt,
      messages: allMessages,
      tools,
    })

    let assistantContent: Anthropic.ContentBlock[] = []

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        params.onText(event.delta.text)
      }
      if (event.type === 'message_delta' && event.delta.stop_reason === 'tool_use') {
        const response = await stream.finalMessage()
        assistantContent = response.content

        // Add assistant turn to history
        allMessages.push({ role: 'assistant', content: assistantContent })

        // Execute all tool calls in parallel
        const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
          assistantContent
            .filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
            .map(async (toolUse) => {
              const result = await params.onToolCall(toolUse.name, toolUse.input as Record<string, unknown>)

              // Emit rich events for special tools
              if (toolUse.name === 'render_chart') params.onEvent('chart', result)
              if (toolUse.name === 'draft_email') params.onEvent('email', result)
              if (toolUse.name === 'create_presentation') params.onEvent('download', result)

              return {
                type: 'tool_result' as const,
                tool_use_id: toolUse.id,
                content: JSON.stringify(result),
              }
            })
        )

        // Add tool results to history
        allMessages.push({ role: 'user', content: toolResults })
      }
      if (event.type === 'message_delta' && event.delta.stop_reason === 'end_turn') {
        continueLoop = false
      }
    }
  }
}
```

### Model
Always use `claude-sonnet-4-20250514`. Never use `claude-opus` (too slow/expensive for this use case).

### Error handling
```typescript
try {
  await runAgent(...)
} catch (e) {
  if (e instanceof Anthropic.APIError) {
    if (e.status === 429) return { error: 'Příliš mnoho požadavků. Zkus to za chvíli.' }
    if (e.status === 529) return { error: 'Claude API je momentálně přetíženo.' }
  }
  throw e
}
```

---

## 2. Supabase

**Docs:** https://supabase.com/docs

### Client factories (always use these, never instantiate directly)

```typescript
// src/lib/supabase/server.ts — for Server Components, Route Handlers, Server Actions
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createSupabaseServer() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}

// src/lib/supabase/client.ts — for Client Components
import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// src/lib/supabase/service.ts — for Edge Functions and server-only admin ops
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

### Storage — reports bucket
```typescript
// Create bucket once (in migration or setup script)
await supabaseAdmin.storage.createBucket('reports', {
  public: false,
  fileSizeLimit: 10485760, // 10MB
  allowedMimeTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
})

// Upload file
async function uploadReport(userId: string, reportId: string, buffer: Buffer, ext: 'pdf' | 'pptx') {
  const path = `${userId}/${reportId}.${ext}`
  const { error } = await supabaseAdmin.storage
    .from('reports')
    .upload(path, buffer, { contentType: ext === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.presentationml.presentation' })
  if (error) throw error

  const { data } = await supabaseAdmin.storage
    .from('reports')
    .createSignedUrl(path, 60 * 60 * 24 * 7) // 7 days
  return data!.signedUrl
}
```

### Realtime (for live dashboard updates)
```typescript
// Subscribe to new market listings
const channel = supabase
  .channel('market-listings')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'market_listings',
    filter: 'is_new=eq.true',
  }, (payload) => {
    setNewListingsCount(prev => prev + 1)
  })
  .subscribe()

// Cleanup
return () => supabase.removeChannel(channel)
```

---

## 3. Google Calendar API

**Docs:** https://developers.google.com/calendar/api/v3/reference

### OAuth 2.0 setup
1. Google Cloud Console → New project → "Pepa Real Estate"
2. Enable Google Calendar API
3. Create OAuth 2.0 credentials (Web application)
4. Authorised redirect URI: `https://your-domain.com/api/auth/google/callback`
5. Scopes: `https://www.googleapis.com/auth/calendar.readonly`

### OAuth flow implementation
```typescript
// src/lib/google/oauth.ts
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

export function getAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    access_type: 'offline',  // IMPORTANT: needed for refresh_token
    prompt: 'consent',       // IMPORTANT: forces refresh_token on every auth
    state,
  })
  return `${GOOGLE_AUTH_URL}?${params}`
}

export async function exchangeCode(code: string): Promise<{
  access_token: string
  refresh_token: string
  expiry_date: number
  email: string
}> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: 'authorization_code',
    }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error_description)

  // Get email from userinfo
  const userInfo = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
    headers: { Authorization: `Bearer ${data.access_token}` },
  }).then(r => r.json())

  return { ...data, email: userInfo.email }
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string
  expiry_date: number
}> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error_description)
  return data
}
```

### Free/busy query
```typescript
// src/lib/google/calendar.ts
export interface TimeSlot {
  start: string    // ISO string
  end: string      // ISO string
  formatted: string // "středa 23. dubna 10:00–11:00"
}

export async function getFreeSlots(params: {
  accessToken: string
  refreshToken: string
  tokenExpiresAt: Date
  daysAhead: number
  slotDurationMinutes: number
  workStart: string // "09:00"
  workEnd: string   // "18:00"
}): Promise<TimeSlot[]> {
  // Refresh token if needed
  let token = params.accessToken
  if (new Date() >= params.tokenExpiresAt) {
    const refreshed = await refreshAccessToken(params.refreshToken)
    token = refreshed.access_token
    // Update in DB async (don't await — don't block response)
    updateTokenInDb(refreshed).catch(console.error)
  }

  const timeMin = new Date()
  const timeMax = new Date()
  timeMax.setDate(timeMax.getDate() + params.daysAhead)

  const res = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: [{ id: 'primary' }],
    }),
  })

  const data = await res.json()
  const busyPeriods: { start: string; end: string }[] = data.calendars.primary.busy

  // Invert busy → free slots within working hours
  return invertToFreeSlots(busyPeriods, {
    from: timeMin,
    to: timeMax,
    workStart: params.workStart,
    workEnd: params.workEnd,
    slotDuration: params.slotDurationMinutes,
  })
}

function invertToFreeSlots(
  busy: { start: string; end: string }[],
  options: { from: Date; to: Date; workStart: string; workEnd: string; slotDuration: number }
): TimeSlot[] {
  const slots: TimeSlot[] = []
  const current = new Date(options.from)
  current.setHours(0, 0, 0, 0)

  while (current <= options.to) {
    const [startH, startM] = options.workStart.split(':').map(Number)
    const [endH, endM] = options.workEnd.split(':').map(Number)
    let slotStart = new Date(current)
    slotStart.setHours(startH, startM, 0, 0)
    const dayEnd = new Date(current)
    dayEnd.setHours(endH, endM, 0, 0)

    while (slotStart < dayEnd) {
      const slotEnd = new Date(slotStart.getTime() + options.slotDuration * 60000)
      if (slotEnd > dayEnd) break

      const isBlocked = busy.some(b =>
        new Date(b.start) < slotEnd && new Date(b.end) > slotStart
      )

      if (!isBlocked && slotStart > new Date()) {
        slots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          formatted: formatSlotCzech(slotStart, slotEnd),
        })
      }

      slotStart = slotEnd
    }

    current.setDate(current.getDate() + 1)
  }

  return slots.slice(0, 10) // Return max 10 slots
}

function formatSlotCzech(start: Date, end: Date): string {
  const dayName = start.toLocaleDateString('cs-CZ', { weekday: 'long' })
  const date = start.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long' })
  const startTime = start.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
  const endTime = end.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
  return `${dayName} ${date} ${startTime}–${endTime}`
}
```

### Error handling
```typescript
// Google Calendar errors to handle:
// 401 → token expired (refresh and retry once)
// 403 → scope not granted (tell user to reconnect)
// 429 → rate limit (retry after 1s)
if (res.status === 403) {
  return { connected: false, error: 'Přístup k Google Kalendáři byl odmítnut. Znovu propoj v Nastavení.' }
}
```

---

## 4. Telegram Bot API

**Docs:** https://core.telegram.org/bots/api

### Setup
1. Message @BotFather on Telegram
2. `/newbot` → set name "Pepa Realitní Asistent" → username `PepaRealitniBot`
3. Copy token to `TELEGRAM_BOT_TOKEN`
4. Generate webhook secret: `openssl rand -hex 32` → save to `TELEGRAM_WEBHOOK_SECRET`
5. Register webhook (run once after deploy):
```bash
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-domain.com/api/telegram/webhook",
    "secret_token": "'${TELEGRAM_WEBHOOK_SECRET}'"
  }'
```

### Telegram client
```typescript
// src/lib/telegram/client.ts
const BASE_URL = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`

async function call(method: string, body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${BASE_URL}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!data.ok) throw new Error(`Telegram API error: ${data.description}`)
  return data.result
}

export async function sendMessage(chatId: number, text: string, parseMode: 'Markdown' | 'HTML' = 'Markdown') {
  // Telegram Markdown: *bold*, _italic_, `code`, [text](url)
  // Max message length: 4096 characters — split if longer
  const chunks = splitMessage(text, 4096)
  for (const chunk of chunks) {
    await call('sendMessage', { chat_id: chatId, text: chunk, parse_mode: parseMode })
  }
}

export async function sendPhoto(chatId: number, photoBuffer: Buffer, caption?: string) {
  const form = new FormData()
  form.append('chat_id', String(chatId))
  form.append('photo', new Blob([photoBuffer], { type: 'image/png' }), 'chart.png')
  if (caption) form.append('caption', caption)

  const res = await fetch(`${BASE_URL}/sendPhoto`, { method: 'POST', body: form })
  const data = await res.json()
  if (!data.ok) throw new Error(`Telegram sendPhoto error: ${data.description}`)
}

export async function sendDocument(chatId: number, buffer: Buffer, filename: string, caption?: string) {
  const form = new FormData()
  form.append('chat_id', String(chatId))
  form.append('document', new Blob([buffer]), filename)
  if (caption) form.append('caption', caption)

  const res = await fetch(`${BASE_URL}/sendDocument`, { method: 'POST', body: form })
  const data = await res.json()
  if (!data.ok) throw new Error(`Telegram sendDocument error: ${data.description}`)
}

export async function sendChatAction(chatId: number, action: 'typing' | 'upload_document' | 'upload_photo') {
  await call('sendChatAction', { chat_id: chatId, action })
}

function splitMessage(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text]
  const chunks: string[] = []
  while (text.length > 0) {
    chunks.push(text.slice(0, maxLength))
    text = text.slice(maxLength)
  }
  return chunks
}
```

### Formatting for Telegram (different from web markdown)
```typescript
// src/lib/telegram/format.ts
export function formatReportForTelegram(report: ReportData): string {
  return `
📊 *Výsledky ${report.period.label}*

*Leady*
• Nové: ${report.metrics.newLeads}
• Uzavřeno ✓: ${report.metrics.closedWon}
• Uzavřeno ✗: ${report.metrics.closedLost}
• Konverzní poměr: ${(report.metrics.conversionRate * 100).toFixed(1)}%

*Nemovitosti*
• Nové: ${report.metrics.newProperties}
• Prodané: ${report.metrics.soldProperties}
• Průměrná doba uzavření: ${report.metrics.avgDaysToClose} dní

*Klienti*
• Noví: ${report.metrics.newClients}
• Nejúspěšnější agent: ${report.metrics.topAgent.name} (${report.metrics.topAgent.deals} obchodů)
`.trim()
}

export function formatNewListingsForTelegram(location: string, listings: MarketListing[]): string {
  const items = listings.slice(0, 5).map((l, i) =>
    `${i + 1}. ${l.title}\n   ${l.price.toLocaleString('cs-CZ')} Kč · ${l.area_m2} m²\n   [Zobrazit](${l.url})`
  ).join('\n\n')

  return `🏠 *Nové nabídky — ${location}* (${listings.length})\n\n${items}${listings.length > 5 ? `\n\n...a ${listings.length - 5} dalších` : ''}`
}
```

### Webhook update types to handle
```typescript
interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    from: { id: number; first_name: string; username?: string }
    chat: { id: number; type: 'private' | 'group' }
    text?: string
    document?: { file_id: string; file_name: string }
  }
  callback_query?: {
    id: string
    from: { id: number }
    data: string  // action payload from inline keyboard
  }
}
```

---

## 5. Resend (Email)

**Docs:** https://resend.com/docs

### Setup
```typescript
// src/lib/email/client.ts
import { Resend } from 'resend'
export const resend = new Resend(process.env.RESEND_API_KEY!)
```

### Usage — draft email does NOT send automatically
The `draft_email` agent tool only generates the email content.
Actual sending requires explicit user confirmation in the UI.

```typescript
// src/lib/email/send.ts
export async function sendEmail(params: {
  to: string
  subject: string
  body: string
  fromName: string
  replyTo: string
}) {
  const { data, error } = await resend.emails.send({
    from: `${params.fromName} via Pepa <noreply@yourdomain.com>`,
    to: params.to,
    reply_to: params.replyTo,
    subject: params.subject,
    text: params.body,
    // html: renderEmailHtml(params.body), // optional — markdown to HTML
  })
  if (error) throw new Error(error.message)
  return data
}
```

### Domain setup
Add sending domain in Resend dashboard. Add DNS records. Verify.
Without domain verification, emails go to spam.

---

## 6. Sreality scraper

**Note:** Sreality has a public JSON API (no auth required, but respect robots.txt).

```typescript
// src/lib/scraper/sreality.ts
const SREALITY_API = 'https://www.sreality.cz/api/cs/v2/estates'

// Prague district IDs for Sreality API
const DISTRICT_IDS: Record<string, number> = {
  'Praha Holešovice': 5013,
  'Praha Vinohrady': 5015,
  'Praha Žižkov': 5014,
  'Praha Smíchov': 5006,
  'Praha Dejvice': 5016,
  'Praha 1': 5001,
  'Praha 2': 5002,
  'Praha 3': 5003,
  'Praha 7': 5007,
}

// Category IDs: 1=byty, 2=domy, 3=pozemky, 4=komerční
const CATEGORY_IDS: Record<string, number> = {
  byt: 1, dum: 2, pozemek: 3, komercni: 4,
}

export async function scrapeSreality(options: {
  district: string
  propertyType?: string
  priceMax?: number
  limit?: number
}): Promise<MarketListing[]> {
  const districtId = DISTRICT_IDS[options.district]
  if (!districtId) throw new Error(`Unknown district: ${options.district}`)

  const params = new URLSearchParams({
    category_main_cb: String(CATEGORY_IDS[options.propertyType ?? 'byt']),
    category_type_cb: '1', // 1=prodej
    locality_district_id: String(districtId),
    per_page: String(options.limit ?? 20),
    page: '1',
    ...(options.priceMax ? { price_max: String(options.priceMax) } : {}),
  })

  const res = await fetch(`${SREALITY_API}?${params}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; PepaBot/1.0)',
      'Accept': 'application/json',
    },
  })

  if (!res.ok) throw new Error(`Sreality API error: ${res.status}`)
  const data = await res.json()

  return (data._embedded?.estates ?? []).map((e: SrealityEstate) => ({
    source: 'sreality' as const,
    external_id: String(e._links.self.href.split('/').pop()),
    title: e.name,
    address: e.locality,
    district: options.district,
    price: e.price,
    area_m2: e.params?.find((p: { name: string; value: unknown }) => p.name === 'Plocha')?.value ?? null,
    url: `https://www.sreality.cz/detail/prodej/byt/${e._links.self.href.split('/').pop()}`,
    is_new: true,
    first_seen_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
  }))
}
```

---

## 7. Bezrealitky scraper

**Note:** Bezrealitky uses GraphQL.

```typescript
// src/lib/scraper/bezrealitky.ts
const BEZREALITKY_API = 'https://www.bezrealitky.cz/api/graphql'

export async function scrapeBezrealitky(options: {
  district: string
  propertyType?: string
  priceMax?: number
}): Promise<MarketListing[]> {
  const query = `
    query GetListings($filter: AdvertListFilter!) {
      advertList(filter: $filter) {
        list {
          id
          uri
          price { amount }
          surface
          address { city district street streetNumber }
          mainType
          subType
        }
      }
    }
  `

  const variables = {
    filter: {
      offerType: 'PRODEJ',
      estateType: options.propertyType === 'byt' ? 'BYT' : 'DUM',
      locality: [options.district],
      ...(options.priceMax ? { priceMax: options.priceMax } : {}),
      limit: 20,
    },
  }

  const res = await fetch(BEZREALITKY_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })

  const data = await res.json()
  if (data.errors) throw new Error(data.errors[0].message)

  return (data.data?.advertList?.list ?? []).map((item: BezrealitkyItem) => ({
    source: 'bezrealitky' as const,
    external_id: String(item.id),
    title: `${item.mainType} ${item.address.street ?? ''} ${item.address.streetNumber ?? ''}`.trim(),
    address: `${item.address.street ?? ''} ${item.address.streetNumber ?? ''}, ${item.address.city}`.trim(),
    district: options.district,
    price: item.price.amount,
    area_m2: item.surface ?? null,
    url: `https://www.bezrealitky.cz/nemovitosti-byty-domy/${item.uri}`,
    is_new: true,
    first_seen_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
  }))
}
```

### Scraper resilience
```typescript
// Always wrap scrapers — never let one failure block the other
export async function scrapeAll(options: ScraperOptions): Promise<MarketListing[]> {
  const results = await Promise.allSettled([
    scrapeSreality(options),
    scrapeBezrealitky(options),
  ])

  return results
    .filter((r): r is PromiseFulfilledResult<MarketListing[]> => r.status === 'fulfilled')
    .flatMap(r => r.value)
}
```

---

## Integration health checks

Add to `/api/health` endpoint:
```typescript
export async function GET() {
  const checks = await Promise.allSettled([
    supabase.from('profiles').select('count').single().then(() => ({ name: 'supabase', ok: true })),
    fetch('https://api.anthropic.com/v1/messages', { method: 'HEAD' }).then(r => ({ name: 'anthropic', ok: r.ok })),
    fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getMe`).then(r => r.json()).then(d => ({ name: 'telegram', ok: d.ok })),
  ])

  return Response.json({
    status: checks.every(c => c.status === 'fulfilled') ? 'ok' : 'degraded',
    checks: checks.map(c => c.status === 'fulfilled' ? c.value : { name: 'unknown', ok: false }),
    timestamp: new Date().toISOString(),
  })
}
```
