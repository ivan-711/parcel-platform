# Parcel Luxury Dark -- Base Component Library Spec

Reference tokens from Agent 01 (locked):
- Canvas `#0C0B0A` | Surface `#141312` | Elevated `#1E1D1B` | Overlay `#262523`
- Text: primary `#F0EDE8` | secondary `#A09D98` | muted `#5C5A56` | disabled `#3A3835`
- Accent `#8B7AFF` | gradient `#8B7AFF -> #6C5CE7`
- Borders: `white/[0.04]` default, `white/[0.06]` hover, `white/[0.08]` active
- Success `#7CCBA5` | Error `#D4766A` | Warning `#E5A84B`

Shared transition: `transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]`
Focus utility: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C0B0A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#8B7AFF]`

---

## 1. Button

Four variants: primary, secondary (ghost), danger, disabled. All share rounded-lg, text-sm, font-medium, h-10 px-4.

### 1a. Primary (violet gradient + glow)

```
DEFAULT:
  bg-gradient-to-r from-[#8B7AFF] to-[#6C5CE7]
  text-[#0C0B0A] font-medium text-sm
  rounded-lg h-10 px-5
  border border-white/[0.08]
  shadow-[0_1px_2px_rgba(0,0,0,0.3),0_0_12px_-3px_rgba(139,122,255,0.25)]
  transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]

HOVER:
  hover:shadow-[0_2px_8px_rgba(0,0,0,0.4),0_0_20px_-3px_rgba(139,122,255,0.4)]
  hover:brightness-110

FOCUS:
  focus-visible:outline-none
  focus-visible:ring-2 focus-visible:ring-[#0C0B0A]
  focus-visible:ring-offset-2 focus-visible:ring-offset-[#8B7AFF]

ACTIVE (press):
  active:scale-[0.98] active:brightness-95
  active:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_0_8px_-3px_rgba(139,122,255,0.2)]

DISABLED:
  disabled:opacity-40 disabled:pointer-events-none disabled:shadow-none

LOADING:
  opacity-80 pointer-events-none
  (replace label with 16px spinner: border-2 border-[#0C0B0A]/30 border-t-[#0C0B0A] rounded-full animate-spin)
```

### 1b. Secondary (ghost)

```
DEFAULT:
  bg-transparent
  text-[#A09D98] font-medium text-sm
  rounded-lg h-10 px-4
  border border-white/[0.06]
  transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]

HOVER:
  hover:bg-white/[0.04] hover:text-[#F0EDE8] hover:border-white/[0.08]

FOCUS:
  focus-visible:outline-none
  focus-visible:ring-2 focus-visible:ring-[#0C0B0A]
  focus-visible:ring-offset-2 focus-visible:ring-offset-[#8B7AFF]

ACTIVE:
  active:scale-[0.98] active:bg-white/[0.06]

DISABLED:
  disabled:opacity-40 disabled:pointer-events-none
```

### 1c. Danger

```
DEFAULT:
  bg-[#D4766A]/10
  text-[#D4766A] font-medium text-sm
  rounded-lg h-10 px-4
  border border-[#D4766A]/20
  transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]

HOVER:
  hover:bg-[#D4766A]/15 hover:border-[#D4766A]/30

FOCUS:
  focus-visible:outline-none
  focus-visible:ring-2 focus-visible:ring-[#0C0B0A]
  focus-visible:ring-offset-2 focus-visible:ring-offset-[#D4766A]

ACTIVE:
  active:scale-[0.98] active:bg-[#D4766A]/20

DISABLED:
  disabled:opacity-40 disabled:pointer-events-none
```

### 1d. Sizes

```
sm:  h-8  px-3 text-xs  rounded-md  gap-1.5
md:  h-10 px-5 text-sm  rounded-lg  gap-2     (default)
lg:  h-12 px-6 text-base rounded-lg gap-2.5
icon: h-10 w-10 rounded-lg p-0 (center child)
```

---

## 2. Input

Recessed dark field with label above. Uses `#111110` background to sit below the surface plane.

### 2a. Text Input

```
WRAPPER:
  flex flex-col gap-1.5

LABEL:
  text-xs font-medium text-[#A09D98] tracking-wide

INPUT DEFAULT:
  w-full h-10 px-3 py-2
  bg-[#111110]
  text-[#F0EDE8] text-sm placeholder:text-[#5C5A56]
  border border-white/[0.08]
  rounded-lg
  shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]
  transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]
  tabular-nums (for number inputs)

HOVER:
  hover:border-white/[0.12]

FOCUS:
  focus:border-[#8B7AFF]/50
  focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),0_0_0_3px_rgba(139,122,255,0.12)]
  focus:outline-none

ERROR:
  border-[#D4766A]/50
  shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),0_0_0_3px_rgba(212,118,106,0.12)]

ERROR HINT (below input):
  text-xs text-[#D4766A] mt-1

DISABLED:
  opacity-50 cursor-not-allowed bg-[#0E0D0C]
```

### 2b. Textarea variant

Same as input but: `min-h-[80px] py-2.5 resize-y`

### 2c. Input with prefix/suffix icon

```
CONTAINER:
  relative flex items-center

ICON (left):
  absolute left-3 h-4 w-4 text-[#5C5A56] pointer-events-none

INPUT:
  pl-9 (when left icon present)
  pr-9 (when right icon present)
```

---

## 3. Card

Gradient surface with top-edge highlight. The core layout container for all data.

### 3a. Standard Card

```
DEFAULT:
  bg-[#141312]
  border border-white/[0.04]
  rounded-xl
  p-6
  shadow-[0_1px_2px_rgba(0,0,0,0.2)]
  bg-gradient-to-b from-white/[0.03] via-white/[0.01] to-transparent
  relative overflow-hidden
  transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]

TOP-EDGE HIGHLIGHT (::after):
  content-[''] absolute top-0 left-[10%] right-[10%] h-px pointer-events-none
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255,255,255,0.08) 30%,
    rgba(255,255,255,0.10) 50%,
    rgba(255,255,255,0.08) 70%,
    transparent
  )

HOVER (interactive cards only):
  hover:bg-[#171615]
  hover:border-white/[0.06]
  hover:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.4)]

FOCUS:
  focus-visible:outline-none
  focus-visible:ring-2 focus-visible:ring-[#0C0B0A]
  focus-visible:ring-offset-2 focus-visible:ring-offset-[#8B7AFF]

ACTIVE:
  active:bg-[#151413] active:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.3)]
```

Register `edge-highlight` as a Tailwind utility in `index.css`:

```css
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
      rgba(255, 255, 255, 0.08) 30%,
      rgba(255, 255, 255, 0.10) 50%,
      rgba(255, 255, 255, 0.08) 70%,
      transparent
    );
  }
}
```

### 3b. Elevated Card (for modals, expanded detail panels)

```
  bg-[#1E1D1B]
  border border-white/[0.06]
  rounded-xl
  bg-gradient-to-b from-white/[0.05] via-white/[0.02] to-transparent
  shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)]
  edge-highlight
```

Top-edge highlight increases to `0.10 -> 0.12 -> 0.10` center peak for elevated.

### 3c. Card inner sections

```
CARD HEADER:
  flex flex-col gap-1.5 p-6 pb-0

CARD TITLE:
  text-lg font-semibold text-[#F0EDE8] leading-none tracking-tight

CARD DESCRIPTION:
  text-sm text-[#A09D98]

CARD CONTENT:
  p-6 pt-4

CARD FOOTER:
  flex items-center gap-3 p-6 pt-0

CARD DIVIDER:
  border-b border-white/[0.04] mx-6
```

---

## 4. Badge

Glass-like appearance: transparent fill with matching colored border. Three categories.

### 4a. Strategy Badges

All share: `inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border`

```
WHOLESALE:
  bg-[#E5A84B]/8 text-[#E5A84B] border-[#E5A84B]/20

CREATIVE FINANCE:
  bg-[#8B7AFF]/8 text-[#C4BEFF] border-[#8B7AFF]/20

BRRRR:
  bg-[#7B9FCC]/8 text-[#7B9FCC] border-[#7B9FCC]/20

BUY & HOLD:
  bg-[#7CCBA5]/8 text-[#7CCBA5] border-[#7CCBA5]/20

FLIP:
  bg-[#D4766A]/8 text-[#D4766A] border-[#D4766A]/20
```

### 4b. Plan Badges

```
FREE:
  bg-white/[0.04] text-[#A09D98] border-white/[0.06]

PRO:
  bg-[#8B7AFF]/10 text-[#8B7AFF] border-[#8B7AFF]/25
  (optional shimmer on first render for upsell attention)

TRIAL:
  bg-[#E5A84B]/8 text-[#E5A84B] border-[#E5A84B]/20
```

### 4c. Status Badges

```
ACTIVE / SUCCESS:
  bg-[#7CCBA5]/8 text-[#7CCBA5] border-[#7CCBA5]/20

PENDING / WARNING:
  bg-[#E5A84B]/8 text-[#E5A84B] border-[#E5A84B]/20

ERROR / FAILED:
  bg-[#D4766A]/8 text-[#D4766A] border-[#D4766A]/20

NEUTRAL / DEFAULT:
  bg-white/[0.04] text-[#A09D98] border-white/[0.06]
```

### 4d. Badge with dot indicator

Prefix a 6px dot matching the text color: `h-1.5 w-1.5 rounded-full bg-current mr-1.5`

---

## 5. Modal (Dialog)

Dark glass overlay with elevated card surface. Spring entrance animation.

### 5a. Overlay (backdrop)

```
  fixed inset-0 z-50
  bg-[#0C0B0A]/75
  backdrop-blur-[20px] backdrop-saturate-[180%]
  data-[state=open]:animate-in data-[state=open]:fade-in-0
  data-[state=closed]:animate-out data-[state=closed]:fade-out-0
  duration-200
```

Fallback: `@supports not (backdrop-filter: blur(1px)) { background: rgba(12,11,10,0.95); }`

### 5b. Content panel

```
  fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2
  w-full max-w-lg
  bg-[#1E1D1B]
  border border-white/[0.06]
  rounded-2xl
  p-6
  shadow-[0_24px_64px_-16px_rgba(0,0,0,0.6)]
  bg-gradient-to-b from-white/[0.05] via-white/[0.02] to-transparent
  edge-highlight

  data-[state=open]:animate-in
  data-[state=open]:fade-in-0
  data-[state=open]:zoom-in-95
  data-[state=open]:slide-in-from-left-1/2
  data-[state=open]:slide-in-from-top-[48%]
  data-[state=closed]:animate-out
  data-[state=closed]:fade-out-0
  data-[state=closed]:zoom-out-95
  duration-200
```

For Framer Motion spring entrance (preferred over CSS for richer feel):
```ts
{
  initial: { opacity: 0, scale: 0.96, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.98, y: 4 },
  transition: { type: 'spring', damping: 28, stiffness: 380 }
}
```

### 5c. Close button

```
  absolute right-4 top-4
  h-8 w-8 rounded-lg
  flex items-center justify-center
  text-[#5C5A56]
  hover:text-[#F0EDE8] hover:bg-white/[0.06]
  transition-all duration-150
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B7AFF]/50
```

---

## 6. Table

Dark alternating rows with ultra-subtle opacity differentiation. Financial columns use tabular-nums and right alignment.

### 6a. Table container

```
  w-full overflow-auto
  bg-[#141312] border border-white/[0.04] rounded-xl
  edge-highlight
```

### 6b. Table head

```
<thead>
  bg-white/[0.02]
  border-b border-white/[0.06]

<th>
  text-xs font-medium text-[#5C5A56] uppercase tracking-wider
  px-4 py-3 text-left
  (financial columns: text-right tabular-nums)
```

### 6c. Table body rows

```
<tr> DEFAULT:
  border-b border-white/[0.03]
  transition-colors duration-150

<tr> ALTERNATING (even rows):
  bg-white/[0.015]

<tr> HOVER:
  hover:bg-white/[0.04]

<tr> SELECTED:
  bg-[#8B7AFF]/[0.06] border-l-2 border-l-[#8B7AFF]

<td>:
  px-4 py-3 text-sm text-[#F0EDE8]
  (financial columns: text-right tabular-nums font-mono text-sm)
  (secondary data: text-[#A09D98])
  (muted metadata: text-[#5C5A56])
```

### 6d. Financial number formatting in table cells

```
POSITIVE:
  text-[#7CCBA5] tabular-nums text-right font-mono
  prefix with directional arrow: text-[#7CCBA5]/60 mr-1

NEGATIVE:
  text-[#D4766A] tabular-nums text-right font-mono

NEUTRAL:
  text-[#A09D98] tabular-nums text-right font-mono
```

### 6e. Empty state row

```
  text-center py-12 text-[#5C5A56] text-sm
  (optionally: illustration or icon at reduced opacity)
```

---

## 7. Tabs

Two variants: underline and pill. Both on dark surfaces.

### 7a. Underline Tabs

```
TAB LIST:
  flex gap-1 border-b border-white/[0.04]

TAB TRIGGER DEFAULT:
  px-4 py-2.5
  text-sm font-medium text-[#5C5A56]
  border-b-2 border-transparent
  -mb-px
  transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]

TAB TRIGGER HOVER:
  hover:text-[#A09D98]

TAB TRIGGER ACTIVE (selected):
  text-[#F0EDE8]
  border-b-2 border-[#8B7AFF]

TAB TRIGGER FOCUS:
  focus-visible:outline-none focus-visible:text-[#F0EDE8]
  focus-visible:bg-white/[0.04] rounded-t-md

TAB TRIGGER DISABLED:
  opacity-40 pointer-events-none
```

### 7b. Pill Tabs

```
TAB LIST:
  inline-flex gap-1 p-1
  bg-white/[0.03] rounded-lg border border-white/[0.04]

TAB TRIGGER DEFAULT:
  px-3 py-1.5
  text-sm font-medium text-[#5C5A56]
  rounded-md
  transition-all duration-200

TAB TRIGGER HOVER:
  hover:text-[#A09D98] hover:bg-white/[0.04]

TAB TRIGGER ACTIVE (selected):
  text-[#F0EDE8]
  bg-[#1E1D1B]
  shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.04)]
  border border-white/[0.06]

TAB TRIGGER FOCUS:
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B7AFF]/50

TAB TRIGGER DISABLED:
  opacity-40 pointer-events-none
```

### 7c. Tab content area

```
TAB CONTENT:
  mt-4 (underline variant)
  mt-3 (pill variant)
  focus-visible:outline-none
```

---

## 8. Toast / Sonner

Dark surface with colored left-border accent. Four semantic variants.

### 8a. Base toast

```
  bg-[#1E1D1B]
  border border-white/[0.06]
  rounded-lg
  p-4 pl-5
  shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)]
  text-[#F0EDE8] text-sm

  DESCRIPTION:
    text-[#A09D98] text-sm mt-0.5
```

### 8b. Semantic left-border accents

Applied via `border-l-[3px]` to override the base left border:

```
SUCCESS:
  border-l-[3px] border-l-[#7CCBA5]
  icon: text-[#7CCBA5]

ERROR:
  border-l-[3px] border-l-[#D4766A]
  icon: text-[#D4766A]

WARNING:
  border-l-[3px] border-l-[#E5A84B]
  icon: text-[#E5A84B]

INFO:
  border-l-[3px] border-l-[#8B7AFF]
  icon: text-[#8B7AFF]
```

### 8c. Toast action and cancel buttons

```
ACTION BUTTON:
  bg-[#8B7AFF] text-[#0C0B0A] text-xs font-medium
  px-3 py-1.5 rounded-md
  hover:bg-[#7B6AEF]

CANCEL BUTTON:
  bg-white/[0.06] text-[#A09D98] text-xs font-medium
  px-3 py-1.5 rounded-md
  hover:bg-white/[0.08] hover:text-[#F0EDE8]
```

### 8d. Sonner config object

```tsx
<Sonner
  theme="dark"
  toastOptions={{
    classNames: {
      toast:
        'group toast group-[.toaster]:bg-[#1E1D1B] group-[.toaster]:text-[#F0EDE8] group-[.toaster]:border-white/[0.06] group-[.toaster]:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)]',
      description: 'group-[.toast]:text-[#A09D98]',
      actionButton:
        'group-[.toast]:bg-[#8B7AFF] group-[.toast]:text-[#0C0B0A]',
      cancelButton:
        'group-[.toast]:bg-white/[0.06] group-[.toast]:text-[#A09D98]',
    },
  }}
/>
```

---

## 9. Skeleton

Dark shimmer using a traveling gradient highlight on the `#141312` base.

### 9a. Skeleton line

```
  h-3 rounded-md
  bg-gradient-to-r from-white/[0.03] via-white/[0.06] to-white/[0.03]
  bg-[length:200%_100%]
  animate-[shimmer_1.8s_ease-in-out_infinite]
```

Keyframes (register in `index.css`):
```css
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### 9b. Skeleton card (SkeletonCard replacement)

```
CONTAINER:
  bg-[#141312] border border-white/[0.04] rounded-xl p-5 space-y-3
  shadow-[0_1px_2px_rgba(0,0,0,0.2)]

TITLE LINE (first):
  h-4 w-2/5 rounded-md
  (shimmer gradient as above)

BODY LINES:
  h-3 rounded-md
  w-full (except last line: w-3/4)
  (shimmer gradient as above)
  style={{ animationDelay: `${index * 80}ms` }}
```

### 9c. Skeleton variants

```
SKELETON CIRCLE (avatar):
  h-10 w-10 rounded-full (shimmer gradient)

SKELETON BLOCK (chart area):
  h-32 w-full rounded-lg (shimmer gradient)

SKELETON KPI:
  Container: same as SkeletonCard
  Line 1: h-3 w-24 (label)
  Line 2: h-8 w-32 (value)
  Line 3: h-3 w-16 (delta)
```

---

## 10. Tooltip

Elevated dark surface with subtle backdrop blur. Spring entrance animation.

### 10a. Tooltip content

```
DEFAULT:
  z-50
  bg-[#262523]
  border border-white/[0.08]
  rounded-lg
  px-3 py-2
  text-sm text-[#F0EDE8]
  shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]
  backdrop-blur-sm

ENTRANCE ANIMATION (CSS):
  animate-in fade-in-0 zoom-in-95
  data-[side=bottom]:slide-in-from-top-2
  data-[side=top]:slide-in-from-bottom-2
  data-[side=left]:slide-in-from-right-2
  data-[side=right]:slide-in-from-left-2

EXIT:
  data-[state=closed]:animate-out
  data-[state=closed]:fade-out-0
  data-[state=closed]:zoom-out-95

DELAY:
  delayDuration={300} (via TooltipProvider)
```

### 10b. Framer Motion spring entrance (optional upgrade)

```ts
{
  initial: { opacity: 0, y: 4, scale: 0.96 },
  animate: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring', damping: 22, stiffness: 400, mass: 0.5 }
  },
  exit: {
    opacity: 0, y: 2, scale: 0.98,
    transition: { duration: 0.1, ease: 'easeIn' }
  }
}
```

### 10c. ConceptTooltip (glossary variant)

```
TRIGGER:
  border-b border-dashed border-[#5C5A56] cursor-help

CONTENT:
  max-w-[280px] bg-[#262523] border border-white/[0.08] p-3 rounded-lg
  shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]

TERM:
  text-sm font-semibold text-[#F0EDE8] mb-1

DEFINITION:
  text-xs text-[#A09D98] leading-relaxed
```

---

## 11. Progress Bar

Violet gradient fill with threshold color shifts for warning and danger zones.

### 11a. Track

```
  relative h-2 w-full overflow-hidden rounded-full
  bg-white/[0.06]
```

### 11b. Fill

```
DEFAULT (0-70%):
  absolute inset-y-0 left-0 rounded-full
  bg-gradient-to-r from-[#8B7AFF] to-[#6C5CE7]
  transition-[width] duration-700 ease-[cubic-bezier(0.25,0.1,0.25,1)]

WARNING THRESHOLD (70-90%):
  bg-gradient-to-r from-[#E5A84B] to-[#D49A3F]

DANGER THRESHOLD (90-100%):
  bg-gradient-to-r from-[#D4766A] to-[#C45E52]
```

### 11c. Shimmer overlay (optional, for active/indeterminate)

```
  absolute inset-0 rounded-full
  bg-gradient-to-r from-transparent via-white/[0.15] to-transparent
  bg-[length:200%_100%]
  animate-[shimmer_2s_ease-in-out_infinite]
  pointer-events-none
```

### 11d. Label

```
  flex justify-between items-center mb-1.5
  text-xs font-medium text-[#A09D98]

  VALUE:
    tabular-nums text-[#F0EDE8]
```

### 11e. States

```
INDETERMINATE:
  Fill: w-1/3 animate-[indeterminate_1.5s_ease-in-out_infinite]
  @keyframes indeterminate {
    0%   { left: -33%; }
    100% { left: 100%; }
  }

DISABLED:
  opacity-50 (entire progress bar)
```

---

## 12. Select / Dropdown

Dark popover with hover states and selected checkmark indicator.

### 12a. Trigger

```
DEFAULT:
  flex h-10 w-full items-center justify-between
  rounded-lg px-3 py-2
  bg-[#111110]
  border border-white/[0.08]
  shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]
  text-sm text-[#F0EDE8]
  data-[placeholder]:text-[#5C5A56]
  transition-all duration-200

HOVER:
  hover:border-white/[0.12]

FOCUS:
  focus:border-[#8B7AFF]/50
  focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),0_0_0_3px_rgba(139,122,255,0.12)]
  focus:outline-none

DISABLED:
  opacity-50 cursor-not-allowed

CHEVRON ICON:
  h-4 w-4 text-[#5C5A56]
  transition-transform duration-200
  data-[state=open]:rotate-180
```

### 12b. Dropdown content (popover)

```
  z-50
  bg-[#1E1D1B]
  border border-white/[0.08]
  rounded-xl
  p-1
  shadow-[0_16px_48px_-12px_rgba(0,0,0,0.6)]
  bg-gradient-to-b from-white/[0.03] to-transparent

  data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95
  data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95
  data-[side=bottom]:slide-in-from-top-2
  data-[side=top]:slide-in-from-bottom-2
```

### 12c. Select item

```
DEFAULT:
  relative flex w-full items-center
  rounded-lg py-2 pl-8 pr-3
  text-sm text-[#A09D98]
  cursor-default select-none
  transition-colors duration-100

HOVER / FOCUS:
  focus:bg-white/[0.06] focus:text-[#F0EDE8]

SELECTED:
  text-[#F0EDE8]

CHECKMARK (selected indicator):
  absolute left-2.5 flex h-4 w-4 items-center justify-center
  text-[#8B7AFF]

DISABLED:
  opacity-40 pointer-events-none
```

### 12d. Select group label

```
  px-2 py-1.5 text-xs font-medium text-[#5C5A56] uppercase tracking-wider
```

### 12e. Select separator

```
  -mx-1 my-1 h-px bg-white/[0.04]
```

---

## CRITICAL DECISIONS

### D1. Dark text on primary violet buttons

The `#8B7AFF` accent is light enough (L~74% in HSL) that `#0C0B0A` dark text achieves ~6.3:1 contrast (WCAG AA). White text on violet only reaches ~2.8:1 and fails. All primary button labels must use dark text `#0C0B0A`, not cream.

### D2. Inset shadows for inputs and selects

Inputs use `shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]` to create a physically recessed appearance. This is a deliberate spatial choice: things you read (cards) are elevated, things you type into (inputs) are recessed. This distinction is the signature depth cue of the luxury dark system and must not be omitted.

### D3. Edge-highlight utility as a registered Tailwind layer

The `::after` gradient top-edge highlight is implemented as a reusable `edge-highlight` CSS utility class rather than inline Tailwind on every card. This ensures consistency (identical gradient stops everywhere) and reduces template noise. The utility is defined once in `index.css` inside `@layer utilities`.

### D4. CSS transitions over Framer Motion for hover states

All hover states (background, border, shadow) use CSS `transition` with `cubic-bezier(0.16, 1, 0.3, 1)` at 200ms. Framer Motion's `whileHover` triggers React re-renders on every mouseenter/mouseleave, which is unnecessary overhead for visual-only changes. Framer Motion is reserved for enter/exit animations and layout transitions only.

### D5. Strategy badges use glass style, not opaque fills

The current light-theme `StrategyBadge` uses opaque fills (`#FEF3C7` bg, `#92400E` text). The dark redesign uses transparent tinted fills (`bg-[color]/8`) with matching colored borders. This glass-like treatment integrates badges into the dark surface rather than making them punch holes of light in the interface.

### D6. Border opacity progression: 0.04 -> 0.06 -> 0.08

Card borders default to `white/[0.04]`, increase to `0.06` on hover, and `0.08` on active/focus. This three-step progression is imperceptible on its own but compounds across the interface to create a living, responsive surface hierarchy. Never use solid hex borders like `border-[#1A1A2E]` -- they do not adapt to surface context.

### D7. Financial numbers: tabular-nums + right-alignment + font-mono

All monetary values in tables use `tabular-nums text-right font-mono text-sm`. This ensures columns of numbers align vertically at the decimal point and do not shift width when values update. The `font-mono` override is specifically for table cells; KPI headline numbers use Inter with `tabular-nums` only.

### D8. Toast semantic accents via left border only

Toasts communicate severity through a 3px colored left border, not through full background tinting. A `bg-[#7CCBA5]/10` full-background tint on a dark toast would be barely visible and waste the signal. A sharp 3px left edge provides the same semantic cue with stronger contrast and less surface disruption.

### D9. Skeleton shimmer direction and speed

Shimmer travels left-to-right at 1.8s cycle with ease-in-out easing. Each line is staggered by 80ms delay. This matches Mercury's approach and prevents the "synchronized wave" effect that makes shimmer feel mechanical. The `via-white/[0.06]` peak is the maximum -- higher values create a visible "flash" rather than a subtle traveling highlight.

### D10. Modal backdrop: blur(20px) + saturate(180%) at 75% opacity

The modal overlay uses `bg-[#0C0B0A]/75` with `backdrop-blur-[20px] backdrop-saturate-[180%]`. The 75% opacity is high enough for text legibility on the modal content but low enough to preserve ambient context from the page behind. The `saturate(180%)` prevents the washed-out gray effect that raw blur creates on warm-dark backgrounds. A `@supports` fallback degrades to 95% opacity solid for browsers without `backdrop-filter`.
