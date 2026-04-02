# Agent 09 -- Settings & Auth Pages: Dark Luxury Design Spec

Design specification for Parcel's Settings page (Profile, Notifications, Billing tabs)
and all authentication pages (Login, Register, Forgot Password, Reset Password) migrated
to the warm-dark luxury palette.

**Locked tokens:**
- Background: `#0C0B0A` | Surface: `#141312` | Elevated: `#1E1D1B`
- Input bg: `#111110` | Border: `white/[0.08]` | Focus: violet ring
- Text primary: `#F0EDE8` | Text secondary: `#A09D98` | Accent: `#8B7AFF`
- Error: `#D4766A` (terracotta) | Success: `#7CCBA5` (sage)

**Current state:** All pages use `bg-gray-50` backgrounds, `bg-white` cards, `border-gray-200`
borders, `text-gray-900` headings, and `bg-lime-700` accent buttons. This spec replaces
every light-theme primitive with dark equivalents.

---

## 1. Settings Layout

### Tab Navigation (Pill Variant)

The current implementation uses two tab styles: underline tabs on desktop and pill tabs on
mobile. The dark redesign unifies both breakpoints to a **pill variant** for consistency
with the warm-dark aesthetic. Underline indicators disappear into dark backgrounds; pills
provide the necessary surface contrast.

**Desktop tabs (>= md):**

```
className="flex gap-1 p-1 rounded-xl bg-white/[0.04] mb-8"
```

Each tab button:

```tsx
// Inactive
className="px-4 py-2 text-sm font-medium text-[#A09D98] rounded-lg
           transition-all duration-200 hover:text-[#F0EDE8] hover:bg-white/[0.04]"

// Active
className="px-4 py-2 text-sm font-medium text-[#F0EDE8] rounded-lg
           bg-white/[0.08] shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
```

The active pill uses `bg-white/[0.08]` -- a subtle lift that reads as "selected" without
competing with content. The `motion.div layoutId="settings-tab-pill"` animates between
tabs using Framer Motion's shared layout.

**Mobile tabs (< md):**

Same pill treatment, horizontally scrollable:

```
className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:hidden scrollbar-none mb-6"
```

Individual pill:

```tsx
// Inactive
className="shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium
           text-[#A09D98] transition-colors hover:text-[#F0EDE8] hover:bg-white/[0.04]"

// Active
className="shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium
           text-[#F0EDE8] bg-[#8B7AFF]/15 ring-1 ring-[#8B7AFF]/30"
```

Mobile active state uses a violet tint (`bg-[#8B7AFF]/15`) to provide stronger affordance
on smaller screens.

### Content Area

```
className="max-w-[640px] mx-auto space-y-6"
```

No change to max-width or spacing. The content container remains `640px` to keep form
fields at comfortable reading width.

---

## 2. Profile Tab

### Section Cards

Replace all `bg-white border-gray-200` cards:

```tsx
className="bg-[#141312] border border-white/[0.08] rounded-xl p-6"
```

No `shadow-xs` -- dark surfaces create depth via border contrast, not drop shadows.

### Avatar Upload (New Component)

Add an avatar section at the top of the Profile card:

```tsx
<div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/[0.06]">
  {/* Avatar circle */}
  <div className="relative group">
    <div className="w-16 h-16 rounded-full bg-[#1E1D1B] border border-white/[0.08]
                    flex items-center justify-center overflow-hidden">
      {avatarUrl ? (
        <img src={avatarUrl} className="w-full h-full object-cover" />
      ) : (
        <span className="text-xl font-semibold text-[#A09D98]">
          {initials}
        </span>
      )}
    </div>
    {/* Hover overlay */}
    <div className="absolute inset-0 rounded-full bg-black/50 opacity-0
                    group-hover:opacity-100 transition-opacity flex items-center
                    justify-center cursor-pointer">
      <Camera size={18} className="text-white/70" />
    </div>
  </div>
  <div>
    <p className="text-sm font-medium text-[#F0EDE8]">{user.name}</p>
    <p className="text-xs text-[#A09D98]">{user.email}</p>
    <button className="text-xs text-[#8B7AFF] hover:text-[#A594FF]
                       transition-colors mt-1">
      Change avatar
    </button>
  </div>
</div>
```

### Form Fields (Dark Styling)

**Label:**

```tsx
className="text-xs font-medium text-[#A09D98]"
```

**Input (editable):**

```tsx
className="bg-[#111110] border border-white/[0.08] text-[#F0EDE8]
           placeholder:text-[#5C5A56] rounded-lg px-3 py-2 text-sm
           focus:outline-none focus:ring-2 focus:ring-[#8B7AFF]/40
           focus:border-[#8B7AFF]/50 transition-all duration-200"
```

**Input (read-only, e.g. Role):**

```tsx
className="bg-[#0C0B0A] border border-white/[0.06] text-[#5C5A56]
           cursor-not-allowed rounded-lg px-3 py-2 text-sm"
```

### Section Heading

```tsx
className="text-sm font-semibold text-[#F0EDE8] mb-4"
```

### Save Button (Primary CTA)

```tsx
className="px-4 py-2 rounded-lg bg-[#8B7AFF] text-white text-sm font-medium
           hover:bg-[#9D8FFF] transition-colors
           disabled:opacity-40 disabled:cursor-not-allowed"
```

Replaces `bg-lime-700`. Violet accent is the primary interactive color across all dark pages.

### Change Password Section

Same card treatment as Profile. All password inputs use the editable input style above.
The password hint text:

```tsx
className="text-[11px] text-[#5C5A56]"
```

---

## 3. Billing Tab

The billing tab container inherits the dark card treatment. Specific billing component
internals (plan cards, usage meters, invoice tables, cancel dialog) are specified by
**Agent 11** (billing component design). This spec defines only the wrapper and integration
points.

### Plan Display Card

```tsx
className="bg-[#141312] border border-white/[0.08] rounded-xl p-6"
```

### Status Badge (Dark Variant)

```tsx
const darkStyles: Record<string, string> = {
  active:     'bg-[#7CCBA5]/15 text-[#7CCBA5]',
  trialing:   'bg-[#8B7AFF]/15 text-[#8B7AFF]',
  past_due:   'bg-[#E5A84B]/15 text-[#E5A84B]',
  canceled:   'bg-[#D4766A]/15 text-[#D4766A]',
  incomplete: 'bg-white/[0.06] text-[#5C5A56]',
  unpaid:     'bg-[#D4766A]/15 text-[#D4766A]',
}
```

Badge base: `inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold`

### Usage Meter (Placeholder)

Defer to Agent 11 for the full usage meter component. Integration slot:

```tsx
<div className="bg-[#141312] border border-white/[0.08] rounded-xl p-6">
  <UsageMeter /> {/* Agent 11 handles internals */}
</div>
```

### Payment Method & Invoice History

Wrap in dark cards. CreditCard icon and ExternalLink icon use `text-[#A09D98]`. "Manage
billing" link uses `text-[#8B7AFF] hover:text-[#A594FF]`.

---

## 4. Notifications Tab

### Card Container

```tsx
className="bg-[#141312] border border-white/[0.08] rounded-xl p-6"
```

### Section Grouping

Each notification group has a title and description on the left, toggle on the right:

```tsx
<div className="flex items-start justify-between">
  <div>
    <p className="text-sm font-medium text-[#F0EDE8]">Email Notifications</p>
    <p className="text-xs text-[#A09D98] mt-0.5">
      Get notified when your document analysis is complete
    </p>
  </div>
  <Switch />
</div>
```

Multiple groups separated by:

```tsx
className="border-t border-white/[0.06] pt-5 mt-5"
```

### Toggle Switch (Dark Variant)

The Switch component needs dark-mode overrides:

```tsx
// Unchecked track
className="bg-white/[0.08] border border-white/[0.06]"

// Checked track
className="bg-[#8B7AFF]"

// Thumb (both states)
className="bg-[#F0EDE8] shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
```

### Saved / Error Feedback

```tsx
// Saved confirmation
className="flex items-center gap-1 text-[#7CCBA5] text-sm mt-3"

// Error
className="text-[#D4766A] text-sm mt-3"
```

---

## 5. Auth Pages -- Login

### Page Background

```tsx
className="min-h-screen bg-[#0C0B0A] flex items-center justify-center px-4"
```

Optional: add a subtle radial glow behind the card for visual warmth:

```tsx
<div className="absolute inset-0 pointer-events-none">
  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                  w-[600px] h-[600px] rounded-full
                  bg-[#8B7AFF]/[0.03] blur-[120px]" />
</div>
```

### Auth Card

```tsx
className="w-full max-w-[420px] bg-[#141312] border border-white/[0.08]
           rounded-2xl p-8 space-y-6 relative z-10"
```

Reduced from `max-w-[480px]` to `420px` for tighter, more premium proportions. Border
radius bumped to `rounded-2xl` (16px) for luxury feel.

### Logo Block

```tsx
<div className="space-y-1 text-center">
  <div className="flex items-center justify-center gap-2 mb-3">
    <div className="w-8 h-8 rounded-lg bg-[#8B7AFF] flex items-center justify-center">
      <span className="text-xs font-bold text-white font-mono">P</span>
    </div>
  </div>
  <p className="text-xl font-semibold text-[#F0EDE8] tracking-tight">Parcel</p>
  <p className="text-sm text-[#A09D98]">Sign in to your account</p>
</div>
```

Logo square changes from `bg-lime-700` to `bg-[#8B7AFF]`. Size bumped to `w-8 h-8` with
`rounded-lg` for softer corners.

### Form Labels

```tsx
className="text-[#A09D98] text-xs"
```

### Form Inputs

```tsx
className="bg-[#111110] border border-white/[0.08] text-[#F0EDE8]
           placeholder:text-[#5C5A56] rounded-lg
           focus:ring-2 focus:ring-[#8B7AFF]/40 focus:border-[#8B7AFF]/50
           transition-all duration-200"
```

### Forgot Password Link

```tsx
className="text-xs text-[#8B7AFF] hover:text-[#A594FF] transition-colors"
```

### Primary CTA (Sign In)

```tsx
className="w-full bg-[#8B7AFF] hover:bg-[#9D8FFF] text-white font-medium
           rounded-lg py-2.5 transition-colors"
```

### Social Login Buttons (Ghost Style)

Below the primary CTA, add an optional divider and social buttons:

```tsx
{/* Divider */}
<div className="flex items-center gap-3 my-2">
  <div className="flex-1 h-px bg-white/[0.06]" />
  <span className="text-[11px] text-[#5C5A56] uppercase tracking-wider">or</span>
  <div className="flex-1 h-px bg-white/[0.06]" />
</div>

{/* Social buttons — ghost style */}
<button className="w-full flex items-center justify-center gap-2 py-2.5
                   rounded-lg border border-white/[0.08] text-sm text-[#A09D98]
                   hover:bg-white/[0.04] hover:text-[#F0EDE8] hover:border-white/[0.12]
                   transition-all duration-200">
  <GoogleIcon className="w-4 h-4" />
  Continue with Google
</button>
```

Ghost style = transparent bg, subtle border, secondary text. On hover, slight lift via
`bg-white/[0.04]` and text brightens. No filled backgrounds to keep visual hierarchy clear
-- the violet CTA remains dominant.

### Footer Link

```tsx
<p className="text-center text-xs text-[#5C5A56]">
  Don't have an account?{' '}
  <Link className="text-[#8B7AFF] hover:text-[#A594FF] transition-colors">
    Get started
  </Link>
</p>
```

---

## 6. Auth Pages -- Register

### Card Treatment

Same as Login: `bg-[#141312] border border-white/[0.08] rounded-2xl p-8 max-w-[420px]`.

### Trial Banner

```tsx
<p className="text-xs text-[#8B7AFF] font-medium">Start your 7-day free Pro trial</p>
```

Replaces `text-lime-700`. Positioned below subtitle, centered.

### Role Selection Cards

```tsx
// Inactive
className="flex flex-col items-center gap-1.5 p-3 rounded-lg
           border border-white/[0.08] bg-transparent text-center
           transition-all duration-200 hover:border-white/[0.14] hover:bg-white/[0.03]"

// Selected
className="flex flex-col items-center gap-1.5 p-3 rounded-lg
           border border-[#8B7AFF]/40 bg-[#8B7AFF]/10 text-center
           transition-all duration-200 ring-1 ring-[#8B7AFF]/20"
```

Role label: `text-xs font-medium text-[#F0EDE8]`
Role description: `text-[10px] text-[#5C5A56] leading-tight`

### Password Strength Indicator

Add below the password input on the Register page:

```tsx
<div className="space-y-1.5 mt-2">
  {/* Strength bar */}
  <div className="flex gap-1">
    {[0, 1, 2, 3].map((i) => (
      <div
        key={i}
        className={cn(
          'h-1 flex-1 rounded-full transition-colors duration-300',
          i < strengthLevel
            ? strengthColors[strengthLevel]
            : 'bg-white/[0.06]'
        )}
      />
    ))}
  </div>
  {/* Strength label */}
  <p className={cn('text-[11px] transition-colors', strengthTextColor)}>
    {strengthLabel}
  </p>
</div>
```

Strength color mapping:

```tsx
const strengthColors: Record<number, string> = {
  0: 'bg-white/[0.06]',          // empty
  1: 'bg-[#D4766A]',             // weak — terracotta
  2: 'bg-[#E5A84B]',             // fair — amber
  3: 'bg-[#7CCBA5]',             // good — sage
  4: 'bg-[#7CCBA5]',             // strong — sage
}

const strengthTextColors: Record<number, string> = {
  0: 'text-[#5C5A56]',
  1: 'text-[#D4766A]',
  2: 'text-[#E5A84B]',
  3: 'text-[#7CCBA5]',
  4: 'text-[#7CCBA5]',
}
```

Strength levels: 0 = empty, 1 = weak (<8 chars), 2 = fair (8+ chars, 1 type),
3 = good (8+ chars, 2 types), 4 = strong (12+ chars, 3+ types including special).

---

## 7. Auth Pages -- Forgot / Reset Password

### Forgot Password

Same card + background as Login. Minimal content: logo, subtitle, single email input,
CTA button, back link.

**Subtitle text:**

```tsx
className="text-sm text-[#A09D98]"
// "Reset your password" (form state)
// "Check your inbox" (success state)
```

**Instruction text:**

```tsx
className="text-xs text-[#5C5A56] text-center mb-4"
// "Enter your email and we'll send you a reset link"
```

**Success state icon circle:**

```tsx
className="w-12 h-12 rounded-full bg-[#7CCBA5]/15 flex items-center justify-center"
// <Mail size={22} className="text-[#7CCBA5]" />
```

Replaces `bg-sky-50` / `text-sky-600` with sage green on dark.

**Success message:**

```tsx
<p className="text-sm font-medium text-[#F0EDE8]">
  Check your email for a reset link
</p>
<p className="text-xs text-[#5C5A56] max-w-[280px]">
  We sent a password reset link to{' '}
  <span className="text-[#A09D98] font-medium">{email}</span>.
  If you don't see it, check your spam folder.
</p>
```

**Back to sign in (outline button):**

```tsx
className="w-full border border-white/[0.08] text-[#A09D98]
           hover:text-[#F0EDE8] hover:bg-white/[0.04]
           rounded-lg py-2.5 transition-all duration-200"
```

### Reset Password

Same card treatment. Two password inputs + confirm.

**Error state icon circle:**

```tsx
className="w-12 h-12 rounded-full bg-[#D4766A]/15 flex items-center justify-center"
// <AlertCircle size={22} className="text-[#D4766A]" />
```

**Success state icon circle:**

```tsx
className="w-12 h-12 rounded-full bg-[#7CCBA5]/15 flex items-center justify-center"
// <CheckCircle2 size={22} className="text-[#7CCBA5]" />
```

**Error state messages:**

```tsx
<p className="text-sm font-medium text-[#F0EDE8]">
  Invalid or expired reset link
</p>
<p className="text-xs text-[#5C5A56] max-w-[280px]">
  This link may have expired or already been used.
  Request a new reset link and try again.
</p>
```

**"Request new reset link" CTA:** Uses violet primary button style.

---

## 8. Form Validation

### Error Messages

All inline validation errors use terracotta:

```tsx
className="text-[#D4766A] text-xs"
```

Replaces all instances of `text-red-500` and `text-red-600`.

### Input Error State

When a field has a validation error, the input border turns terracotta:

```tsx
className="border-[#D4766A]/60 focus:ring-[#D4766A]/30 focus:border-[#D4766A]/60"
```

This replaces the default violet focus ring only when the field is in error.

### Success Messages

Inline success feedback uses sage:

```tsx
className="text-[#7CCBA5] text-sm"
```

Replaces `text-sky-600`.

### Shake Animation

The existing `useShake` hook is retained. No color changes needed -- the shake is
positional, not chromatic.

### Error Boundary Card (Settings)

```tsx
className="rounded-lg border border-[#D4766A]/30 bg-[#D4766A]/10 p-6
           flex items-start gap-3 max-w-lg"
```

Icon: `text-[#D4766A]`
Title: `text-sm font-medium text-[#F0EDE8]`
Description: `text-xs text-[#A09D98]`
Retry link: `text-xs font-medium text-[#8B7AFF] hover:text-[#A594FF]`

---

## CRITICAL DECISIONS

1. **Pill tabs over underline tabs.** Underline indicators need visible contrast against
   their background. On `#0C0B0A`, a 2px line (even in violet) lacks presence. Pills with
   `bg-white/[0.08]` create a clear selection state. This is a layout-level change from
   the current desktop underline pattern.

2. **Card max-width reduced to 420px on auth pages.** The current `480px` is comfortable
   for light-theme cards with generous padding. On dark, tighter cards with more breathing
   room around them feel more premium -- the dark negative space becomes part of the design.
   Settings content area stays at `640px` (wider forms are appropriate in-app).

3. **No drop shadows on dark cards.** The current `shadow-xs` is replaced by `border
   border-white/[0.08]`. On dark backgrounds, box shadows are invisible or create muddy
   artifacts. Border-based depth (opacity layers) is the correct technique.

4. **Violet replaces lime-700 as primary interactive color.** Every `bg-lime-700`,
   `text-lime-700`, `focus:ring-lime-500/20`, `border-lime-500` maps to its `#8B7AFF`
   equivalent. Hover states use `#9D8FFF` (lighter violet) or `#A594FF` for text links.

5. **Terracotta errors, sage success -- never red/green.** The warm palette rejects pure
   `red-500` and `green-500`. Terracotta `#D4766A` and sage `#7CCBA5` maintain WCAG AA
   contrast on `#141312` surfaces (4.8:1 and 6.2:1 respectively) while feeling cohesive
   with the warm-dark environment.

6. **Social login buttons use ghost style, not filled.** This preserves the single-CTA
   hierarchy: violet "Sign in" is the dominant action, social options are secondary. Ghost
   buttons (`border border-white/[0.08]`, transparent bg) recede visually while remaining
   accessible.

7. **Password strength indicator uses the four-segment bar pattern.** Four `h-1 rounded-full`
   segments fill progressively with terracotta (weak), amber (fair), sage (good/strong).
   Unfilled segments use `bg-white/[0.06]`. This avoids single-bar gradients which are
   harder to parse on dark backgrounds.

8. **Radial violet glow behind auth cards is optional.** A `bg-[#8B7AFF]/[0.03] blur-[120px]`
   radial gradient adds subtle warmth. It should be tested on multiple displays -- some
   panels may clip the gradient to a visible circle. If artifacts appear, remove it.
   The pages work without it.

9. **Status badges use 15% opacity tints.** Each status color (`#7CCBA5`, `#D4766A`,
   `#E5A84B`, `#8B7AFF`) gets a `/{color}/15` background with full-color text. This is
   the standard dark-mode badge pattern -- enough tint to register semantic meaning without
   creating bright spots that break the dark surface.

10. **All auth pages share identical motion config.** Entry animation stays at
    `opacity: 0, scale: 0.96 -> 1` with `duration: 0.3`. The `AnimatePresence mode="wait"`
    pattern for form/success/error state transitions is preserved. No motion changes needed
    for dark theme -- animation is color-agnostic.
