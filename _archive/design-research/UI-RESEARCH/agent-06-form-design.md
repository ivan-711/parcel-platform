# Form & Input Design Research for Parcel

## Context

Parcel has 5 strategy calculator forms (Wholesale, Buy & Hold, Flip, BRRRR, Creative Finance) built with React Hook Form + Zod + shadcn/ui. The current implementation uses a dark theme with `bg-app-bg`, `border-border-default`, `text-text-primary` tokens and a `FieldConfig` abstraction that renders `dollar | percent | none` adornments. The redesign targets a light theme with Mercury/Linear-style cleanliness. All financial numbers use JetBrains Mono (`font-mono`).

Current component inventory: shadcn `Input`, `Label`, `Select`, `Button`. No `Slider` installed yet.

---

## 1. Input Field Styles for Light Theme

### Resting State

The dominant pattern in modern financial SaaS (Mercury, Ramp, Brex) is a low-contrast border with a white fill. The border should be visible but not dominant. Avoid background tints on resting inputs in light mode --- they create visual noise when you have 8-12 fields on screen.

```
border: 1px solid hsl(220 13% 87%)    /* ~#D9DCE1, visible but quiet */
background: hsl(0 0% 100%)            /* pure white */
color: hsl(220 14% 10%)               /* near-black for entered values */
border-radius: 8px                     /* matches --radius: 0.5rem */
```

Tailwind token mapping for light theme CSS variables:

```css
--input: 220 13% 87%;          /* border color */
--input-background: 0 0% 100%; /* field fill  */
--ring: 239 84% 67%;           /* indigo focus ring, keep from current */
```

Recommended shadcn Input override:

```
h-11 w-full rounded-lg border border-input bg-white px-3 py-2.5
text-[15px] text-foreground font-normal
placeholder:text-muted-foreground/60
transition-colors duration-150
```

The bump from `h-10` to `h-11` (44px) improves touch targets and gives breathing room for adornment icons. `text-[15px]` avoids iOS zoom on focus (which triggers below 16px) while staying compact on desktop.

### Focus State

A two-layer focus treatment: border color change + outer ring. This is the Mercury pattern.

```
focus-visible:border-primary
focus-visible:ring-2 focus-visible:ring-primary/20
focus-visible:ring-offset-0
```

Dropping `ring-offset-2` from the current implementation eliminates the gap between border and ring, producing a tighter glow that reads as a single highlight rather than two separate elements.

### Error State

Red border, light red ring. No background tint --- it conflicts with white fill and looks alarming in bulk when multiple fields fail validation.

```
border-red-500 ring-2 ring-red-500/15
```

Error text beneath: `text-[13px] text-red-600 mt-1`. Use `aria-describedby` linking the error `<p>` to the input `id` for screen readers.

### Disabled State

```
disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200
disabled:cursor-not-allowed
```

Subtle fill change signals "you can't edit this" without looking broken.

---

## 2. Label Patterns

### Recommendation: Above-field labels (always)

For data-dense financial forms, above-field labels outperform every alternative:

| Pattern | Pros | Cons | Verdict |
|---|---|---|---|
| Above field | Fastest scan, handles long labels ("Refinance LTV %"), works at all widths | Uses vertical space | **Use this** |
| Floating/animated | Compact when empty | Janky with prefixes ($), fails with `type="number"`, adds JS complexity | Reject |
| Inline/left-aligned | Compact vertically | Breaks on mobile, label truncation at narrow widths | Reject |

Parcel's current forms already use above-field labels. The redesign should keep this pattern and refine the styling.

Label spec:

```
text-sm font-medium text-slate-700 mb-1.5
```

For the light theme, `text-slate-700` (or an equivalent `--label` CSS variable) provides enough contrast (WCAG AA at 4.6:1 against white) without being as heavy as black.

### Optional Field Indicator

Rather than asterisks on required fields (most fields are required), mark optional fields:

```tsx
<Label>
  Monthly Insurance <span className="text-slate-400 font-normal">(optional)</span>
</Label>
```

### Helper Text

Some fields benefit from a one-line hint below the label. Place it between label and input so it reads naturally in tab order:

```tsx
<Label htmlFor="vacancy">Vacancy Rate (%)</Label>
<p className="text-xs text-slate-500 -mt-0.5 mb-1.5">Typical: 5-10% for residential</p>
<Input id="vacancy" ... />
```

This is better than relying solely on ConceptTooltip hover, which is invisible on touch devices.

---

## 3. Input Sizing

### Standard: h-11 (44px)

44px meets Apple's minimum touch target (44pt) and Google's recommendation (48dp with padding). It is the right default for a form where users enter 8-15 values.

### Compact: h-9 (36px)

Use only for dense inline contexts: the comparison table, inline filters, or secondary settings. Never for primary calculator inputs.

### Large: h-12 (48px)

Reserve for single-input hero moments: the address search bar on a landing page or a modal's sole text input. Not applicable to calculator forms.

### Width Guidelines

| Field Type | Width | Rationale |
|---|---|---|
| Address | full (col-span-2) | Long text, autocomplete dropdown needs room |
| Zip Code | `w-28` (112px) | 5 digits, no reason to stretch |
| Dollar amounts | full column width | Numbers vary (5-7 digits), let them breathe |
| Percentages | `w-32` or `max-w-[160px]` | 1-3 digits + decimal, shorter feels intentional |
| Months/Years | `w-24` (96px) | Single or double digit |

---

## 4. Number Input Formatting

### Currency Prefix ($)

Current implementation uses an absolutely-positioned `<span>` with `left-3` and `font-mono`. This is correct. Refinements for light theme:

```tsx
<div className="relative">
  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-mono text-slate-400">
    $
  </span>
  <Input className="pl-7 font-mono tabular-nums" ... />
</div>
```

Key changes: `pointer-events-none` prevents the adornment from stealing clicks. `text-slate-400` instead of `text-text-muted` for consistent light-theme hierarchy. `tabular-nums` (via `font-feature-settings: 'tnum'`) aligns digits in a column when fields are stacked.

### Percentage Suffix (%)

Mirror pattern, right-aligned:

```tsx
<span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-mono text-slate-400">
  %
</span>
<Input className="pr-8 font-mono tabular-nums" ... />
```

### Comma Formatting (Live)

For dollar fields, live comma formatting dramatically improves scannability. A user entering `250000` should see `250,000` in the field. Implementation approach:

```tsx
// Controlled input that formats display value but stores raw number
const [display, setDisplay] = useState('')

function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
  const raw = e.target.value.replace(/[^0-9.]/g, '')
  const num = parseFloat(raw)
  if (!isNaN(num)) {
    setDisplay(num.toLocaleString('en-US'))
    field.onChange(num) // react-hook-form gets the raw number
  } else if (raw === '' || raw === '.') {
    setDisplay(raw)
    field.onChange(undefined)
  }
}
```

This requires switching from `register()` to `Controller` for dollar fields. The tradeoff is worth it --- `$250,000` is instantly readable whereas `$250000` forces mental parsing.

Do NOT apply comma formatting to percentage fields. `7.5` is fine as-is.

### `inputMode` Instead of `type="number"`

The current forms use `type="number"`. This has known problems:
- Scroll-to-change behavior (accidentally changing values when scrolling the page)
- Browser-inconsistent spinner buttons
- `e`, `E`, `+`, `-` are accepted as valid characters
- Breaks comma formatting (browser rejects non-numeric display values)

Replace with:

```tsx
<Input
  type="text"
  inputMode="decimal"
  pattern="[0-9]*\.?[0-9]*"
  ...
/>
```

`inputMode="decimal"` opens the numeric keyboard on mobile. `type="text"` lets us control formatting. The `pattern` attribute enables native form validation as a fallback.

---

## 5. Input Groups & Section Layout

### Two-Column Grid

The current `grid md:grid-cols-2 gap-x-6 gap-y-4` is a solid foundation. Adjustments for the light theme redesign:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
```

Bumping `gap-x` to `8` (32px) and `gap-y` to `5` (20px) gives Mercury-level breathing room. At these gaps, fields feel like they belong together without being cramped.

### Section Dividers

Each strategy form has natural groupings. Example for Buy & Hold:

1. **Property Info** --- Address, Zip Code
2. **Purchase & Financing** --- Purchase Price, Down Payment, Interest Rate, Loan Term
3. **Income** --- Monthly Rent
4. **Expenses** --- Taxes, Insurance, Vacancy, Maintenance, Management Fee

Divide with a lightweight heading + hairline:

```tsx
<div className="pt-4 first:pt-0">
  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
    Purchase & Financing
  </h3>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
    {/* fields */}
  </div>
</div>
```

No visible `<hr>` needed. The vertical spacing (`pt-4`) plus the heading creates enough visual separation. This is the Linear/Notion pattern.

### Full-Width Fields

Address should always span the full width. In the 2-column grid:

```tsx
<div className="md:col-span-2 space-y-1.5">
  <Label>Property Address</Label>
  <Input placeholder="123 Main St, City, State" />
</div>
```

The Loan Term toggle (Buy & Hold, BRRRR) should also be full-width since it's a binary choice that benefits from horizontal button layout.

---

## 6. Select / Dropdown Design

### Radix Select (Current) --- Keep It

Parcel already uses `@radix-ui/react-select` via shadcn. This is the right choice:

- Keyboard accessible out of the box
- Portal rendering avoids overflow clipping
- Animation support matches the rest of the UI

### Light Theme Adjustments

```
SelectTrigger:
  h-11 rounded-lg border border-input bg-white text-[15px]
  focus:border-primary focus:ring-2 focus:ring-primary/20

SelectContent:
  rounded-lg border border-slate-200 bg-white shadow-lg shadow-slate-200/50
  (drop the heavy data-[state] animations --- a simple 100ms fade-in is cleaner)

SelectItem:
  rounded-md focus:bg-indigo-50 focus:text-indigo-900
  (indigo highlight matches the primary accent)
```

### Creative Finance: `finance_type` Field

The `finance_type` enum (`subject_to` | `seller_finance`) currently needs a Select or toggle. Since it's only 2 options, a segmented control (like the Loan Term toggle) is better than a dropdown:

```tsx
<div className="flex gap-2">
  <Button variant={value === 'subject_to' ? 'default' : 'outline'} ...>
    Subject To
  </Button>
  <Button variant={value === 'seller_finance' ? 'default' : 'outline'} ...>
    Seller Finance
  </Button>
</div>
```

Rule of thumb: 2-3 options = segmented control. 4+ options = dropdown.

### Searchable Select

Not needed for any current form field. If Parcel adds a property type picker with 10+ options (SFR, Duplex, Triplex, Quad, Condo, Townhome, Mixed-Use, etc.), use `cmdk` (already a shadcn dependency for Command Palette) to build a Combobox.

---

## 7. Slider Components for What-If Analysis

Sliders are ideal for sensitivity analysis: "What if vacancy is 12% instead of 8%?" They let users explore ranges without committing to exact numbers.

### Where to Use Sliders

| Field | Range | Step | Why |
|---|---|---|---|
| Down Payment % | 0-50 | 1 | Users want to see how cash-on-cash return changes |
| Interest Rate | 2-15 | 0.125 | 1/8-point precision matches mortgage industry |
| Vacancy Rate | 0-20 | 1 | Quick sensitivity check |
| Rehab Budget | 0-200k | 5000 | Explore scenarios without typing |
| Holding Months | 1-36 | 1 | Flip timeline impact on profit |

### Component Spec

Install shadcn Slider (`npx shadcn@latest add slider`). It wraps `@radix-ui/react-slider` and is keyboard-accessible.

Dual-control pattern --- slider + synced input:

```tsx
<div className="space-y-2">
  <div className="flex items-center justify-between">
    <Label>Down Payment (%)</Label>
    <Input
      className="w-20 h-8 text-right font-mono text-sm"
      value={value}
      onChange={...}
    />
  </div>
  <Slider
    min={0} max={50} step={1}
    value={[value]}
    onValueChange={([v]) => setValue(v)}
    className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:border-2"
  />
  <div className="flex justify-between text-xs text-slate-400 font-mono">
    <span>0%</span>
    <span>50%</span>
  </div>
</div>
```

### Light Theme Slider Styling

```
Track: bg-slate-200 h-1.5 rounded-full
Range (filled): bg-indigo-500
Thumb: h-4 w-4 bg-white border-2 border-indigo-500 rounded-full shadow-sm
Thumb:focus: ring-2 ring-indigo-500/20
```

### Implementation Note

Sliders should NOT replace text inputs on the initial analysis form. They belong on the **Results page** for what-if exploration. The form page should remain fast keyboard-driven entry. The Results page can render sliders over key assumptions that dynamically recalculate outputs.

---

## 8. Form Validation

### Current: On-Submit with Shake

Parcel uses `zodResolver` with `handleSubmit(onSubmit, triggerShake)` --- validation runs on submit, and invalid forms get a shake animation. This is good UX for calculator forms where users fill everything before submitting.

### Recommended Hybrid Approach

1. **On submit**: Full Zod validation, shake on error, scroll to first error field.
2. **On blur (after first submit attempt)**: Re-validate individual fields as the user corrects them. React Hook Form supports this with `mode: 'onTouched'` or `reValidateMode: 'onBlur'`.
3. **Never on change for financial fields**: Real-time validation while typing a number is hostile. Users type `15` for `$150,000` --- validating at `15` would flash "Min $10,000" erroneously.

### Validation Mode Config

```tsx
useForm<BuyAndHoldFormValues>({
  resolver: zodResolver(buyAndHoldSchema),
  mode: 'onSubmit',           // first pass: validate on submit
  reValidateMode: 'onBlur',   // after first error: re-check on blur
  defaultValues: { ... },
})
```

### Error Display Spec

```tsx
{errors.purchase_price && (
  <p
    id="purchase_price-error"
    role="alert"
    className="text-[13px] text-red-600 mt-1 flex items-center gap-1"
  >
    <AlertCircle className="h-3 w-3 shrink-0" />
    {errors.purchase_price.message}
  </p>
)}
```

The `role="alert"` ensures screen readers announce errors immediately. The icon adds a visual anchor that helps users scanning for problems.

### Scroll to First Error

After a failed submit, scroll the first errored field into view:

```tsx
const onInvalid: SubmitErrorHandler<FormValues> = (errors) => {
  triggerShake()
  const firstErrorKey = Object.keys(errors)[0]
  const el = document.getElementById(firstErrorKey)
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  el?.focus()
}
```

---

## 9. Calculator-Specific: Consistent Layout Across 5 Strategies

### The Problem

Each strategy form is currently a separate function component with duplicated rendering logic. The `FieldConfig` abstraction helps but is defined inline per strategy. Section grouping, adornment rendering, and error display are copy-pasted across `WholesaleForm`, `BuyAndHoldForm`, `FlipForm`, etc.

### Recommended Architecture

Create a single `CalculatorForm` component that accepts a strategy config:

```tsx
interface FormSection<T extends string> {
  title: string
  fields: FieldConfig<T>[]
}

interface StrategyFormConfig<T extends FieldValues> {
  strategy: Strategy
  schema: ZodSchema<T>
  sections: FormSection<keyof T & string>[]
  defaults?: Partial<T>
  specialFields?: Record<string, (control: Control<T>) => ReactNode>
}
```

The `specialFields` map handles one-offs like the Loan Term toggle or the Creative Finance type switcher without breaking the generic loop.

### Rendering Skeleton

```tsx
function CalculatorForm<T extends FieldValues>({ config }: { config: StrategyFormConfig<T> }) {
  const form = useForm<T>({ resolver: zodResolver(config.schema), defaults: config.defaults })

  return (
    <form onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
      {/* Property Info section --- always first, identical across strategies */}
      <PropertyInfoSection register={form.register} errors={form.formState.errors} />

      {/* Strategy-specific sections */}
      {config.sections.map(section => (
        <FormSection key={section.title} title={section.title}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
            {section.fields.map(field =>
              config.specialFields?.[field.name]
                ? config.specialFields[field.name](form.control)
                : <NumericField key={field.name} field={field} register={form.register} error={...} />
            )}
          </div>
        </FormSection>
      ))}

      <SubmitButton isPending={createDeal.isPending} />
    </form>
  )
}
```

This eliminates ~400 lines of duplication across the 5 forms while keeping each strategy's field definitions declarative and easy to modify.

---

## 10. Mobile Form UX

### Input Types & Keyboards

| Field Category | Attributes | Keyboard |
|---|---|---|
| Dollar amounts | `type="text" inputMode="decimal"` | Numeric with decimal |
| Percentages | `type="text" inputMode="decimal"` | Numeric with decimal |
| Zip Code | `type="text" inputMode="numeric" pattern="[0-9]*"` | Numeric only |
| Address | `type="text"` | Standard QWERTY |
| Months/Years | `type="text" inputMode="numeric"` | Numeric only |

### Touch Targets

- Minimum input height: 44px (`h-11`). Already specified above.
- Minimum tap target for toggle buttons (Loan Term): 44px height, full column width.
- Gap between adjacent tap targets: minimum 8px (`gap-2`). Current implementation meets this.

### Mobile Layout

Switch from 2-column to 1-column on mobile. The current `grid md:grid-cols-2` already does this via the `md:` breakpoint. No changes needed.

### Sticky Submit Button

On mobile, the submit button scrolls out of view on longer forms (Buy & Hold has 12 fields). Consider a sticky footer:

```tsx
<div className="sticky bottom-0 bg-white/90 backdrop-blur-sm border-t border-slate-200 p-4 -mx-4 mt-6 md:relative md:bg-transparent md:border-0 md:p-0 md:mx-0">
  <Button type="submit" className="w-full">Analyze Deal</Button>
</div>
```

The `md:relative md:bg-transparent` resets to normal flow on desktop.

### Avoid Scroll Jank

When the mobile keyboard opens, the viewport shrinks. Ensure the focused field is visible:

```css
@supports (height: 100dvh) {
  .form-container { min-height: 100dvh; }
}
```

And use `scrollIntoView` on focus if the field is near the bottom of the form.

---

## 11. Mercury-Style Forms: Design Language

Mercury's form design is characterized by:

1. **Generous whitespace**: 32-40px between sections, 20-24px between fields.
2. **Thin, quiet borders**: 1px `#E2E5EA` (light gray), not the heavier `#D1D5DB` that shadcn defaults to.
3. **No visible labels on hover states**: labels stay static, no animation.
4. **Subtle focus transitions**: border color shifts in 150ms, ring fades in.
5. **Large type for values**: 15-16px entered text, 13-14px for labels.
6. **Monospace for financial values**: Mercury uses a custom mono font; Parcel already has JetBrains Mono.
7. **Flat, not raised**: no box shadows on inputs at rest. Shadow only on focus (if any).

### Parcel Light Theme Form Card

The form container should feel like a clean sheet of paper:

```tsx
<div className="rounded-xl border border-slate-200 bg-white p-8 md:p-10 shadow-sm shadow-slate-100">
  {/* form content */}
</div>
```

`p-8` on mobile, `p-10` on desktop. The outer `shadow-sm` is barely visible but lifts the card off the page background (which should be `slate-50` or `#F8F9FB`).

### Page Background

```css
--page-bg: 220 20% 97%;  /* #F5F6F8, very light cool gray */
```

White inputs on a white card on a pure white background = no hierarchy. The `slate-50` page background creates the necessary layer separation.

### Typography Scale for Forms

| Element | Size | Weight | Font | Color |
|---|---|---|---|---|
| Form title ("Buy & Hold Analyzer") | 20px / `text-xl` | 600 | Satoshi | `slate-900` |
| Section heading | 12px / `text-xs` | 600 | Satoshi | `slate-400` |
| Field label | 14px / `text-sm` | 500 | Satoshi | `slate-700` |
| Input value | 15px / `text-[15px]` | 400 | JetBrains Mono (for numbers) | `slate-900` |
| Placeholder | 15px / `text-[15px]` | 400 | Satoshi | `slate-400` |
| Error message | 13px / `text-[13px]` | 400 | Satoshi | `red-600` |
| Helper text | 12px / `text-xs` | 400 | Satoshi | `slate-500` |

---

## RECOMMENDATIONS FOR PARCEL

### Must-Do (High Impact, Low Effort)

1. **Switch from `type="number"` to `type="text" inputMode="decimal"`** on all financial fields. Eliminates scroll-to-change bugs, spinner clutter, and enables comma formatting. Requires moving dollar fields from `register()` to `Controller` for formatting control.

2. **Add `pointer-events-none`** to all adornment `<span>` elements ($ and %). Currently missing --- clicking the adornment does not focus the input.

3. **Set `reValidateMode: 'onBlur'`** on all `useForm` calls. After the first failed submit, fields should clear their errors as soon as the user fixes them, not only on the next submit.

4. **Add `role="alert"` and `aria-describedby`** to error messages. Zero visual change, significant accessibility improvement.

5. **Add `scrollIntoView` to first error on failed submit.** On mobile, validation errors can be off-screen. Three lines of code in the `onInvalid` handler.

### Should-Do (High Impact, Medium Effort)

6. **Extract a shared `CalculatorForm` component.** The 5 strategy forms share ~80% of their rendering logic. A single generic component with strategy-specific field configs would cut ~400 lines and ensure visual consistency across all strategies.

7. **Add section headings** to group related fields (Property Info, Financing, Income, Expenses). Reduces cognitive load on forms with 8+ fields. Use uppercase `text-xs` section labels with `pt-4` spacing.

8. **Implement live comma formatting** for dollar fields. Wrap in a `CurrencyInput` component that handles `toLocaleString` display with raw number passthrough to form state. The biggest single improvement for scannability.

9. **Constrain percentage and small-number field widths** (`max-w-[160px]` for percentages, `w-28` for zip code). Fields that stretch to full column width for a 2-digit value waste space and look unfinished.

10. **Install shadcn Slider** and add dual slider+input controls to the Results page for what-if sensitivity analysis on key assumptions (down payment, vacancy, interest rate). Do not add sliders to the initial form page.

### Nice-to-Have (Polish)

11. **Sticky submit button on mobile** for forms with 8+ fields (Buy & Hold, BRRRR, Creative Finance). Prevents the "scroll down to submit, scroll back up to find errors" loop.

12. **Inline helper text** below labels for fields with non-obvious expected ranges (e.g., "Typical: 5-10%" for vacancy rate). Supplements ConceptTooltip, which is invisible on touch devices.

13. **Light theme form card** with `bg-white p-8 rounded-xl shadow-sm` on a `slate-50` page background for clear visual hierarchy.

14. **Segmented control** for binary choices (Loan Term 15/30, Finance Type subject_to/seller_finance) is already implemented correctly. Keep this pattern; do not switch to dropdowns.

15. **Tab order audit**: ensure the form's tab order follows visual order (address first, then fields left-to-right top-to-bottom in the 2-column grid, then submit). The current `grid` layout with natural source order should handle this, but verify after any restructuring.
