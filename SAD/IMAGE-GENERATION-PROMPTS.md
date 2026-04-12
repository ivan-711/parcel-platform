# Image Generation Prompts — Nano Banana Pro

> Production-ready prompts for generating "The Blueprint," "The Hour," and "The Grid" atmospheric imagery, plus supplemental SVG/CSS assets.
> Source: [ATMOSPHERIC-IMAGERY-PLAN.md](./ATMOSPHERIC-IMAGERY-PLAN.md)
> Target base color: `#0C0B0A` (app-bg) — every image must fade into this tone at the edges.

---

## Global Rules (apply to all 3 images)

Every generation MUST obey:

1. **Aspect ratio:** `16:9` exactly (not 16:10, not 2:1)
2. **Resolution:** `2K` minimum, `4K` preferred (Nano Banana Pro supports up to 4K native)
3. **Output format:** PNG for generation → convert to WebP for web (`cwebp -q 82`)
4. **Negative space at edges:** The outer 20% of the frame must be near-black (value ≤ 10/255) so the CSS `mask-image` radial/linear gradients dissolve cleanly into `#0C0B0A`
5. **Absolutely no:** text, letters, numbers, watermarks, logos, signatures, people, faces, hands, modern UI elements, brand markings
6. **Color temperature:** warm-dark bias (amber, cream, indigo, navy) — avoid cool cyan/teal/green casts
7. **Grain:** subtle 35mm film grain baked in is fine; avoid clean digital sharpness
8. **Composition:** center-weighted or symmetric — the mask will crop the corners
9. **Saturation:** muted (roughly 60–75% of normal) — the CSS `saturate(0.7–0.9)` filter will be on top

> **Nano Banana Pro settings panel:**
> - Model: `Gemini 3 Pro Image (Nano Banana Pro)`
> - Aspect: `16:9`
> - Resolution: `4K`
> - Style strength: default
> - Seed: leave random for the first batch; save the seed of the winner so you can iterate on it

---

## Image 1 — "The Blueprint"

**Role:** Subliminal texture behind `HowItWorks` (3-step process).
**Target opacity:** 0.10
**Output filename:** `frontend/public/images/blueprint-texture.webp`

### Prompt

```
A vintage 1960s architectural elevation blueprint, hand-drafted in cream and
pale ivory ink on deep midnight navy paper, extreme macro close-up of a
building facade drawing: parallel dimension lines, delicate cross-sections,
tick marks, construction notation marks, fine graphite guidelines. The
drafting is meticulous and aged — faint yellowing at the creases, subtle
paper fiber texture, a few worn edges, hint of blueprint ammonia blue bleed.
Directional cinematic lighting rakes across the paper from the upper left
at a low angle, casting a soft shadow that deepens toward the corners of
the frame. The outer 25% of the image fades smoothly to near-black
(almost pure #0A0A14), so only the central composition is visible.
Editorial architectural photography aesthetic, reminiscent of a master
architect's private portfolio from the Mies van der Rohe era. Muted,
contemplative, restrained. Shot on medium format film with 35mm grain.
No readable text, no numbers, no letters, no signatures, no stamps, no
legend, no title block — only abstract geometric drafting marks. No people.
No modern CAD elements. 16:9 aspect ratio, 4K resolution.
```

### Recommended settings

| Setting | Value |
|---|---|
| Aspect ratio | 16:9 |
| Resolution | 4K |
| Format | PNG → WebP (quality 82) |
| Final file size target | < 180 KB |

### Quality checks (before using)

- [ ] No readable characters ANYWHERE (Nano Banana Pro often sneaks pseudo-text into drafting marks — zoom to 100% and scan)
- [ ] Outer 20–25% of frame fades to near-black on ALL sides, not just top/bottom
- [ ] Dominant hue is deep navy/indigo, NOT cyan or royal blue
- [ ] Cream lines, not stark white (stark white will punch through at opacity 0.10 and look like noise)
- [ ] Composition is center-weighted — empty/dark corners so the radial mask works
- [ ] No hint of modern CAD look (straight vector sharpness = wrong; slight hand-drawn wobble = right)
- [ ] No people, no faces hidden in the drafting marks

### Common failure modes → regenerate if

- **Gibberish "architect text" appears** in the drafting callouts → add to prompt: `absolutely no text, no alphabet characters, no numerals, no pseudo-writing`
- **Image looks like a modern Figma wireframe** → add: `hand-drafted with ink and compass, visible drafting imperfections, aged paper`
- **Frame has hard edges or a visible paper border** → add: `no paper edge visible, no border, composition bleeds off frame, corners fade to pure black`
- **Blue is too saturated / cyan** → add: `deep midnight indigo, almost black-blue, desaturated, low chroma`
- **Too busy / can't read as texture at 0.10 opacity** → add: `minimal composition, lots of negative space between drafting elements`

---

## Image 2 — "The Hour"

**Role:** Featured full-bleed transitional strip between `StatsStrip` and `ProblemSection`.
**Target opacity:** 0.35 (strongest of the three — has to hold up as a visible image)
**Output filename:** `frontend/public/images/golden-hour-texture.webp`

### Prompt

```
A cinematographic architectural still life, shot during the final ten
minutes of golden hour. Raking directional sunlight cuts diagonally from
the upper right across a raw concrete wall, creating a sharp geometric
shadow edge that divides the frame into warm amber light and deep indigo
shadow. The concrete has real tactile texture — form-tie holes, subtle
trowel marks, a faint patina of age. A single architectural element is
present but abstract: the corner of a cantilever, the underside of a
staircase, or the edge of a brutalist soffit — never a recognizable
building, never a whole structure, only a fragment. The warm light carries
faint floating dust particles suspended in the beam. The palette is
strictly warm amber, burnt sienna, deep umber shadow, and near-black
negative space. The outer 20% of the frame on all four sides fades to
near-black (#0A0908), dissolving the image into void. Editorial
photography style inspired by Herzog & de Meuron monographs and the films
of Roger Deakins. Shot on 35mm film with organic grain, subtle anamorphic
lens breathing, contemplative and quiet. Symmetric composition, center of
visual interest in the middle third of the frame. No people, no hands,
no furniture, no signage, no text, no numbers, no windows with view, no
identifiable property. 16:9 aspect ratio, 4K resolution.
```

### Recommended settings

| Setting | Value |
|---|---|
| Aspect ratio | 16:9 |
| Resolution | 4K |
| Format | PNG → WebP (quality 85 — this is the hero-quality image) |
| Final file size target | < 280 KB |

### Quality checks (before using)

- [ ] Light direction is clearly directional (raking from one side), not flat/overall
- [ ] Warm amber side and deep shadow side are both present — this is the defining contrast
- [ ] Outer 20% of frame on TOP and BOTTOM fades cleanly (the vertical linear-gradient mask will use this)
- [ ] No recognizable architectural subject — if you can say "that's a house/office/church," regenerate
- [ ] No visible window with a view through it (would read as literal real estate → Zillow trap)
- [ ] Grain is filmic, not digital noise
- [ ] Dust particles in the light beam are a bonus (very cinematic) but not mandatory
- [ ] Shadow side is not muddy brown — should be indigo/umber/near-black

### Common failure modes → regenerate if

- **Looks like a stock photo of a living room / kitchen / hallway** → add: `abstract fragment only, no room interior, no domestic space, no floor, no ceiling visible as room`
- **Entire frame is uniformly warm/orange** → add: `high contrast between amber light and deep indigo shadow, roughly 50/50 light-to-shadow ratio, not a sunset overall wash`
- **Golden hour reads as SUNSET SKY instead of directional light** → add: `interior architectural detail, no sky visible, no horizon, light as directional beam through unseen source`
- **Feels like a tourism photo** → add: `editorial fine-art architectural photography, contemplative, no postcard composition`
- **People or figures appear in shadow** → add: `no people anywhere, no silhouettes, no human figures, no faces, purely architectural`
- **Frame edges are bright** → add: `vignette heavily, corners fade to near-black, top and bottom of frame are pure shadow`

### Bonus: if the first pass is great but too "interior," try this alt prompt

```
Raw brutalist concrete surface in raking golden-hour light, extreme detail
of the texture — form-tie holes, aggregate, subtle staining — with a sharp
diagonal shadow line dividing the frame. Warm amber top, deep umber
shadow bottom, no recognizable subject beyond the surface itself.
Editorial fine-art photograph. 16:9, 4K.
```

This safer fallback almost never goes wrong and gives a Tadao Ando / Peter Zumthor vibe.

---

## Image 3 — "The Grid"

**Role:** Background behind `CTASection`, layered under the existing violet radial gradient.
**Target opacity:** 0.25
**Output filename:** `frontend/public/images/night-grid.webp`

### Prompt

```
An abstract aerial photograph taken from very high altitude over a dense
urban area at 3 AM. Thousands of warm amber and sodium-vapor window lights
scattered across deep blue-black darkness like a constellation of stars,
but denser and subtly rectilinear — hinting at a grid of city blocks
without ever showing identifiable buildings, streets, highways, or
landmarks. Extreme shallow depth of field creates soft bokeh on most
lights, with only a narrow band of sharpness in the middle third. A hint
of atmospheric haze softens the scene. The palette is strictly deep
navy-black (#05070D), midnight indigo, and warm amber/sodium-gold light
points. No cool white LEDs, no blue streetlights, no red tail lights, no
headlights — only warm interior window light. No clouds. No recognizable
skyline. No moon. No stars in a sky (it's a top-down shot — no sky
visible). The outer 25% of the frame fades to pure near-black, dissolving
into void. Cinematic top-down perspective inspired by the opening shots
of Blade Runner 2049 and Denis Villeneuve's use of scale. Editorial
composition, muted saturation, atmospheric and contemplative. No text,
no numbers, no watermarks, no people, no vehicles. 16:9 aspect ratio,
4K resolution.
```

### Recommended settings

| Setting | Value |
|---|---|
| Aspect ratio | 16:9 |
| Resolution | 4K |
| Format | PNG → WebP (quality 82) |
| Final file size target | < 200 KB |

### Quality checks (before using)

- [ ] Dominant color of the frame is near-black, with light points as the only brightness
- [ ] Light points are WARM amber/gold, not cool white or cyan
- [ ] No recognizable skyline (if you can guess "that's NYC / Tokyo / LA," regenerate)
- [ ] No visible streets, highways, or car light trails (that would signal "real estate location map" too literally)
- [ ] Depth of field / bokeh is present — sharp lights AND soft lights in the same frame
- [ ] Corners fade cleanly to near-black on all four sides (radial mask at 85% needs this)
- [ ] No single light point is brighter than ~70% of max white — otherwise it will punch through the 0.25 opacity and violet gradient layers
- [ ] Subtle grid hint (rectilinear alignment) is preferred over pure random scatter — but ONLY a hint

### Common failure modes → regenerate if

- **Looks like a recognizable skyline / postcard view** → add: `top-down plan view, 90 degree birds-eye, no horizon, no building silhouettes, no tall structures`
- **Lights are white or blue** → add: `warm sodium-vapor and amber window light only, no cool LED white, no blue tint, no cyan`
- **Too much detail / reads as a satellite photo** → add: `soft focus, atmospheric haze, abstract light field, impressionistic, not documentary satellite imagery`
- **Car headlights / street grid visible** → add: `no street lights, no car lights, no roads, no traffic, only building interior window lights`
- **Stars visible in a sky** → add: `pure top-down aerial, no sky in frame, no horizon, looking straight down at the city`
- **Too uniform / boring texture** → add: `varied density, clusters of lights, dark gaps, organic distribution like a constellation`
- **Frame edges are bright** → add: `heavy vignette, corners and edges fade to pure black, only center of frame illuminated`

---

## Generatable Non-Imagery Assets

These aren't AI-generated images — they're SVG/CSS assets you can paste directly into code without Nano Banana Pro.

### Asset 1 — SVG grain/noise texture (body overlay)

**Role:** Invisible page-wide richness layer on `body::before`.
**Opacity:** `0.015`
**Output:** Inline in CSS as `data:image/svg+xml` (no file needed).

Drop this directly into [frontend/src/index.css](frontend/src/index.css):

```css
/* Body grain overlay — paste directly into index.css */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  opacity: 0.015;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.6 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
}
```

**Why this works:** `feTurbulence` with `fractalNoise` + `stitchTiles` gives seamless tileable noise. The `feColorMatrix` kills all color channels and keeps only 60% alpha, so it's pure luminance grain. At 0.015 opacity with `overlay` blend mode, it adds filmic depth without being perceptible as noise.

**Quality check:** Open the page, zoom to 400% in devtools. You should see very subtle "tooth" on flat dark areas. At 100% zoom it should be invisible but the page should feel less "plasticky."

---

### Asset 2 — Gradient fade section dividers

**Role:** Replace hard `border-t border-border-default` with softer horizontal fade lines.
**Output:** Tailwind class + div, no file needed.

```tsx
{/* Drop-in replacement for <section className="border-t border-border-default"> */}
<section className="relative">
  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
  {/* ... rest of section ... */}
</section>
```

---

### Asset 3 — Scan line overlay (ProductPreview mockups)

**Role:** Bloomberg Terminal subtle scanlines on mockup content.
**Output:** Pure CSS, paste into component or a utility class.

```css
/* Add to frontend/src/index.css or component-scoped CSS */
.mockup-scanlines {
  position: relative;
}
.mockup-scanlines::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(
    to bottom,
    transparent 0px,
    transparent 2px,
    rgba(255, 255, 255, 0.012) 2px,
    rgba(255, 255, 255, 0.012) 3px
  );
  mix-blend-mode: overlay;
}
```

**Quality check:** At 100% zoom, barely perceptible. At 200%+ you should see very faint horizontal lines. If they're visibly "CRT-like," reduce the alpha from `0.012` to `0.008`.

---

### Asset 4 — Precision reticle cursor (CTA hover)

**Role:** Custom cursor on primary CTAs — signals craft.
**Output:** SVG file at [frontend/public/images/reticle.svg](frontend/public/images/reticle.svg).

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8B7AFF" stroke-width="1.25" stroke-linecap="round">
  <circle cx="12" cy="12" r="9" opacity="0.6"/>
  <line x1="12" y1="1" x2="12" y2="6"/>
  <line x1="12" y1="18" x2="12" y2="23"/>
  <line x1="1" y1="12" x2="6" y2="12"/>
  <line x1="18" y1="12" x2="23" y2="12"/>
  <circle cx="12" cy="12" r="1" fill="#8B7AFF"/>
</svg>
```

Usage:
```css
.precision-cta:hover {
  cursor: url('/images/reticle.svg') 12 12, pointer;
}
```

**Note:** Custom SVG cursors are finicky across browsers. Safari requires a PNG fallback. If you want bulletproof cross-browser behavior, also export a 24×24 PNG of the same reticle to `/images/reticle.png` and chain:
```css
cursor: url('/images/reticle.svg') 12 12, url('/images/reticle.png') 12 12, pointer;
```

---

### Asset 5 — Ambient violet glow (StrategyTabs active state)

**Role:** Soft violet radial projected above active tab content.
**Output:** Inline style, no file.

```tsx
<div
  className="absolute inset-0 pointer-events-none"
  style={{
    background: `radial-gradient(circle 300px at 50% 0%, rgba(139, 122, 255, 0.08), transparent 70%)`,
  }}
/>
```

---

### Asset 6 — Film grain WebP (optional, for image sections only)

**Role:** Unify the 3 generated images with the rest of the UI.
**Output:** A 512×512 tileable grain texture at [frontend/public/images/grain.webp](frontend/public/images/grain.webp).

You can either:

**Option A — Generate in Nano Banana Pro** (rarely necessary, SVG grain usually suffices):
```
A seamless tileable 35mm film grain texture, pure luminance noise, grayscale,
fine grain structure, no pattern, no banding, no color, 512x512 pixels,
tileable edges, high detail, analog photography grain
```
Aspect: 1:1, Resolution: 2K, then downsample to 512×512 and convert to WebP.

**Option B — Use the SVG feTurbulence from Asset 1** — it's already tileable via `stitchTiles` and scales infinitely. Prefer this unless you have a specific reason to want baked raster grain.

---

## Workflow Summary

1. **Generate the 3 hero images in Nano Banana Pro** (Blueprint → Hour → Grid, in that order of importance)
2. **Run the QA checklists** for each image. Regenerate using the "failure mode" additions until all boxes tick
3. **Convert PNG → WebP** with `cwebp -q 82 input.png -o output.webp` (use `-q 85` for "The Hour" since it's the most visible)
4. **Save to** [frontend/public/images/](frontend/public/images/) with the exact filenames specified above
5. **Paste Assets 1–5** (grain CSS, fade dividers, scanlines, reticle, violet glow) directly into the codebase — no generation needed
6. **Verify build** with `cd frontend && npx vite build 2>&1 | tail -5`

---

## Priority Order

If you only have time to generate one image, generate **"The Hour"** — it's the highest-impact, most-visible of the three. If you have time for two, add **"The Grid"** (Peak-End Rule reinforcement). "The Blueprint" is P2 because it operates at 0.10 opacity and the viewer will barely register it consciously.

| Priority | Asset | Effort | Impact |
|---|---|---|---|
| P0 | Asset 1 — SVG body grain | 1 minute (copy-paste) | High (invisible richness) |
| P0 | Image 2 — The Hour | ~10 min generation + QA | Highest (featured) |
| P1 | Image 3 — The Grid | ~10 min generation + QA | High (CTA backdrop) |
| P1 | Asset 2 — Fade dividers | 10 min (refactor) | Medium |
| P2 | Image 1 — The Blueprint | ~10 min generation + QA | Medium (subliminal) |
| P2 | Asset 3 — Scanlines | 5 min | Medium |
| P3 | Asset 5 — Violet glow | 5 min | Low-medium |
| P3 | Asset 4 — Reticle cursor | 10 min | Low (micro-detail) |
