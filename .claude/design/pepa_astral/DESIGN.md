# Design System Strategy: The Intelligent Estate

## 1. Overview & Creative North Star
**The Creative North Star: "The Digital Architect"**
This design system moves beyond the standard SaaS "dashboard" look to create a high-end, editorial experience for the real estate sector. The goal is to blend the precision of fintech (Stripe/Revolut) with the expansive, airy feel of luxury architectural digests. 

We break the "template" look by utilizing **Intentional Asymmetry** and **Tonal Depth**. Instead of boxing content into rigid grids, we use expansive white space and overlapping elements to create a sense of flow. This system isn't just a tool; it is a premium concierge that feels authoritative, silent, and sophisticated.

---

## 2. Colors & Surface Philosophy
The palette is rooted in Indigo (`primary: #4648d4`), but its power comes from the neutral foundation that allows the AI’s insights to take center stage.

### The "No-Line" Rule
Traditional 1px borders are largely prohibited for sectioning. We define boundaries through **Background Volume Shifts**. To separate a sidebar from a main feed, use `surface-container-low` against a `background` floor. This creates a "sculpted" interface rather than a "drawn" one.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—like stacked sheets of fine vellum.
- **Layer 0 (Background):** The base floor (`#fcf8ff`).
- **Layer 1 (Sections):** Large layout areas using `surface-container-low`.
- **Layer 2 (Content Cards):** Interactive elements using `surface-container-lowest` (White) to create a soft, natural "pop."
- **Layer 3 (Floating/Overlays):** Modals and dropdowns using `surface-bright` with Glassmorphism.

### The "Glass & Gradient" Rule
To inject "soul" into the professional aesthetic:
- **Glassmorphism:** Use `surface` colors at 80% opacity with a `20px` backdrop-blur for floating navigation or AI chat bubbles.
- **Signature Gradients:** Main CTAs should not be flat. Use a subtle linear gradient: `primary` (#4648d4) to `primary_container` (#6063ee) at a 135° angle to give a sense of light and dimension.

---

## 3. Typography: Editorial Authority
We use **Inter** not as a system font, but as a brand signifier. By pushing contrast between massive display type and tight, functional labels, we mimic high-end real estate branding.

*   **Display (lg/md):** Used for hero metrics or property titles. Tight letter-spacing (-0.02em) and `600` weight.
*   **Headlines:** Used to introduce sections. High "breathing room" (large margins below).
*   **Body (md):** Our workhorse. Keep line-height at 1.6 to ensure the "Editorial" feel.
*   **Labels (sm/md):** Always `500` or `600` weight. Used for data points (e.g., "SQUARE FOOTAGE") to provide an industrial, precise contrast to the soft UI.

---

## 4. Elevation & Depth
We convey hierarchy through **Tonal Layering** rather than structural lines.

*   **The Layering Principle:** Depth is achieved by "stacking." Place a `surface-container-lowest` card on a `surface-container-low` section. The delta in luminance creates a natural lift without the "heaviness" of shadows.
*   **Ambient Shadows:** For high-floating elements (Modals), use a "Signature Glow" rather than a drop shadow. 
    *   *Spec:* `0 20px 40px rgba(70, 72, 212, 0.05)` (A hint of the indigo primary color in the shadow to simulate light passing through glass).
*   **The "Ghost Border":** If a container sits on a background of the same color, use the `outline-variant` token at 15% opacity. It should be felt, not seen.

---

## 5. Components & Primitive Logic

### Buttons (The "Tactile" Interaction)
*   **Primary:** Indigo gradient, `8px` radius, white text. On hover, increase the gradient intensity.
*   **Secondary:** `surface-container-highest` background with `primary` text. No border.
*   **Tertiary:** Ghost style. No background, `primary` text, underlined only on hover.

### Input Fields & Search
Real estate requires data entry. Use `surface-container-low` as the input background (no border). On focus, transition to a `surface-container-lowest` background with a 1px `primary` "Ghost Border."

### Cards (The Property Unit)
*   **Forbid Divider Lines:** Separate property details (Price, Beds, Baths) using vertical whitespace and `label-sm` headers. 
*   **Radius:** Strict `12px`.
*   **Interaction:** On hover, the card should lift using a `150ms ease` transition and a subtle `surface-container-highest` tint shift.

### AI Chat Interface (Signature Component)
The AI agent is a "Living Document." Use a centered, narrow column. AI responses should use `primary_container` at 10% opacity (soft indigo tint) to differentiate from user queries which stay on `surface-container-low`.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** use extreme whitespace (32px, 48px, 64px) between major sections to emphasize a premium feel.
*   **Do** use `999px` pill shapes for status indicators (e.g., "Available," "Sold") to soften the professional grid.
*   **Do** align text-heavy content to a centered, readable measure (max-width: 680px).

### Don't:
*   **Don't** use black (`#000000`) for shadows; use a tinted version of your text color (`#1b1b20`) at low opacity.
*   **Don't** use 1px solid borders to create a grid. If the layout feels messy, add more whitespace, don't add more lines.
*   **Don't** use standard blue for links. Use the `primary` (#4648d4) Indigo to maintain the signature identity.