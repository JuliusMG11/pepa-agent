# Design System — Pepa

## Colour tokens
```css
/* Brand */
--color-brand:          #6366F1;   /* Indigo 500 — primary accent */
--color-brand-hover:    #4F46E5;   /* Indigo 600 — hover state */
--color-brand-light:    #E0E7FF;   /* Indigo 100 — tinted backgrounds */
--color-brand-text:     #3730A3;   /* Indigo 800 — text on brand-light bg */

/* Backgrounds */
--color-bg-page:        #F8F8FA;   /* Page background */
--color-bg-card:        #FFFFFF;   /* Card surface */
--color-bg-subtle:      #F3F4F6;   /* Subtle secondary surface */
--color-bg-sidebar:     #FAFAFA;   /* Sidebar background */

/* Text */
--color-text-primary:   #0A0A0F;
--color-text-secondary: #6B7280;
--color-text-muted:     #9CA3AF;
--color-text-invert:    #FFFFFF;

/* Borders */
--color-border:         rgba(0,0,0,0.07);
--color-border-strong:  rgba(0,0,0,0.14);

/* Semantic */
--color-success-bg:     #D1FAE5;
--color-success-text:   #065F46;
--color-warning-bg:     #FEF3C7;
--color-warning-text:   #92400E;
--color-error-bg:       #FEE2E2;
--color-error-text:     #991B1B;
--color-neutral-bg:     #F1EFE8;
--color-neutral-text:   #5F5E5A;

/* Dark mode overrides */
@media (prefers-color-scheme: dark) {
  --color-bg-page:      #0F0F12;
  --color-bg-card:      #18181C;
  --color-bg-subtle:    #1F1F24;
  --color-bg-sidebar:   #111114;
  --color-text-primary: #F2F2F5;
  --color-border:       rgba(255,255,255,0.07);
  --color-border-strong:rgba(255,255,255,0.14);
}
```

## Typography scale
```css
/* Font */
font-family: 'Inter', system-ui, -apple-system, sans-serif;

/* Scale */
.text-xs    { font-size: 11px; line-height: 16px; }
.text-sm    { font-size: 12px; line-height: 18px; }
.text-base  { font-size: 14px; line-height: 22px; }
.text-md    { font-size: 16px; line-height: 24px; }
.text-lg    { font-size: 20px; line-height: 28px; }
.text-xl    { font-size: 28px; line-height: 36px; }
.text-hero  { font-size: 44px; line-height: 52px; letter-spacing: -0.02em; }

/* Weights */
font-weight: 400;   /* body */
font-weight: 500;   /* headings, labels */
font-weight: 600;   /* KPI numbers, hero headline */
```

## Spacing
```
4px  — micro gaps (icon to label, pill padding)
8px  — tight spacing (between list items)
12px — component internal padding
16px — card padding (small)
20px — section internal padding
24px — card padding (standard)
32px — section separation
48px — page section padding
64px — hero section padding
```

## Border radius
```
4px   — pills and small badges (border-radius: 999px preferred for pills)
8px   — inputs, small cards, buttons
12px  — standard cards
16px  — large feature cards
50%   — avatar circles
```

## Elevation / shadow
Only one shadow level — used on cards that need lift:
```css
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
```
No multi-level elevation system. Differentiate with border colour instead.

## Component tokens

### Button
```
Primary:   bg #6366F1, text white, hover #4F46E5, radius 8px, height 36px, padding 0 16px
Ghost:     bg transparent, border 0.5px, text secondary, hover bg-subtle
Danger:    bg #FEE2E2, text #991B1B, hover bg #FECACA
Disabled:  opacity 50%, cursor not-allowed
```

### Input
```
Height: 36px
Padding: 0 12px
Border: 0.5px solid var(--color-border-strong)
Radius: 8px
Background: var(--color-bg-card)
Focus: ring-2 ring-indigo-500 ring-offset-2, border-color #6366F1
Placeholder: var(--color-text-muted)
```

### Card
```
Background: var(--color-bg-card)
Border: 0.5px solid var(--color-border)
Radius: 12px
Padding: 20px 24px
Hover (interactive cards): border-color var(--color-border-strong), 150ms transition
```

### KPI card
```
Background: var(--color-bg-subtle)
Border: none
Radius: 10px
Padding: 16px
Label: 11px, muted, uppercase, letter-spacing 0.05em
Value: 24px, weight 600
Trend badge: 11px pill, semantic colour
```

### Status pill
```
Radius: 999px
Padding: 2px 8px
Font: 11px, weight 500
Active:   bg #D1FAE5, text #065F46
Pending:  bg #FEF3C7, text #92400E
Sold:     bg #F1EFE8, text #5F5E5A
Error:    bg #FEE2E2, text #991B1B
```

### Sidebar nav item
```
Padding: 8px 12px
Radius: 8px
Default: text secondary, icon secondary
Hover: bg-subtle
Active: bg #6366F1, text white, icon white
Font: 13px, weight 500
```

### Chat bubble
```
User: bg #6366F1, text white, radius 12px 12px 2px 12px, max-width 75%
Agent: bg-card, border 0.5px, radius 12px 12px 12px 2px, max-width 85%
Font: 13px
```

## Motion
```css
/* Standard transition — use for all hover/focus state changes */
transition: all 150ms ease;

/* Button press */
transform: scale(0.98);

/* Skeleton loading */
animation: pulse 1.5s ease-in-out infinite;
```

## Iconography
- Library: Lucide React
- Default size: 16px (inline), 20px (sidebar), 24px (feature icons)
- Stroke width: 1.5px (default Lucide)
- Colour: inherits `currentColor` — set on parent

## Shadcn/ui customisation
Override in `components/ui/` — do not modify node_modules.
Key overrides:
- `Button`: use brand tokens above
- `Input`: 36px height, brand focus ring
- `Card`: match card tokens above
- `Badge`: use status pill tokens above
- `Dialog`: 600ms fade-in, backdrop blur-sm

## Do / Don't

| Do | Don't |
|---|---|
| Use the 4px spacing grid | Use arbitrary padding values |
| One primary CTA per screen | Multiple competing CTAs |
| Skeleton loaders that match content shape | Generic spinners |
| Sentence case everywhere | Title Case in UI labels |
| Indigo for interactive elements | Random accent colours |
| Test dark mode before shipping | Assume light mode only |
| 0.5px borders | 1px+ borders (too heavy) |
