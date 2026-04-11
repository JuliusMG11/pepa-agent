# Design

## Design files location
All design assets, tokens, and references are in `.claude/design/`:

```
.claude/design/
  design_system.md      # Full design system — tokens, components, patterns
  brand.md              # Brand identity, logo usage, voice & tone
  landing_page.md       # Landing page layout spec and copy
  dashboard.md          # Dashboard layout, sidebar, panels
  components.md         # Component library reference (shadcn customisations)
```

## Design philosophy
The Pepa UI follows the same principles as Revolut and Stripe:
- **Clarity over decoration** — every element earns its place
- **Data-forward** — numbers and insights are the hero, chrome is invisible
- **Confident simplicity** — one clear action per screen, no decision paralysis
- **Speed signals quality** — skeleton loaders, streaming text, instant feedback

## Primary accent colour
`#6366F1` (Indigo 500) — used for:
- Primary CTA buttons
- Active sidebar item background
- Chart primary series
- Focus rings
- Agent message bubbles

## Typography hierarchy
| Element | Size | Weight | Notes |
|---|---|---|---|
| Page title | 20px | 500 | Dashboard `<h1>` |
| Section heading | 16px | 500 | Card headers |
| Body | 14px | 400 | Default content |
| Label/caption | 12px | 400 | Muted metadata |
| Micro | 11px | 500 | Status pills, badges |

Font: **Inter** (Google Fonts) — fallback: system-ui, -apple-system

## Layout grid
- Dashboard: 220px fixed sidebar + fluid main area
- Main content max-width: 1280px, padding: 24px
- KPI cards: 4-column grid (`grid-cols-4`), gap 12px
- Panels: 55/45 split for chat + quick actions

## Spacing scale (Tailwind)
Use 4px base unit: `space-1` = 4px, `space-2` = 8px, `space-4` = 16px, `space-6` = 24px

## Interaction states
- Hover: `bg-secondary` tint, `150ms` transition
- Active/pressed: `scale-[0.98]`, `150ms`
- Focus: `ring-2 ring-indigo-500 ring-offset-2`
- Disabled: `opacity-50 cursor-not-allowed`
- Loading: skeleton with `animate-pulse` matching content layout

## Status colours (semantic)
| Status | Background | Text | Usage |
|---|---|---|---|
| Active/Success | `#D1FAE5` | `#065F46` | Active listings, done tasks |
| Pending/Warning | `#FEF3C7` | `#92400E` | Pending leads, in-progress |
| Sold/Neutral | `#F1EFE8` | `#5F5E5A` | Sold properties, inactive |
| Error | `#FEE2E2` | `#991B1B` | Errors, missing data |

## Responsive breakpoints
- `lg` (1024px): minimum supported width — dashboard layout
- `xl` (1280px): comfortable dashboard, chat + sidebar both visible
- `2xl` (1536px): max-width container kicks in

## Iconography
Use **Lucide React** — consistent 24px stroke icons throughout.
Common icons:
- `Building2` — properties
- `Users` — clients
- `TrendingUp` — reports/analytics
- `MessageSquare` — chat/agent
- `Calendar` — scheduling
- `Bell` — notifications
- `Search` — search
- `Settings` — settings
- `Send` — send message
