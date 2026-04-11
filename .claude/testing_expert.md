# Testing Expert

## Testing philosophy
Test behaviour, not implementation. A test should break when the user experience breaks — not when you refactor internals. Confidence over coverage percentages.

## Stack
- **Vitest** — unit and integration tests (fast, native TypeScript, ESM)
- **React Testing Library** — component tests (user-centric)
- **Playwright** — end-to-end tests (real browser)
- **MSW (Mock Service Worker)** — API mocking in tests

## Test file conventions
```
src/
  lib/
    claude/
      agent.ts
      agent.test.ts        # colocated unit tests
  components/
    features/
      PropertyCard.tsx
      PropertyCard.test.tsx
  __tests__/
    e2e/
      agent-chat.spec.ts   # Playwright e2e tests
    integration/
      supabase.test.ts     # integration tests against test DB
```

## Unit tests — Vitest

```typescript
// lib/claude/tools/query-properties.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { queryPropertiesTool } from './query-properties'

describe('queryPropertiesTool', () => {
  it('returns properties matching the given district', async () => {
    const result = await queryPropertiesTool({ district: 'Holešovice', status: 'active' })
    expect(result.success).toBe(true)
    expect(result.data).toBeInstanceOf(Array)
    result.data.forEach(p => {
      expect(p.district).toBe('Holešovice')
      expect(p.status).toBe('active')
    })
  })

  it('returns error result for invalid district', async () => {
    const result = await queryPropertiesTool({ district: '', status: 'active' })
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})
```

## Component tests — React Testing Library

```typescript
// components/features/LeadStatusBadge.test.tsx
import { render, screen } from '@testing-library/react'
import { LeadStatusBadge } from './LeadStatusBadge'

describe('LeadStatusBadge', () => {
  it('renders correct label for each status', () => {
    const statuses = ['new', 'in_progress', 'closed_won', 'closed_lost'] as const
    statuses.forEach(status => {
      const { unmount } = render(<LeadStatusBadge status={status} />)
      expect(screen.getByRole('status')).toBeInTheDocument()
      unmount()
    })
  })

  it('has accessible role', () => {
    render(<LeadStatusBadge status="new" />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
```

## Agent tool tests
Every Claude tool must have unit tests covering:
1. Happy path — valid input returns expected output shape
2. Error handling — DB error returns `{ success: false, error }`
3. Auth check — unauthenticated call returns error
4. Edge case — empty results, null values, large datasets

```typescript
// Testing agent tools with mocked Supabase
import { createClient } from '@supabase/supabase-js'
vi.mock('@supabase/supabase-js')

const mockSelect = vi.fn().mockReturnValue({
  data: [{ id: '1', title: 'Holešovice apartment', status: 'active' }],
  error: null,
})
```

## Integration tests — Supabase

Use a separate test Supabase project or local `supabase start`:
```typescript
// __tests__/integration/properties.test.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.TEST_SUPABASE_URL!,
  process.env.TEST_SUPABASE_SERVICE_ROLE_KEY!
)

describe('Properties table', () => {
  beforeEach(async () => {
    // Reset to known seed state
    await supabase.rpc('reset_test_data')
  })

  it('RLS prevents cross-agent data access', async () => {
    // Test with agent A's session — should not see agent B's properties
  })
})
```

## E2E tests — Playwright

```typescript
// __tests__/e2e/agent-chat.spec.ts
import { test, expect } from '@playwright/test'

test('agent answers property query with data', async ({ page }) => {
  await page.goto('/dashboard')
  await page.getByPlaceholder('Ask Pepa anything...').fill('How many active listings do we have?')
  await page.keyboard.press('Enter')

  // Wait for streaming response to complete
  await expect(page.getByTestId('agent-response')).toContainText(/\d+ active listings/, {
    timeout: 15_000,
  })
})

test('Telegram webhook rejects unauthorised user', async ({ request }) => {
  const response = await request.post('/api/telegram/webhook', {
    headers: { 'X-Telegram-Bot-Api-Secret-Token': 'wrong-token' },
    data: { message: { text: '/start', from: { id: 99999 } } },
  })
  expect(response.status()).toBe(401)
})
```

## What to test by feature

| Feature | Unit | Integration | E2E |
|---|---|---|---|
| Agent tool: query properties | ✅ | ✅ | — |
| Agent tool: generate email | ✅ | — | — |
| Agent tool: calendar fetch | ✅ | — | — |
| Agent tool: create report | ✅ | ✅ | — |
| Telegram webhook security | ✅ | — | ✅ |
| Dashboard KPI cards | ✅ | ✅ | — |
| Chat streaming | — | — | ✅ |
| Auth redirect | — | — | ✅ |
| Scraper cron job | ✅ | ✅ | — |

## CI configuration
```yaml
# .github/workflows/test.yml
- name: Unit + integration tests
  run: pnpm vitest run --coverage

- name: E2E tests
  run: pnpm playwright test

- name: Coverage gate
  run: pnpm vitest run --coverage --reporter=json
  # Fail if < 70% coverage on lib/claude/** (agent tools)
```

## Seed data for tests
- Realistic Czech/Slovak data: Prague addresses, CZK prices, Czech names
- Deterministic UUIDs for test entities (hardcoded, not random)
- Minimum viable dataset: 20 properties, 15 clients, 30 leads, 3 agents
- Edge cases included: properties missing renovation data, leads with no activity

## Test utilities
```typescript
// test/helpers/factories.ts
export function makeProperty(overrides: Partial<Property> = {}): Property {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    title: 'Byt 2+kk Holešovice',
    address: 'Osadní 35, Praha 7',
    district: 'Holešovice',
    status: 'active',
    price: 8_500_000,
    area_m2: 58,
    ...overrides,
  }
}
```
