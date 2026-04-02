# Agent 16 — Settings & Account Page Design Research

## Context

Parcel's current Settings page (`frontend/src/pages/settings/SettingsPage.tsx`) is a single-scroll layout with three stacked cards: Profile, Change Password, and Notifications. All cards use the same `bg-[#0F0F1A] border border-[#1A1A2E] rounded-xl p-6` surface treatment and are constrained to `max-w-[600px]`. The page works but has no tab navigation, no billing section, no avatar upload, and no account deletion flow. This research covers the design patterns needed to evolve it into a full settings experience with a new Billing tab.

---

## 1. Settings Page Layout: Sidebar Tabs vs Top Tabs vs Single Scroll

### Pattern Comparison

| Pattern | Best For | Used By | Tradeoffs |
|---------|----------|---------|-----------|
| Sidebar tabs (vertical nav) | 5+ sections, desktop-first | Linear, GitHub, Stripe Dashboard | Needs horizontal space; collapses on mobile |
| Top tabs (horizontal) | 3-5 sections, mixed device | Vercel, Notion, Figma | Tabs can overflow on mobile; simpler layout |
| Single scroll | 2-3 sections, simple settings | Current Parcel, small SaaS | No wayfinding at scale; gets long |

### Recommendation for Parcel

Top tabs. Parcel has 3 tabs now (Profile, Billing, Notifications) with 2 future (API, Team). This fits the 3-5 range well. Top tabs preserve the existing `max-w-[600px]` content column, avoid eating sidebar space (Parcel already has a 216px app sidebar), and translate naturally to a scrollable pill bar on mobile. Linear uses sidebar tabs but they have 15+ sections; Parcel does not need that complexity yet.

### Layout Spec

```
AppShell (216px sidebar + topbar)
  > Settings page
    > Page header: "Settings" (already provided by AppShell title)
    > Tab bar: sticky below topbar, full content width
      > Tab items: Profile | Billing | Notifications
    > Tab content: max-w-[600px], stacked cards per section
```

### Tailwind Pattern — Tab Bar

```tsx
{/* Tab bar — sits at top of settings content area */}
<div className="flex gap-1 border-b border-border-subtle mb-8">
  {tabs.map((tab) => (
    <button
      key={tab.id}
      onClick={() => setActiveTab(tab.id)}
      className={cn(
        "px-4 py-2.5 text-sm font-medium transition-colors relative",
        "hover:text-text-primary",
        activeTab === tab.id
          ? "text-text-primary"
          : "text-text-muted"
      )}
    >
      {tab.label}
      {activeTab === tab.id && (
        <motion.div
          layoutId="settings-tab-indicator"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-primary rounded-full"
        />
      )}
    </button>
  ))}
</div>
```

The `layoutId` on the indicator enables Framer Motion's shared layout animation — the underline slides between tabs instead of snapping. This matches Linear's tab interaction quality.

---

## 2. Settings Sections Overview

### Current Sections (3 tabs)

| Tab | Contents | State |
|-----|----------|-------|
| **Profile** | Name, email, role (read-only), password change, avatar | Exists (no avatar) |
| **Billing** | Current plan card, usage meters, billing history, cancel | New |
| **Notifications** | Email notification toggle | Exists |

### Future Sections (2 tabs, not built now)

| Tab | Contents | Notes |
|-----|----------|-------|
| **API** | API key management, usage, regenerate | Gated behind Pro plan |
| **Team** | Invite members, roles, remove | Gated behind Team plan |

Future tabs appear in the tab bar only when the user's plan includes them. Use a simple filter:

```tsx
const visibleTabs = allTabs.filter((tab) => {
  if (tab.id === 'api' && !plan?.features.api_access) return false
  if (tab.id === 'team' && !plan?.features.team_seats) return false
  return true
})
```

---

## 3. Profile Settings

### Current Fields
- Name (text input)
- Email (email input)
- Role (read-only input, disabled)

### Additions Needed

**Avatar upload.** Place above the name field. Circular 64px preview with an overlay camera icon on hover. Use `react-dropzone` (already installed) for drag-drop or click-to-upload. Accept `image/png, image/jpeg, image/webp`, max 2MB. Show a skeleton circle while uploading.

```tsx
{/* Avatar section */}
<div className="flex items-center gap-4 mb-6">
  <div className="relative group">
    <div className="w-16 h-16 rounded-full bg-app-elevated border border-border-subtle overflow-hidden">
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-text-muted text-lg font-semibold">
          {initials}
        </div>
      )}
    </div>
    <button
      onClick={openFileDialog}
      className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
    >
      <Camera size={18} className="text-white" />
    </button>
  </div>
  <div>
    <p className="text-sm font-medium text-text-primary">{user.name}</p>
    <p className="text-xs text-text-muted">{user.email}</p>
  </div>
</div>
```

**Password change** should remain in the Profile tab (not a separate tab). It is a secondary action — keep it as a collapsible section or a separate card below the profile card. The current two-card approach (Profile card + Password card) is clean and should stay.

---

## 4. Billing Settings Tab — Overall Structure

The Billing tab contains three stacked sections:

1. **Current Plan card** — plan name, price, status, renewal date, upgrade/downgrade CTA
2. **Usage meters** — progress bars for each metered resource
3. **Billing history** — table of past invoices

### Container Layout

```tsx
<div className="space-y-6">
  <PlanCard plan={plan} />
  <UsageMeters usage={usage} limits={plan.limits} />
  <BillingHistory invoices={invoices} />
</div>
```

All three use the same card surface: `bg-[#0F0F1A] border border-[#1A1A2E] rounded-xl p-6`. This is Parcel's established pattern from the existing settings cards.

---

## 5. Plan Management Card

### Data Shape

```ts
interface PlanInfo {
  name: string           // "Free" | "Pro" | "Team"
  price_cents: number    // 0, 2900, 7900
  interval: 'month' | 'year'
  status: 'active' | 'trialing' | 'past_due' | 'canceled'
  current_period_end: string  // ISO date
  cancel_at_period_end: boolean
}
```

### Visual Layout

```
+----------------------------------------------------------+
|  Current Plan                                             |
|                                                           |
|  [Pro]  Pro Plan               $29/mo                     |
|         Renews Apr 30, 2026    [Active]                   |
|                                                           |
|  [Manage Subscription]              [Cancel Plan]         |
+----------------------------------------------------------+
```

### Component Patterns

**Plan name + price row.** The plan name is `text-lg font-semibold text-text-primary`. The price uses `font-mono` (JetBrains Mono) because it is a financial number. Show the interval as muted text: `$29/mo` or `$290/yr`.

**Status badge.** Reuse the existing `<Badge>` component with custom variant colors:

| Status | Color | Tailwind |
|--------|-------|----------|
| active | Green | `bg-accent-success/15 text-accent-success border-accent-success/25` |
| trialing | Blue | `bg-accent-info/15 text-accent-info border-accent-info/25` |
| past_due | Amber | `bg-accent-warning/15 text-accent-warning border-accent-warning/25` |
| canceled | Red | `bg-accent-danger/15 text-accent-danger border-accent-danger/25` |

```tsx
<span className={cn(
  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border",
  statusStyles[plan.status]
)}>
  {statusLabels[plan.status]}
</span>
```

**Renewal date.** Format as "Renews Apr 30, 2026" for active plans, "Cancels Apr 30, 2026" if `cancel_at_period_end` is true. Use `text-sm text-text-secondary`.

**Action buttons.** "Manage Subscription" opens Stripe Customer Portal (redirect, not modal). "Cancel Plan" triggers the inline cancel flow (see Section 8). "Manage Subscription" is primary style; "Cancel Plan" is ghost/text style in `text-text-muted hover:text-accent-danger`.

```tsx
<div className="flex items-center justify-between mt-6 pt-4 border-t border-border-subtle">
  <button
    onClick={openStripePortal}
    className="px-4 py-2 rounded-lg bg-accent-primary text-white text-sm font-medium hover:bg-accent-hover transition-colors"
  >
    Manage Subscription
  </button>
  <button
    onClick={() => setCancelFlowOpen(true)}
    className="text-sm text-text-muted hover:text-accent-danger transition-colors"
  >
    Cancel Plan
  </button>
</div>
```

---

## 6. Usage Visualization

### Metered Resources for Parcel

| Resource | Free Limit | Pro Limit | Display |
|----------|-----------|-----------|---------|
| Deal analyses | 5/mo | 100/mo | "3 of 5 analyses used" |
| AI chat messages | 20/mo | 500/mo | "12 of 20 messages used" |
| Document uploads | 10 total | Unlimited | "7 of 10 documents" |
| PDF reports | 2/mo | Unlimited | "1 of 2 reports generated" |

### Progress Bar Pattern

Each meter is a row with: label, count text, and a progress bar. The bar fills left-to-right. Color shifts from `accent-primary` (< 75%) to `accent-warning` (75-90%) to `accent-danger` (> 90%).

```tsx
function UsageMeter({ label, used, limit, unlimited = false }: UsageMeterProps) {
  const percent = unlimited ? 0 : Math.min((used / limit) * 100, 100)
  const color = percent > 90
    ? 'bg-accent-danger'
    : percent > 75
    ? 'bg-accent-warning'
    : 'bg-accent-primary'

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-primary">{label}</span>
        <span className="text-sm text-text-secondary font-mono">
          {unlimited ? `${used} used` : `${used} / ${limit}`}
        </span>
      </div>
      <div className="h-2 rounded-full bg-app-elevated overflow-hidden">
        {!unlimited && (
          <div
            className={cn("h-full rounded-full transition-all duration-500", color)}
            style={{ width: `${percent}%` }}
          />
        )}
      </div>
      {percent >= 90 && !unlimited && (
        <p className="text-xs text-accent-warning">
          Approaching limit. Upgrade for more capacity.
        </p>
      )}
    </div>
  )
}
```

### Container

```tsx
<div className="bg-[#0F0F1A] border border-[#1A1A2E] rounded-xl p-6">
  <h3 className="text-sm font-semibold text-text-primary mb-4">Usage This Period</h3>
  <div className="space-y-5">
    {meters.map((m) => (
      <UsageMeter key={m.key} {...m} />
    ))}
  </div>
  <p className="text-xs text-text-muted mt-4">
    Resets on {formatDate(plan.current_period_end)}
  </p>
</div>
```

---

## 7. Billing History

### Invoice Data Shape

```ts
interface Invoice {
  id: string
  date: string          // ISO date
  amount_cents: number
  status: 'paid' | 'open' | 'void' | 'uncollectible'
  pdf_url: string       // Stripe-hosted invoice PDF
  description: string   // "Pro Plan - March 2026"
}
```

### Table Layout

A minimal table — no horizontal scroll needed since there are only 4-5 columns. On mobile, collapse to a stacked card layout.

```tsx
{/* Desktop table */}
<div className="hidden sm:block">
  <table className="w-full text-sm">
    <thead>
      <tr className="border-b border-border-subtle">
        <th className="text-left py-2.5 text-text-muted font-medium">Date</th>
        <th className="text-left py-2.5 text-text-muted font-medium">Description</th>
        <th className="text-right py-2.5 text-text-muted font-medium">Amount</th>
        <th className="text-center py-2.5 text-text-muted font-medium">Status</th>
        <th className="text-right py-2.5 text-text-muted font-medium"></th>
      </tr>
    </thead>
    <tbody className="divide-y divide-border-subtle">
      {invoices.map((inv) => (
        <tr key={inv.id}>
          <td className="py-3 text-text-secondary">{formatDate(inv.date)}</td>
          <td className="py-3 text-text-primary">{inv.description}</td>
          <td className="py-3 text-right font-mono text-text-primary">
            {formatCurrency(inv.amount_cents)}
          </td>
          <td className="py-3 text-center">
            <InvoiceStatusBadge status={inv.status} />
          </td>
          <td className="py-3 text-right">
            <a
              href={inv.pdf_url}
              target="_blank"
              rel="noopener"
              className="text-accent-primary hover:text-accent-hover text-xs font-medium"
            >
              Download
            </a>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

{/* Mobile stacked cards */}
<div className="sm:hidden space-y-3">
  {invoices.map((inv) => (
    <div key={inv.id} className="bg-app-elevated rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-primary">{inv.description}</span>
        <InvoiceStatusBadge status={inv.status} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">{formatDate(inv.date)}</span>
        <span className="text-sm font-mono text-text-primary">
          {formatCurrency(inv.amount_cents)}
        </span>
      </div>
      <a href={inv.pdf_url} target="_blank" rel="noopener"
         className="text-xs text-accent-primary hover:text-accent-hover font-medium">
        Download invoice
      </a>
    </div>
  ))}
</div>
```

### Invoice Status Badge Colors

| Status | Style |
|--------|-------|
| paid | `bg-accent-success/15 text-accent-success` |
| open | `bg-accent-warning/15 text-accent-warning` |
| void | `bg-app-elevated text-text-muted` |
| uncollectible | `bg-accent-danger/15 text-accent-danger` |

---

## 8. Cancel Flow

Cancellation is the highest-stakes interaction on the billing page. It should not be a simple "Are you sure?" dialog. The best SaaS cancel flows (Linear, Notion, Figma) use a multi-step inline flow that surfaces value and collects feedback.

### Flow: 4 Steps (Inline, Not Modal)

**Step 1 — Inline Warning**
When the user clicks "Cancel Plan," expand an inline section below the plan card (not a modal — modals feel aggressive). Show what they lose:

```tsx
<div className="mt-4 p-4 rounded-lg border border-accent-warning/30 bg-accent-warning/5">
  <h4 className="text-sm font-semibold text-text-primary mb-2">
    Are you sure you want to cancel?
  </h4>
  <p className="text-sm text-text-secondary mb-3">
    Your plan will remain active until {formatDate(plan.current_period_end)}.
    After that, you'll lose access to:
  </p>
  <ul className="text-sm text-text-secondary space-y-1.5 mb-4">
    <li className="flex items-center gap-2">
      <X size={14} className="text-accent-danger shrink-0" />
      100 deal analyses per month (down to 5)
    </li>
    <li className="flex items-center gap-2">
      <X size={14} className="text-accent-danger shrink-0" />
      AI chat specialist (500 messages/mo)
    </li>
    <li className="flex items-center gap-2">
      <X size={14} className="text-accent-danger shrink-0" />
      Unlimited PDF reports and document uploads
    </li>
  </ul>
  <div className="flex items-center gap-3">
    <button
      onClick={() => setCancelStep(2)}
      className="px-4 py-2 rounded-lg border border-accent-danger/50 text-accent-danger text-sm font-medium hover:bg-accent-danger/10 transition-colors"
    >
      Continue cancellation
    </button>
    <button
      onClick={() => setCancelFlowOpen(false)}
      className="px-4 py-2 text-sm text-text-muted hover:text-text-primary transition-colors"
    >
      Keep my plan
    </button>
  </div>
</div>
```

**Step 2 — Reason Survey**
A simple radio group asking why. This data is valuable for product decisions.

Options:
- Too expensive
- Not using it enough
- Missing features I need
- Switching to another tool
- Just a side project / temporary
- Other

```tsx
<RadioGroup value={cancelReason} onValueChange={setCancelReason}>
  {cancelReasons.map((reason) => (
    <label key={reason.value} className="flex items-center gap-3 py-2 cursor-pointer">
      <RadioGroupItem value={reason.value} />
      <span className="text-sm text-text-primary">{reason.label}</span>
    </label>
  ))}
</RadioGroup>
{cancelReason === 'other' && (
  <textarea
    value={cancelNote}
    onChange={(e) => setCancelNote(e.target.value)}
    placeholder="Tell us more (optional)"
    className="mt-2 w-full rounded-lg bg-app-elevated border border-border-subtle p-3 text-sm text-text-primary placeholder:text-text-muted resize-none h-20"
  />
)}
```

**Step 3 — Final Confirmation**
Type the word "CANCEL" to confirm. This is the Stripe/GitHub pattern for destructive actions.

```tsx
<div className="space-y-3">
  <p className="text-sm text-text-secondary">
    Type <span className="font-mono text-accent-danger font-semibold">CANCEL</span> to confirm.
  </p>
  <Input
    value={confirmText}
    onChange={(e) => setConfirmText(e.target.value)}
    placeholder="Type CANCEL"
    className="max-w-[200px]"
  />
  <button
    disabled={confirmText !== 'CANCEL' || cancelMutation.isPending}
    onClick={() => cancelMutation.mutate()}
    className="px-4 py-2 rounded-lg bg-accent-danger text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent-danger/90 transition-colors"
  >
    {cancelMutation.isPending ? 'Canceling...' : 'Cancel my subscription'}
  </button>
</div>
```

**Step 4 — Confirmation**
Show a success state: "Your plan has been canceled. You'll retain access until [date]." Optionally offer a "Reactivate" link.

### Why Inline, Not Modal

Modals for cancellation feel hostile — they trap the user. Linear and Notion both use inline expansion. It also gives more vertical space for the reason survey without cramming it into a dialog box.

---

## 9. Settings on Mobile

### Tab Bar on Mobile

The tab bar becomes a horizontally scrollable pill bar with `overflow-x-auto` and hidden scrollbar. Each tab is a pill with `px-3 py-1.5 rounded-full text-xs`. The active tab gets `bg-accent-primary/15 text-accent-primary`.

```tsx
{/* Mobile tab bar */}
<div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:hidden scrollbar-none">
  {tabs.map((tab) => (
    <button
      key={tab.id}
      onClick={() => setActiveTab(tab.id)}
      className={cn(
        "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
        activeTab === tab.id
          ? "bg-accent-primary/15 text-accent-primary"
          : "text-text-muted hover:text-text-secondary"
      )}
    >
      {tab.label}
    </button>
  ))}
</div>
```

### Content Stacking

All settings content is already `max-w-[600px]`, which naturally constrains on desktop. On mobile, remove the max-width constraint and let cards go full-width. The `space-y-6` gap between cards gives enough breathing room.

```tsx
<div className="max-w-[600px] md:max-w-[600px] space-y-6">
  {/* cards */}
</div>
```

### Billing History on Mobile

The invoice table collapses to stacked cards (shown in Section 7). Each card shows description, date, amount, status, and download link in a compact vertical layout.

---

## 10. Account Deletion (GDPR Compliance)

### Placement

Account deletion sits at the very bottom of the Profile tab, separated by extra spacing and a `border-t`. It should look intentionally de-emphasized — not hidden, but not prominent either.

```tsx
{/* Danger zone — bottom of Profile tab */}
<div className="mt-12 pt-6 border-t border-accent-danger/20">
  <h3 className="text-sm font-semibold text-accent-danger mb-1">Danger Zone</h3>
  <p className="text-sm text-text-secondary mb-4">
    Permanently delete your account and all associated data. This action cannot be undone.
  </p>
  <button
    onClick={() => setDeleteFlowOpen(true)}
    className="px-4 py-2 rounded-lg border border-accent-danger/40 text-accent-danger text-sm font-medium hover:bg-accent-danger/10 transition-colors"
  >
    Delete my account
  </button>
</div>
```

### Deletion Flow (AlertDialog)

Account deletion uses the shadcn `<AlertDialog>` (already installed in Parcel) because it is a truly destructive, irreversible action — unlike cancellation, which is reversible.

**Step 1 — AlertDialog opens.** Shows:
- What will be deleted: all deals, documents, chat history, pipeline data
- That this is irreversible
- GDPR note: "We will delete all your personal data within 30 days per our privacy policy"

**Step 2 — Type email to confirm.** The user types their email address (not "DELETE" — their email is more personal and harder to accidentally type).

**Step 3 — Submit.** Backend soft-deletes immediately (sets `deleted_at`), schedules hard delete in 30 days, revokes all sessions, sends confirmation email.

```tsx
<AlertDialog open={deleteFlowOpen} onOpenChange={setDeleteFlowOpen}>
  <AlertDialogContent className="bg-app-surface border-border-subtle">
    <AlertDialogHeader>
      <AlertDialogTitle className="text-text-primary">
        Delete your account?
      </AlertDialogTitle>
      <AlertDialogDescription className="text-text-secondary">
        This will permanently delete your account and all data including
        deals, documents, chat history, and pipeline. This cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <div className="space-y-3 my-2">
      <p className="text-sm text-text-secondary">
        Type <span className="font-mono font-semibold text-text-primary">{user.email}</span> to confirm.
      </p>
      <Input
        value={deleteConfirmEmail}
        onChange={(e) => setDeleteConfirmEmail(e.target.value)}
        placeholder="your@email.com"
      />
    </div>
    <AlertDialogFooter>
      <AlertDialogCancel className="text-text-muted">Cancel</AlertDialogCancel>
      <button
        disabled={deleteConfirmEmail !== user.email || deleteMutation.isPending}
        onClick={() => deleteMutation.mutate()}
        className="px-4 py-2 rounded-lg bg-accent-danger text-white text-sm font-medium disabled:opacity-40 hover:bg-accent-danger/90 transition-colors"
      >
        {deleteMutation.isPending ? 'Deleting...' : 'Permanently delete account'}
      </button>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### GDPR Compliance Checklist

- Provide a "Download my data" button (JSON export of all user-owned records) before deletion
- Soft-delete with `deleted_at` timestamp; schedule hard delete after 30-day grace period
- Revoke all sessions and refresh tokens immediately
- Send confirmation email with grace period end date
- Allow re-activation within the grace period via support email
- Backend: cascade soft-delete to all user-owned tables (deals, documents, chat_messages, pipeline_items, notification_preferences)

---

## RECOMMENDATIONS FOR PARCEL

1. **Use top tabs (not sidebar tabs) for settings navigation.** Three tabs now (Profile, Billing, Notifications), expandable to five later (API, Team). Use Framer Motion `layoutId` for the sliding underline indicator. On mobile, switch to horizontally scrollable pill tabs.

2. **Keep the existing card surface pattern.** The current `bg-[#0F0F1A] border border-[#1A1A2E] rounded-xl p-6` is consistent across all settings cards and matches the rest of the app. Do not introduce new card styles for billing — consistency matters more than novelty.

3. **Build the Plan Card with Stripe Customer Portal redirect.** Do not build custom plan-change UI. Stripe's hosted portal handles upgrades, downgrades, payment method changes, and invoice downloads. Parcel only needs to display current state and link out. One API endpoint (`POST /billing/portal-session`) returns a Stripe portal URL.

4. **Use color-shifting progress bars for usage meters.** Green/indigo below 75%, amber at 75-90%, red above 90%. Show an inline "Approaching limit" warning when a meter crosses 90%. Use `font-mono` for all usage numbers to match Parcel's financial number convention.

5. **Implement the 4-step inline cancel flow.** Warning (what you lose) -> reason survey (radio group) -> type CANCEL to confirm -> success state. Inline expansion, not a modal. Collect the cancellation reason — it is the most valuable product signal you can get from a churning user.

6. **Add avatar upload to Profile using react-dropzone** (already installed). 64px circle with hover overlay. Fallback to initials. Upload to backend, store URL in user record.

7. **Place account deletion at the bottom of Profile tab** inside a "Danger Zone" section with `border-t border-accent-danger/20`. Use shadcn `AlertDialog` for the confirmation (type email to confirm). Implement GDPR-compliant soft-delete with 30-day grace period.

8. **Invoice history: table on desktop, stacked cards on mobile.** Use the `hidden sm:block` / `sm:hidden` pattern (already used in pipeline mobile). All currency amounts in `font-mono`. Status badges reuse the same color map as plan status badges.

9. **Future-proof the tab structure.** Define tabs as a data array filtered by plan features. API and Team tabs appear only when the user's plan includes those features. This avoids showing locked/grayed-out tabs that create frustration for free users.

10. **Add a "Download my data" button** in the Danger Zone section, above the delete button. This is a GDPR requirement and also builds trust. Backend generates a JSON archive of all user-owned data and returns it as a download.
