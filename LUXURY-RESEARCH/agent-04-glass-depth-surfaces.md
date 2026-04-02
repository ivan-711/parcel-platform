# Glass, Depth & Surface Design for Luxury Dark Interfaces

**Context:** Parcel is a real estate deal analysis SaaS. Background: near-black `#0C0B0A` (warm charcoal). Stack: React 18 + TypeScript + Tailwind CSS + Framer Motion. The goal is depth through subtle gradients, glass-like card edges, and barely-visible highlights -- not flashy glassmorphism.

---

## 1. Card Surface Gradients

The key to luxury dark cards is micro-gradients -- gradients so subtle you feel them rather than see them. The surface should appear to catch light from a single source above and slightly left.

### 1a. Primary card gradient (top-to-bottom)

```css
.card-surface {
  background: linear-gradient(
    174deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.02) 40%,
    rgba(255, 255, 255, 0.00) 100%
  );
  background-color: #141311;
}
```

The angle is 174deg, not a flat 180deg. This slight tilt (6 degrees off vertical) mimics natural light falloff and avoids the "Photoshop default" feel of perfectly vertical gradients. Opacity range 0.05 to 0.00 -- never higher than 0.06 for the top stop.

Tailwind approach (via arbitrary values):
```html
<div class="bg-[#141311] bg-gradient-to-b from-white/[0.05] via-white/[0.02] to-transparent">
```

### 1b. Elevated card variant (modal, popover, dropdown)

```css
.card-elevated {
  background: linear-gradient(
    174deg,
    rgba(255, 255, 255, 0.07) 0%,
    rgba(255, 255, 255, 0.03) 35%,
    rgba(255, 255, 255, 0.01) 100%
  );
  background-color: #1A1917;
}
```

Higher base color and slightly stronger gradient to convey lift. The top stop at 0.07 is the upper limit for dark luxury -- above 0.08 the gradient becomes visible as a distinct band.

### 1c. Recessed surface (sidebar, secondary panel)

```css
.card-recessed {
  background-color: #0A0908;
}
```

No gradient at all. Recessed surfaces sit below the page plane; light does not reach them. Adding a gradient to a recessed surface contradicts the spatial model and breaks the illusion.

---

## 2. Top-Edge Highlight: The "Light Catching the Edge" Effect

This is the single most impactful luxury detail for dark interfaces. A barely-visible white line at the top edge of a card simulates a beveled edge catching overhead light.

### 2a. Technique comparison

| Technique | Pros | Cons | Winner? |
|-----------|------|------|---------|
| `::after` pseudo-element | Full control, can be gradient | Extra DOM layer, complex positioning | Best for gradient highlights |
| `border-top` with rgba | Simple, no extra layers | Uniform brightness, cannot fade at edges | Good for uniform highlights |
| `box-shadow: inset` | No extra elements, GPU-composited | Cannot be gradient, limited control | Best for perf-critical cases |
| `border-image` with gradient | True gradient border | Conflicts with border-radius in older browsers | Avoid |

### 2b. Recommended implementation: `::after` gradient highlight

```css
.card-highlight {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
}

.card-highlight::after {
  content: '';
  position: absolute;
  top: 0;
  left: 10%;
  right: 10%;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.12) 30%,
    rgba(255, 255, 255, 0.15) 50%,
    rgba(255, 255, 255, 0.12) 70%,
    transparent 100%
  );
  pointer-events: none;
}
```

The highlight fades in from 10% from the edges, peaks at 0.15 opacity in the center, and fades out. This is more realistic than a uniform border-top because real beveled edges catch more light in the center.

Tailwind + custom utility approach:
```css
/* In your globals.css or tailwind layer */
@layer utilities {
  .edge-highlight {
    @apply relative overflow-hidden;
  }
  .edge-highlight::after {
    content: '';
    @apply absolute top-0 left-[10%] right-[10%] h-px pointer-events-none;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.12) 30%,
      rgba(255, 255, 255, 0.15) 50%,
      rgba(255, 255, 255, 0.12) 70%,
      transparent
    );
  }
}
```

### 2c. Simpler alternative: inset box-shadow

When you need performance over finesse (e.g., cards inside a virtualized list):

```css
.card-highlight-simple {
  box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.06);
}
```

Tailwind: `shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]`

This is uniform across the top edge. Less realistic but fully GPU-composited and zero DOM overhead.

---

## 3. Glass Morphism Done Right for Dark Themes

Most glassmorphism implementations fail because they blur everything, creating a washed-out, unreadable mess. On dark themes, the problem is worse: blur over dark content produces muddy gray.

### 3a. Rules for dark-theme glass

1. **Glass is for overlays only** -- modals, command palettes, floating panels. Never for primary content cards.
2. **Blur radius: 16-24px maximum.** Higher values (40px+) destroy readability and create GPU strain.
3. **Background opacity: 0.60-0.80.** The surface must be mostly opaque. Pure blur-behind with 0.1 opacity is the Instagram circa-2020 mistake.
4. **Saturate filter required.** `backdrop-filter: blur(16px) saturate(180%)` prevents the desaturated-gray effect that blur creates on dark backgrounds.
5. **Always include a fallback.** `backdrop-filter` is not universally supported. Stack a solid background behind it.

### 3b. Command palette / modal glass

```css
.glass-overlay {
  background: rgba(12, 11, 10, 0.75);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
}

/* Fallback for browsers without backdrop-filter */
@supports not (backdrop-filter: blur(1px)) {
  .glass-overlay {
    background: rgba(12, 11, 10, 0.95);
  }
}
```

Tailwind:
```html
<div class="bg-[#0C0B0A]/75 backdrop-blur-[20px] backdrop-saturate-[180%] border border-white/[0.06] rounded-2xl">
```

### 3c. Where NOT to use glass on Parcel

- Deal analysis result cards (data legibility is paramount)
- KPI stat cards on the dashboard
- Pipeline kanban columns
- Any surface containing financial numbers

Glass is reserved for: command palette, modal backdrop, notification toasts, floating toolbars.

---

## 4. Layered Surface Elevation Hierarchy

A premium dark interface needs 4 distinct surface levels. Each level is defined by its background value and which depth cues it uses.

### 4a. The four levels

| Level | Name | Background | Border | Gradient | Use Case |
|-------|------|-----------|--------|----------|----------|
| 0 | Canvas | `#0C0B0A` | None | None | Page background, full bleed |
| 1 | Surface | `#141311` | `rgba(255,255,255,0.06)` | Top fade 0.03-0.00 | Primary cards, panels, sidebar |
| 2 | Elevated | `#1A1917` | `rgba(255,255,255,0.08)` | Top fade 0.05-0.00 + edge highlight | Modals, popovers, expanded cards |
| 3 | Overlay | `#211F1D` | `rgba(255,255,255,0.10)` | Top fade 0.07-0.00 + edge highlight | Dropdown menus, tooltips, command palette |

### 4b. Tailwind token mapping

```ts
// tailwind.config.ts extend.colors
surface: {
  canvas:   '#0C0B0A',
  DEFAULT:  '#141311',
  elevated: '#1A1917',
  overlay:  '#211F1D',
}
```

### 4c. The math behind the progression

Each level increases lightness by approximately 3-4% in the HSL model, starting from L=4% (canvas) through L=7% (surface), L=10% (elevated), to L=13% (overlay). This geometric progression feels natural because it mirrors how real surfaces at increasing heights catch more ambient light.

Critical: never skip a level. A tooltip (Level 3) should never sit directly on canvas (Level 0) without an intermediate surface. Skipping levels breaks the spatial hierarchy and makes the tooltip feel detached.

---

## 5. Border Techniques for Luxury

### 5a. The rgba white approach (recommended)

```css
.border-luxury {
  border: 1px solid rgba(255, 255, 255, 0.06);
}
```

This is the industry standard for premium dark interfaces. The border reads as a physical edge where two surfaces meet, catching ambient light. At 0.06 opacity on `#0C0B0A`, this produces approximately `#1A1918` -- barely distinguishable from the surface.

Opacity scale by elevation:
- Level 1 card on Level 0 canvas: `rgba(255,255,255,0.06)` -- barely there
- Level 2 modal on Level 0 canvas: `rgba(255,255,255,0.08)` -- slightly visible
- Level 3 dropdown on Level 1 surface: `rgba(255,255,255,0.10)` -- clear edge

### 5b. Solid dark borders (avoid for primary surfaces)

```css
.border-solid-dark {
  border: 1px solid #1E1D1B;
}
```

Solid borders look flat and "CSS-default." They do not adapt to their context the way rgba-white does. On a Level 2 surface, an `rgba(255,255,255,0.08)` border correctly becomes lighter (because 8% white on a lighter base = brighter result), while a solid `#1E1D1B` border looks wrong.

Exception: solid borders are acceptable for inputs and form elements inside cards, where you want a clearly defined interactive boundary.

### 5c. Border-bottom accent for sectional dividers

```css
.section-divider {
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
```

Lower opacity (0.04) for internal dividers. These should be felt as structure, not seen as lines.

---

## 6. Hover States That Feel Premium

Premium hover is about restraint. Three properties change, all subtly, all simultaneously.

### 6a. The three-property hover

```css
.card-interactive {
  background-color: #141311;
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 0 0 0 rgba(255, 255, 255, 0);
  transition: all 200ms cubic-bezier(0.16, 1, 0.3, 1);
}

.card-interactive:hover {
  background-color: #181715;          /* +2% lightness */
  border-color: rgba(255, 255, 255, 0.10); /* +0.04 opacity */
  box-shadow: 0 4px 24px -4px rgba(0, 0, 0, 0.4); /* soft drop shadow */
}
```

Tailwind:
```html
<div class="bg-[#141311] border border-white/[0.06] shadow-none
            hover:bg-[#181715] hover:border-white/10 hover:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.4)]
            transition-all duration-200 ease-out">
```

### 6b. The easing matters

`cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo) gives a quick initial response that decelerates smoothly. Avoid `ease-in-out` for hover -- the slow start makes the interface feel laggy.

### 6c. Optional: glow on high-value cards

For deal cards that are starred, pinned, or high-ROI:

```css
.card-glow:hover {
  box-shadow:
    0 4px 24px -4px rgba(0, 0, 0, 0.4),
    0 0 20px -5px rgba(77, 124, 15, 0.15);  /* olive accent glow */
}
```

The glow uses Parcel's olive accent `#4D7C0F` at extremely low opacity (0.15) and is offset inward (-5px spread). This produces a barely-perceptible halo that reads as "this card is important" without looking like a neon sign.

---

## 7. Focus States for Accessibility

Focus rings must meet WCAG 2.2 SC 2.4.7 (visible focus) while fitting the luxury aesthetic. The trick is using the accent color at controlled opacity with a double-ring technique.

### 7a. Double-ring focus

```css
.card-focusable:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px #0C0B0A,                       /* gap ring (matches canvas) */
    0 0 0 4px rgba(77, 124, 15, 0.5);        /* olive accent ring */
}
```

The inner ring (2px, canvas color) creates visual separation between the element and the focus indicator. The outer ring (4px, olive at 0.5 opacity) provides the visible indicator. This two-ring technique is used by Radix, Shadcn, and most premium component libraries.

Tailwind:
```html
<div class="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C0B0A] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(77,124,15,0.5)]">
```

Or with a custom utility:
```css
@layer utilities {
  .focus-ring {
    @apply focus-visible:outline-none;
    &:focus-visible {
      box-shadow:
        0 0 0 2px #0C0B0A,
        0 0 0 4px rgba(77, 124, 15, 0.5);
    }
  }
}
```

### 7b. Input focus (olive glow)

```css
.input-field:focus {
  border-color: rgba(77, 124, 15, 0.5);
  box-shadow: 0 0 0 3px rgba(77, 124, 15, 0.12);
}
```

The 0.12 opacity shadow creates a soft glow around the input without dominating. This is the same technique Linear uses with their violet accent.

---

## 8. Inner Shadow Techniques for Recessed Elements

Inputs, search bars, and code blocks should feel physically recessed into the surface -- the opposite of an elevated card.

### 8a. Standard input recess

```css
.input-recessed {
  background-color: #0A0908;
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
  border-radius: 8px;
}
```

The `inset 0 2px 4px` shadow creates a shadow at the top-inside of the element, simulating overhead light casting a shadow into a depression. The `rgba(0,0,0,0.3)` is high opacity because on near-black surfaces, shadows need to be strong to register.

### 8b. Deep recess for search bars

```css
.search-recess {
  background-color: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.04);
  box-shadow:
    inset 0 2px 6px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(0, 0, 0, 0.2);
  border-radius: 10px;
}
```

Two inset shadows: one for the main recess depth, one for a sharp top-edge shadow. Using `rgba(0,0,0,0.3)` as background instead of a solid hex allows the surface beneath to influence the search bar color, maintaining the elevation hierarchy.

Tailwind:
```html
<div class="bg-black/30 border border-white/[0.04] shadow-[inset_0_2px_6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(0,0,0,0.2)] rounded-[10px]">
```

---

## 9. Noise/Texture Overlay for Depth

A barely-perceptible noise texture adds physical materiality to dark surfaces. Without it, flat dark backgrounds feel digital and sterile. With it, they feel like brushed metal, stone, or matte paper.

### 9a. CSS-only grain effect

```css
.surface-textured::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  opacity: 0.03;
  mix-blend-mode: overlay;
  pointer-events: none;
  border-radius: inherit;
  z-index: 1;
}
```

Key values:
- `baseFrequency='0.9'` -- high frequency = fine grain. Lower values (0.3-0.5) create a cloudy, splotchy texture.
- `opacity: 0.03` -- the grain should be invisible on a quick glance and only perceptible on close inspection or when comparing a textured area to a non-textured one.
- `mix-blend-mode: overlay` -- integrates the noise into the surface rather than sitting on top.

### 9b. Performance considerations

The SVG-based noise is rasterized once by the browser and cached. It does not cause per-frame GPU work. However, applying it to many elements (every card) can increase memory usage. Best practice: apply noise to the page canvas and elevated overlays only, not to individual cards.

### 9c. Tailwind utility

```css
@layer utilities {
  .grain {
    @apply relative;
    &::before {
      content: '';
      @apply absolute inset-0 pointer-events-none rounded-[inherit] z-[1];
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
      opacity: 0.03;
      mix-blend-mode: overlay;
    }
  }
}
```

Usage: `<div class="grain bg-[#0C0B0A]">`

---

## 10. Reference Analysis: How Mercury, Raycast, and Arc Create Depth

### 10a. Mercury (Dark Mode)

Mercury's dark mode uses a strict two-level surface system:
- **Canvas:** Pure dark (`~#111110`), no decoration
- **Cards:** Slightly lighter (`~#191918`) with 1px `rgba(255,255,255,0.06)` border
- **No gradients on cards.** Depth comes entirely from the contrast between canvas and card + the thin light border.
- **Focus:** Accent color ring (blue) with a gap ring matching the canvas.
- **Hover:** Background lightens by approximately 2-3% (roughly +5 on the L channel in HSL).

Mercury's lesson: you do not need gradients or glass to create depth. Clean surface contrast + thin light borders is sufficient for a premium financial tool. Glass is reserved for their command palette overlay.

### 10b. Raycast

Raycast is the gold standard for dark luxury UI:
- **Surface gradient:** Extremely subtle top-to-bottom white fade (0.04 to 0.00) on the main panel
- **Edge highlight:** `::after` pseudo-element, 1px, centered gradient peaking at ~0.12 opacity -- exactly the technique described in Section 2b
- **Border:** `rgba(255,255,255,0.08)` -- slightly more visible than Mercury because Raycast uses more surface levels
- **Glass:** The command bar input has `backdrop-filter: blur(24px) saturate(180%)` over the results list. Background opacity ~0.70.
- **Noise:** Subtle grain on the main background, approximately 0.02-0.04 opacity
- **Hover:** Background shift + border brighten + slight scale (1.005). The scale is nearly imperceptible but adds physical weight to the interaction.
- **Shadows:** Large, soft, very dark: `0 8px 32px -8px rgba(0,0,0,0.5)`. The negative spread (-8px) keeps the shadow tight to the element.

Raycast's lesson: every detail compounds. Gradient + edge highlight + grain + shadow = a surface that feels machined from a single material. Remove any one of these and the surface feels flat.

### 10c. Arc Browser

Arc takes a maximalist approach to glass and color:
- **Glass everywhere:** Sidebar, tab bar, toolbar, and URL bar all use `backdrop-filter: blur(40px)`
- **High-opacity tints:** Surfaces are tinted with the user's chosen theme color at 0.10-0.20 opacity
- **Dynamic gradients:** Background gradients shift based on the current tab's theme color
- **Borders:** 1px `rgba(255,255,255,0.10)` -- slightly heavier than Mercury/Raycast

Arc's lesson for Parcel: Arc works because it is a browser -- the content behind the glass is always colorful (web pages). For a data-heavy SaaS like Parcel, Arc's approach would destroy legibility. Use Arc as inspiration for non-data surfaces only (sidebar, command palette) and never for analytical content.

---

## 11. Performance: GPU-Accelerated Properties

### 11a. Safe-to-animate properties (GPU composited)

These properties are handled by the compositor thread and do not trigger layout or paint:
- `transform` (translate, scale, rotate)
- `opacity`
- `filter` / `backdrop-filter` (once applied, composited)

### 11b. Animate with caution

These properties trigger paint but not layout. Acceptable for hover transitions but avoid animating on scroll:
- `box-shadow`
- `background-color`
- `border-color`

### 11c. The `will-change` trap

```css
/* DO: Apply to elements that will animate */
.card-interactive {
  will-change: transform, box-shadow;
}

/* DO NOT: Apply globally */
* { will-change: transform; }  /* Creates excess GPU layers, wastes VRAM */
```

Use `will-change` only on interactive cards and only for the properties that actually transition. For Parcel, this means deal cards and pipeline cards, not static KPI displays.

### 11d. Framer Motion optimization

```tsx
// Use layoutId for shared element transitions (GPU-accelerated)
<motion.div
  layoutId={`deal-${deal.id}`}
  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
/>

// Use CSS transitions for hover (avoids React re-renders)
// Framer Motion's whileHover triggers React state changes
// Plain CSS :hover with transition is faster for simple effects
```

For hover states (background, border, shadow changes), prefer CSS `transition` over Framer Motion's `whileHover`. Framer re-renders the component on hover, which is unnecessary overhead for a visual-only state change. Reserve Framer for enter/exit animations and layout transitions.

---

## 12. What to AVOID

### 12a. Blur overuse
Applying `backdrop-filter: blur()` to more than 2-3 elements on screen simultaneously causes GPU memory exhaustion on lower-end devices. Each blurred element requires a separate GPU texture. Test on a MacBook Air M1 (8GB) as the baseline.

### 12b. Visible gradients
If a user can point at a card and say "there is a gradient on that," the gradient is too strong. The gradient on a dark luxury surface should be invisible to conscious perception. If the top-stop opacity is above 0.07 on a Level 1 card, it is too high.

### 12c. Neon borders and accent-color borders
```css
/* NEVER do this */
border: 1px solid #4D7C0F;        /* olive border on every card */
border: 1px solid rgba(77, 124, 15, 0.3);  /* tinted border everywhere */
```
Accent-colored borders belong exclusively on focus states, selected states, and active tabs. Using them as default card borders creates visual noise and cheapens the accent.

### 12d. Over-glow
```css
/* NEVER do this */
box-shadow: 0 0 30px rgba(77, 124, 15, 0.4);  /* too large, too bright */
```
Glow radius above 20px and opacity above 0.15 reads as "gaming UI" not "financial tool." Parcel's users are making investment decisions -- the interface should feel like a precision instrument, not a gaming dashboard.

### 12e. White text on glass without sufficient backing opacity
Glass behind text requires minimum 0.60 background opacity for AA contrast compliance. At 0.40, even white text on a blurred dark background can fail contrast checks because the blur averages in lighter content behind the glass.

### 12f. Animated noise / parallax grain
Grain must be static. Animated noise (shifting the SVG position on scroll or timer) is distracting and creates a "TV static" effect. Apply once, leave it.

---

## RECOMMENDATIONS FOR PARCEL

Prioritized, numbered takeaways for implementation.

1. **Establish the four-surface hierarchy first.** Define `canvas (#0C0B0A)`, `surface (#141311)`, `elevated (#1A1917)`, and `overlay (#211F1D)` as Tailwind tokens. Every component must reference one of these four levels. This is the foundation everything else builds on.

2. **Add edge highlights to Level 2+ surfaces.** Use the `::after` gradient technique (Section 2b) on modals, popovers, and the command palette. Use the simpler `inset box-shadow` (Section 2c) on standard deal cards for performance. This single detail will produce the most visible premium lift.

3. **Replace all solid dark borders with `rgba(255,255,255,0.06)`.** Audit every `border-[#1A1A2E]` or similar hardcoded dark border and replace with `border-white/[0.06]`. Scale to 0.08 and 0.10 for elevated and overlay surfaces respectively.

4. **Implement the three-property hover** (background lighten + border brighten + soft shadow) on all interactive cards: deal cards, pipeline cards, portfolio property cards. Use CSS `transition` with `cubic-bezier(0.16, 1, 0.3, 1)` at 200ms -- not Framer Motion.

5. **Add subtle card gradients to primary surface cards.** A `174deg` gradient from `white/[0.05]` to `transparent` on deal analysis result cards, dashboard KPI containers, and pipeline column headers. Do NOT add gradients to list items or small repeated elements.

6. **Reserve glass for the command palette and modals only.** Use `backdrop-blur-[20px] backdrop-saturate-[180%]` with `bg-[#0C0B0A]/75`. Include the `@supports` fallback for non-supporting browsers. Never apply glass to data-bearing surfaces.

7. **Add grain texture to the page canvas only.** Apply the SVG noise overlay (Section 9a) at 0.03 opacity with `mix-blend-mode: overlay` to the root layout `<div>`. Do not apply to individual cards -- the performance cost is not worth the marginal visual gain.

8. **Use inner shadows for inputs and search bars.** Replace flat-background inputs with the recessed technique (Section 8a): `inset 0 2px 4px rgba(0,0,0,0.3)` on `bg-[#0A0908]`. This creates a clear physical distinction between "things you read" (elevated) and "things you type into" (recessed).

9. **Implement olive accent focus rings using the double-ring technique.** `box-shadow: 0 0 0 2px #0C0B0A, 0 0 0 4px rgba(77,124,15,0.5)` on all `:focus-visible` states. This satisfies WCAG 2.2 while matching the olive accent system.

10. **Use accent glow sparingly and conditionally.** The olive glow hover (Section 6c) should appear only on starred/pinned deals or deals exceeding a ROI threshold. If every card glows, no card is special.

11. **Animate only GPU-composited properties on scroll.** `transform` and `opacity` for enter/exit animations. `box-shadow`, `background-color`, and `border-color` for hover only. Add `will-change: transform, box-shadow` only to deal cards and pipeline cards.

12. **Test depth perception on a non-retina display.** The subtle opacity differences (0.04 vs 0.06 vs 0.08) can collapse to identical values on low-DPI screens. Verify the hierarchy reads correctly on a 1080p external monitor, not just a Retina MacBook.
