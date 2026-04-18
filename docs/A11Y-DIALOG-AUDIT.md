# Accessibility Dialog Audit

**Date:** 2026-04-18
**Scope:** Every Radix Dialog-family primitive in frontend/src/

## Catalog

### Category A — Fully compliant (Title + Description)

| File | Component | Primitive | Title | Description |
|------|-----------|-----------|-------|-------------|
| `billing/QuotaExceededModal.tsx` | QuotaExceededModal | Dialog | Visible | Visible |
| `analyze/ReverseCalculatorModal.tsx` | ReverseCalculatorModal | Dialog | Visible | Visible |
| `close-deal-modal.tsx` | CloseDealModal | Dialog | Visible | Visible |
| `offer-letter-modal.tsx` | OfferLetterModal | Dialog | Visible | Visible |
| `pages/MyDeals.tsx` | Delete confirm (x2) | AlertDialog | Visible | Visible |
| `pages/Pipeline.tsx` | Remove confirm | AlertDialog | Visible | Visible |
| `pages/ResultsPage.tsx` | Delete confirm | AlertDialog | Visible | Visible |
| `pages/rehab/RehabsPage.tsx` | Create rehab | Dialog | Visible | Visible |
| `pages/settings/BillingSettings.tsx` | Cancel sub | Dialog | Visible | Visible |

**No action taken.** 9 components, all compliant.

### Category B — Had Title, missing Description (fixed)

**Fix applied:** `aria-describedby={undefined}` on Content — Radix's
recommended suppression when no description text is appropriate.

| File | Component | Primitive | Title | Fix |
|------|-----------|-----------|-------|-----|
| `reports/CreateReportModal.tsx` | CreateReportModal | Dialog | Visible | aria-describedby={undefined} |
| `contacts/ContactModal.tsx` | ContactModal | Dialog | Visible | aria-describedby={undefined} |
| `transactions/AddTransactionModal.tsx` | AddTransactionModal | Dialog | Visible | aria-describedby={undefined} |
| `financing/AddInstrumentModal.tsx` | AddInstrumentModal | Dialog | Visible | aria-describedby={undefined} |
| `buyers/AddBuyerModal.tsx` | AddBuyerModal | Dialog | Visible | aria-describedby={undefined} |
| `layout/AppShell.tsx` | MobileSidebar | Sheet | sr-only | aria-describedby={undefined} |
| `landing/navbar.tsx` | LandingNavbar | Sheet | sr-only | aria-describedby={undefined} |
| `pipeline/DealSidePanel.tsx` | DealSidePanel | Sheet | sr-only | aria-describedby={undefined} |
| `layout/MobileTabBar.tsx` | MobileTabBar | Sheet | sr-only | aria-describedby={undefined} |

9 components fixed.

### Category C — Missing Title entirely (fixed)

| File | Component | Primitive | Fix |
|------|-----------|-----------|-----|
| `chat/ChatSlideOver.tsx` | ChatSlideOver | Sheet | Added `<VisuallyHidden asChild><SheetTitle>AI Chat</SheetTitle></VisuallyHidden>` + `aria-describedby={undefined}` |

1 component fixed. Used `@radix-ui/react-visually-hidden` for title
(dialog has its own close bar, no visible heading needed).

### Non-Radix (out of scope)

| File | Component | Implementation |
|------|-----------|----------------|
| `dispositions/CreatePacketModal.tsx` | CreatePacketModal | Manual div + backdrop |
| `command-palette.tsx` | CommandPalette | cmdk + Framer Motion |

Not Radix-based — no Radix warnings possible.

## Shadcn/UI base components

All three wrappers (`dialog.tsx`, `alert-dialog.tsx`, `sheet.tsx`) are
thin re-exports of Radix primitives. They do NOT enforce Title or
Description — both are optional children. No wrapper-level fix was
possible without breaking components that already provide Description.

## Verification evidence

- **TypeScript:** `npx tsc --noEmit` — zero errors
- **Build:** `npx vite build` — clean, 5.56s
- **Backend tests:** 200/200 passed
- **VoiceOver:** FOLLOWUP — not verified in this session. Recommend
  manual VoiceOver test on each dialog type to confirm screen readers
  announce title text. macOS: Cmd+F5 to enable VoiceOver.

## Regression prevention

No existing ESLint rule enforces Radix Dialog Title/Description
(`eslint-plugin-jsx-a11y` is not installed; even if it were, it has no
Radix-specific rules). Options for future enforcement:

1. **Playwright + axe-core CI check:** Add an e2e test that opens each
   dialog and runs `axe.run()` — catches missing aria-labelledby at
   runtime. Most reliable but requires Playwright infrastructure.
2. **Custom ESLint rule:** Match `<DialogContent>` / `<SheetContent>`
   JSX and verify a sibling `<DialogTitle>` / `<SheetTitle>` exists
   in the same tree. Fragile against wrapper components.
3. **Code review convention:** Rely on this audit doc as the reference.

Recommendation: option 1 when Playwright is added. For now, option 3.

## Pattern guide

All Dialog/Modal/Sheet/Drawer usages must include:

1. **DialogTitle** (required) — either visible or wrapped in
   `<VisuallyHidden>` from `@radix-ui/react-visually-hidden`
2. **DialogDescription** (recommended) — if omitted, add
   `aria-describedby={undefined}` to `<DialogContent>` to suppress
   the Radix console warning
