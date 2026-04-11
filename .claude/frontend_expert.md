# Frontend Expert

## Stack
- Next.js 15 (App Router) with TypeScript
- Tailwind CSS v4 for styling
- shadcn/ui for primitive components
- Recharts for data visualisations
- Tanstack Query (React Query) v5 for server state
- Zustand for minimal client state
- React Hook Form + Zod for forms

## Next.js App Router conventions
```
src/app/
  layout.tsx                  # Root layout — providers, fonts, metadata
  page.tsx                    # Landing page (public)
  (auth)/
    login/page.tsx
    callback/route.ts          # Supabase OAuth callback
  (dashboard)/
    layout.tsx                 # Dashboard layout with sidebar
    dashboard/page.tsx
    properties/
      page.tsx                 # Properties list
      [id]/page.tsx            # Property detail
    clients/page.tsx
    reports/page.tsx
  api/
    agent/
      chat/route.ts            # Main AI agent endpoint (streaming)
    telegram/
      webhook/route.ts         # Telegram bot webhook
    monitoring/
      scrape/route.ts          # Triggered by Supabase cron
```

## Component architecture
- Server Components by default — add `'use client'` only when needed
- Reason to use `'use client'`: event listeners, browser APIs, React state/hooks, streaming UI
- Data fetching in Server Components — pass data down as props
- Mutations via Server Actions — colocate with the component that triggers them

```typescript
// Server Component — data fetched at request time, no client JS
export default async function PropertiesPage() {
  const properties = await getProperties()   // direct Supabase query
  return <PropertyTable data={properties} />
}

// Client Component — only what needs interactivity
'use client'
export function PropertyTable({ data }: { data: Property[] }) {
  const [filter, setFilter] = useState<PropertyStatus | 'all'>('all')
  // ...
}
```

## Streaming AI responses
```typescript
// API route — stream Claude response to client
export async function POST(req: Request) {
  const stream = await anthropic.messages.stream({ ... })

  return new Response(
    new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta') {
            controller.enqueue(new TextEncoder().encode(chunk.delta.text))
          }
        }
        controller.close()
      }
    }),
    { headers: { 'Content-Type': 'text/event-stream' } }
  )
}

// Client — consume stream
'use client'
async function sendMessage(message: string) {
  const res = await fetch('/api/agent/chat', { method: 'POST', body: JSON.stringify({ message }) })
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let text = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    text += decoder.decode(value)
    setResponse(text)   // update UI incrementally
  }
}
```

## Data fetching patterns
```typescript
// Server Action for mutations
'use server'
export async function updatePropertyStatus(id: string, status: PropertyStatus) {
  const supabase = createServerClient(...)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorised')

  const { error } = await supabase
    .from('properties')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/properties')
}
```

## Chart components (Recharts)
```typescript
// Reusable chart wrapper — always responsive
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts'

export function LeadTrendChart({ data }: { data: LeadTrendData[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data}>
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Line type="monotone" dataKey="leads" stroke="#6366F1" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="sold" stroke="#10B981" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

## Performance rules
- Images: always use `next/image` with explicit `width` and `height`
- Dynamic imports for heavy components: `dynamic(() => import('./HeavyChart'))`
- Avoid `useEffect` for data fetching — use Server Components or React Query
- Memoize expensive computations with `useMemo`, not `useCallback` for everything
- Use `Suspense` boundaries around async Server Components

## Accessibility
- All interactive elements keyboard-accessible
- `aria-label` on icon-only buttons
- Color is never the only indicator of state — use text/icons too
- Form inputs always have associated `<label>`
- Focus rings visible — never `outline: none` without a replacement

## Metadata and SEO
```typescript
// app/layout.tsx
export const metadata: Metadata = {
  title: { template: '%s | Pepa', default: 'Pepa — Back Office Agent' },
  description: 'AI-powered back office for real estate teams',
}
```

## Loading and error states
- Every async page gets a `loading.tsx` sibling (Suspense boundary)
- Every route segment gets an `error.tsx` sibling
- Skeleton loaders match the layout of the loaded content — no generic spinners

## Tailwind conventions
- Use design system tokens — not arbitrary values
- Extract repeated class combinations into components, not `@apply`
- Responsive: mobile-first (`md:`, `lg:` prefixes)
- Dark mode: `dark:` prefix — always test both modes
