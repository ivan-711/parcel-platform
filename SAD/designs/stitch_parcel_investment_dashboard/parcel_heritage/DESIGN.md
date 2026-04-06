# Design System Strategy: The Curated Ledger

## 1. Overview & Creative North Star
This design system is built to transcend the standard "SaaS Dashboard" aesthetic. Our Creative North Star is **"The Curated Ledger."** 

We are moving away from rigid, boxy layouts and toward a high-end editorial experience that feels more like a premium financial journal than a software tool. The system balances the cold precision of technical data with the warmth of luxury materials. We achieve this through "Intentional Asymmetry"—allowing white space (or "dark space") to act as a structural element—and a hierarchy that favors tonal depth over structural lines. This is a confident, quiet luxury that doesn't need to shout to be authoritative.

---

### 2. Colors: The Tonal Bloom
The palette is rooted in a warm, near-black foundation (`#0C0B0A`), providing a sophisticated stage for the cream typography and the signature violet accent.

*   **The "No-Line" Rule:** To maintain a premium editorial feel, 1px solid borders for sectioning are strictly prohibited. Boundaries must be defined through background color shifts. A section should be distinguished by moving from `surface` to `surface-container-low`, creating a "tonal bloom" rather than a hard cut.
*   **Surface Hierarchy & Nesting:** Treat the UI as a physical stack of fine paper. 
    *   **Base:** `surface` (#141312)
    *   **Sectioning:** `surface_container_low` (#1D1B1A)
    *   **Interactive Elements:** `surface_container_high` (#2B2A28)
*   **The "Glass & Gradient" Rule:** Floating modals or navigation overlays must use Glassmorphism. Utilize semi-transparent versions of `surface_container` with a `backdrop-filter: blur(12px)`. 
*   **Signature Textures:** For high-impact CTAs, do not use flat fills. Use a subtle linear gradient (45°) transitioning from `primary` (#C7BFFF) to `primary_container` (#8F7FFF). This adds "soul" and depth to the violet signal.

---

### 3. Typography: Editorial Authority
We utilize **Satoshi** for its modern, geometric clarity and **JetBrains Mono** to ground the system in technical rigor.

*   **Display & Headline:** Use **Satoshi 300** (Light) for `display-lg` through `headline-sm`. The wide tracking and light weight evoke high-fashion editorial layouts. For specific emphasis within headlines, switch to **Satoshi 500** (Medium).
*   **Body:** **Satoshi 400** (Regular) is our workhorse. Ensure line heights are generous (1.6x) to allow the text to "breathe" against the dark background.
*   **Technical Data (The Ledger):** All financial figures, timestamps, and technical data must use **JetBrains Mono**. This font’s monospaced nature communicates precision and financial trustworthiness.
*   **Hierarchy:** Use `text_primary` (#F0EDE8) for headlines and `text_secondary` (#C5C0B8) for body text to create a natural, accessible contrast that reduces eye strain in dark mode.

---

### 4. Elevation & Depth: Tonal Layering
In this design system, depth is felt, not seen. We avoid the "floating card" look of the early 2010s in favor of modern layering.

*   **The Layering Principle:** Depth is achieved by stacking surface tiers. Place a `surface_container_lowest` card on a `surface_container_low` section. This creates a soft, natural "lift" without the clutter of shadows.
*   **Ambient Shadows:** When an element must float (e.g., a dropdown), use an extra-diffused shadow: `box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4)`. The shadow should feel like ambient light blockage, not a dark smudge.
*   **The "Ghost Border" Fallback:** If a container requires definition for accessibility, use a **Ghost Border**: `outline_variant` (#474554) at 15% opacity. Never use 100% opaque borders.
*   **Glassmorphism:** Use `surface_tint` at 5% opacity with high blur values to create a frosted glass effect for headers that remain pinned during scroll.

---

### 5. Components: Precision Elements

#### Buttons
*   **Primary:** Gradient fill (`primary` to `primary_container`) with `on_primary` text. Border-radius: `md` (0.375rem).
*   **Secondary:** Ghost style. No fill, Ghost Border (15% opacity), with `primary` text.
*   **States:** On hover, primary buttons should "glow" slightly via a soft violet outer shadow (10% opacity).

#### Cards & Lists
*   **No Dividers:** Explicitly forbid 1px lines between list items. Use vertical white space from the Spacing Scale (e.g., `1.5rem` gaps) or subtle background shifts (`surface_container_lowest` against `surface_container`).
*   **Interaction:** On hover, a card should shift from `surface_container_low` to `surface_container_high`.

#### Input Fields
*   **Aesthetic:** Minimalist underline or subtle filled block (`surface_container_lowest`). 
*   **Focus State:** The label should transition to `primary` (violet), and the Ghost Border should increase to 40% opacity.
*   **Technical Entry:** Use `label-md` (JetBrains Mono) for all user-inputted numbers.

#### Chips
*   **Style:** Small, `full` (9999px) radius. 
*   **Selection:** Use `secondary_container` for the background with `on_secondary_container` text for a muted, premium selection state.

---

### 6. Do's and Don'ts

#### Do
*   **Do** use asymmetrical margins to create focal points for high-level data.
*   **Do** use JetBrains Mono for *every* number, including dates and currency.
*   **Do** lean into the "Warm Near-Black" (#0C0B0A). Avoid using true #000000.
*   **Do** favor `title-lg` (Satoshi 500) for card titles to provide a strong "anchor" for content.

#### Don't
*   **Don't** use 1px solid borders to separate sections. Use tonal shifts.
*   **Don't** use standard "Blue" for links. Everything should be violet (`primary`) or cream.
*   **Don't** use high-contrast shadows. If you can clearly see where the shadow ends, it's too heavy.
*   **Don't** crowd the interface. If you are unsure, add 8px of extra padding. Premium design requires "breathing room."

---

### 7. Accessibility Note
While we prioritize a "Dark Luxury" aesthetic, readability is paramount. Always ensure that `text_tertiary` (#8A8580) is only used for non-essential metadata. All primary content must meet WCAG AA standards against their respective surface containers.