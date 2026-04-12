# Mobile Responsiveness Audit

Date: 2026-04-06

Scope: authenticated product UI under `frontend/src/` only. This was a static frontend code audit against the requested breakpoints `1440px`, `1024px`, `768px`, and `375px`. I did not run a live browser pass, so anything driven by runtime content length or third-party rendering still has residual risk.

## Executive Summary

- `1440px`: no obvious layout failures found from code review.
- `1024px`: no obvious layout failures found from code review.
- `768px`: mostly acceptable, but a few dense report/table layouts are still desktop-first.
- `375px`: this is where the product breaks down. The main recurring problems are fixed multi-column grids, non-wrapping action rows, fixed-width popovers, and dialogs/forms that were never given mobile-specific layout rules.

## Direct Answers

- Sidebar collapse on mobile: structurally yes. The desktop sidebar is replaced by `MobileSidebar` plus `MobileTabBar`, so the shell itself is set up correctly for mobile.
- Analysis results page on a phone: not fully. The page still has desktop-style action rows and dense chart/table content.
- Charts at small widths: mixed. Some components use `ResponsiveContainer`, but several still keep desktop axis sizing, legends, or side-by-side layouts.
- Modals and dropdowns on mobile: mixed to poor. Shared dialog/popover primitives and several page-specific forms are not phone-safe.
- Horizontal scroll issues: yes. Some are intentional and acceptable; others are accidental.
- Pricing page responsive: mostly yes.
- Settings page responsive: the page shell is fine; the billing cancellation dialog is not fully mobile-safe.

## Systemic Issues

| File | Breakpoint | What breaks | What the user would see |
|---|---:|---|---|
| `frontend/src/components/layout/AppShell.tsx` | `375px` | Topbar `actions` are hidden below `sm`. | Any page that relies on `AppShell` actions loses its primary CTA on phones. Right now that affects at least Properties and Contacts. |
| `frontend/src/components/ui/dialog.tsx` | `375px` | Dialog content is centered at `w-full max-w-lg` with no explicit mobile inset clamp. | Dialogs sit edge-to-edge or feel cramped on narrow screens, especially once inner content adds its own multi-column layout. |
| `frontend/src/components/ui/alert-dialog.tsx` | `375px` | Same viewport-width issue as the standard dialog. | Confirmation modals feel oversized and can press against screen edges. |
| `frontend/src/components/ui/popover.tsx` | `375px` | Default content width is fixed at `w-72`. | Popovers can render off-screen or feel clipped when opened near the right edge on phones. |

## Product Findings

| File | Breakpoint | What breaks | What the user would see |
|---|---:|---|---|
| `frontend/src/pages/Dashboard.tsx` | `375px` | Quick actions stay in a single non-wrapping row. | `Log Activity`, `Add Contact`, and `Analyze Property` compete for width and can overflow or compress awkwardly. |
| `frontend/src/pages/TodayPage.tsx` | `375px` | Same non-wrapping quick-action pattern as Dashboard. | The action cluster becomes cramped and is likely to overflow on a phone. |
| `frontend/src/pages/analyze/AnalysisResultsPage.tsx` | `375px` | Header action bar is a single `flex` row with 4-5 buttons and no wrap. | The core analysis screen does not fit cleanly on a phone; the CTAs spill horizontally and the top of the page looks broken. |
| `frontend/src/pages/analyze/components/BreakEvenChart.tsx` | `375px` | The x-axis keeps `interval={0}` across 61 months. | Tick labels crowd and the chart becomes visually noisy at phone width. |
| `frontend/src/pages/analyze/components/SensitivityMatrix.tsx` | `375px` | The matrix only solves width via `overflow-x-auto`. | Users have to horizontally pan the sensitivity table to read it; usable, but not mobile-optimized. |
| `frontend/src/components/charts/ComparisonRadar.tsx` | `375px` | Radar labels and legend have no phone-specific simplification. | The comparison chart becomes crowded and difficult to scan on small screens. |
| `frontend/src/components/portfolio/StrategyAllocationChart.tsx` | `375px` | Fixed `180px` pie chart and legend stay side-by-side in one row. | The chart block gets squeezed or overflows instead of stacking cleanly. |
| `frontend/src/components/portfolio/CashFlowBenchmarkChart.tsx` | `375px` | `YAxis width={140}` consumes too much width in a narrow card. | Bars lose usable plotting area and labels dominate the chart. |
| `frontend/src/pages/reports/ReportsListPage.tsx` | `768px`, `375px` | Stats are locked to 3 columns and the report list uses a fixed 7-column CSS grid with no overflow wrapper. | The reports page turns into a compressed desktop table on tablets and phones; columns collide and the layout stops being readable. |
| `frontend/src/pages/properties/PropertiesListPage.tsx` | `375px` | The only primary CTA is passed through `AppShell.actions`. | On phones the `Analyze Property` button disappears entirely from the top bar. |
| `frontend/src/pages/properties/PropertyDetailPage.tsx` | `375px` | Header actions do not wrap, and the property spec row does not wrap either. | `Analyze`, `Find Buyers`, `Skip Trace`, `Send Mail`, and `Delete` overflow the header; the spec line can also run horizontally off the screen. |
| `frontend/src/pages/contacts/ContactsListPage.tsx` | `375px` | The only primary CTA is passed through `AppShell.actions`. | On phones the `Add Contact` button disappears from the top bar. |
| `frontend/src/components/contacts/ContactModal.tsx` | `375px` | Name and email/phone sections stay in 2 columns. | Fields get too narrow for comfortable data entry and the modal feels cramped. |
| `frontend/src/pages/contacts/ContactDetailPage.tsx` | `375px` | Header action row does not wrap; sequence dropdown is fixed `w-56` aligned to the right edge. | Edit / sequence / mail / delete controls crowd or overflow, and the dropdown risks clipping off-screen. |
| `frontend/src/components/buyers/AddBuyerModal.tsx` | `375px` | The modal inherits the shared dialog issue and keeps 2-column form rows. | Buyer creation feels cramped on a phone before the user even reaches the buy-box editor. |
| `frontend/src/components/buyers/BuyBoxEditor.tsx` | `375px` | Price range and bed/bath inputs are locked to 2 columns. | Numeric fields become narrow and harder to use accurately on mobile. |
| `frontend/src/pages/buyers/BuyerDetailPage.tsx` | `375px` | Sequence menu is fixed `w-56` and aligned to the right edge. | The dropdown can clip outside the viewport on phones. |
| `frontend/src/components/dispositions/CreatePacketModal.tsx` | `375px` | Asking price and assignment fee stay side-by-side. | Two money fields become cramped and reduce tap accuracy on phones. |
| `frontend/src/pages/financing/ObligationsPage.tsx` | `375px` | Time filter chips are inside a non-wrapping, non-scrollable `w-fit` row. | `Next 7 Days / 30 / 90 / All` can run off-screen instead of wrapping or scrolling. |
| `frontend/src/components/financing/RecordPaymentModal.tsx` | `375px` | Multiple rows remain locked to 2 columns. | Recording a payment on a phone becomes cramped and difficult to scan. |
| `frontend/src/pages/transactions/TransactionsPage.tsx` | `375px` | KPI row is fixed at 3 columns. | Monthly income / expenses / net cards get too narrow and lose readability. |
| `frontend/src/components/transactions/AddTransactionModal.tsx` | `375px` | Amount/date and other form rows stay in 2 columns. | The transaction modal is usable but overly tight on a phone. |
| `frontend/src/pages/rehab/RehabDetailPage.tsx` | `375px` | Budget KPIs are fixed at 3 columns. | Estimated / actual / variance values compress and wrap poorly on mobile. |
| `frontend/src/pages/skip-tracing/SkipTracingPage.tsx` | `375px` | City, State, ZIP fields are fixed at 3 columns. | The trace form becomes narrow and fiddly on phones. |
| `frontend/src/pages/mail/CampaignBuilderPage.tsx` | `375px` | Setup and recipient forms keep 3-column city/state/zip rows; recipient table has no horizontal scroll wrapper. | Campaign creation becomes cramped, and the recipient list can overflow the viewport. |
| `frontend/src/pages/settings/BillingSettings.tsx` | `375px` | The settings page itself is fine, but the cancellation flow uses the shared dialog. | Billing cancellation is the weak point on mobile, not the settings layout itself. |

## Lower-Severity / Intentional Horizontal Scroll

- `frontend/src/pages/Pipeline.tsx`
  - `375px`
  - The mobile pipeline is intentionally replaced by `MobilePipeline`. This looks structurally correct.
- `frontend/src/pages/analyze/AnalysisResultsPage.tsx`
  - `375px`
  - Strategy tabs and the sensitivity matrix intentionally scroll horizontally. This is acceptable, but it still means the page is not truly phone-native.
- `frontend/src/pages/transactions/TransactionsPage.tsx`
  - `375px`
  - The transactions table is wrapped in `overflow-x-auto`, which is acceptable.
- `frontend/src/pages/documents/DocumentsPage.tsx`
  - `375px`
  - The split-pane document experience has a mobile-specific single-pane behavior and looks intentionally handled.

## Pages That Look Mostly Fine From Code Review

- `frontend/src/pages/analyze/AnalyzePage.tsx`
- `frontend/src/pages/analyze/StrategySelectPage.tsx`
- `frontend/src/pages/analyze/AnalyzerFormPage.tsx`
- `frontend/src/pages/Pipeline.tsx`
- `frontend/src/pages/chat/ChatPage.tsx`
- `frontend/src/pages/documents/DocumentsPage.tsx`
- `frontend/src/pages/MyDeals.tsx`
- `frontend/src/pages/PricingPage.tsx`
- `frontend/src/pages/settings/SettingsPage.tsx`
- `frontend/src/pages/skip-tracing/BatchSkipTracePage.tsx`
- `frontend/src/pages/sequences/SequencesListPage.tsx`
- `frontend/src/pages/sequences/SequenceBuilderPage.tsx`
- `frontend/src/pages/mail/MailCampaignsPage.tsx`
- `frontend/src/pages/mail/CampaignAnalyticsPage.tsx`

## Most Important Fixes

1. Make shared dialogs and alert dialogs mobile-safe.
   Use a viewport-clamped max width like `max-w-[calc(100vw-2rem)]` and audit internal modal grids.

2. Stop using fixed multi-column grids below `sm`.
   The main offenders are `grid-cols-2` and `grid-cols-3` form rows in modals and tool pages.

3. Wrap or stack desktop action clusters on phones.
   The analysis results page, property detail page, contact detail page, Dashboard, and Today all need this.

4. Give charts explicit phone behavior.
   Reduce axis density, trim legend content, and stack chart/legend layouts vertically below `sm`.

5. Replace fixed desktop report/table layouts with mobile cards or horizontal-scroll containers.
   `ReportsListPage` is the clearest example.
