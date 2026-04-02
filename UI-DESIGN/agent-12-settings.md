# Agent 12 — Settings Page (Light Theme)

Implementation-ready design spec for the Settings page migrated to Parcel's light theme. Covers all three tabs (Profile, Billing, Notifications), mobile behavior, save semantics, and account deletion. All tokens reference `agent-01-design-tokens.md`. Font: Inter (body), Inter tabular-nums (financial numbers), JetBrains Mono (code/AI output only).

---

## 1. Layout — Top Tab Navigation

### Page Structure

```
AppShell (216px sidebar + topbar)
  > Settings page (title provided by AppShell)
    > Tab bar: full content width, sticky below topbar
    > Tab content: max-w-[640px] mx-auto, vertically stacked cards
```

### Page Background

The page sits on `#F9FAFB` (the `--color-bg-page` value, gray-50). All content cards are white (`#FFFFFF`) with `border border-gray-200` and `rounded-xl`. This is the universal light-theme card treatment -- no colored card backgrounds, no gradients.

### Tab Bar — Desktop

A horizontal row of text tabs with a sliding underline indicator. Sits directly below the page title, separated by `mb-8`.

```
 Profile          Billing          Notifications
────────          ─────────        ──────────────
 ▀▀▀▀▀▀▀▀
```

```tsx
<div className="flex gap-1 border-b border-gray-200 mb-8">
  {tabs.map((tab) => (
    <button
      key={tab.id}
      onClick={() => setActiveTab(tab.id)}
      className={cn(
        "px-4 py-2.5 text-sm font-medium transition-colors relative",
        "hover:text-gray-900",
        activeTab === tab.id
          ? "text-gray-900"
          : "text-gray-400"
      )}
    >
      {tab.label}
      {activeTab === tab.id && (
        <motion.div
          layoutId="settings-tab-indicator"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full"
        />
      )}
    </button>
  ))}
</div>
```

- **Active tab text:** `text-gray-900` (#101828)
- **Inactive tab text:** `text-gray-400` (#98A2B3)
- **Underline indicator:** `bg-indigo-500` (#6366F1), 2px tall, animated via Framer Motion `layoutId`
- **Border below tabs:** `border-gray-200` (#EAECF0)

### Tab Bar — Mobile (< md breakpoint)

Horizontally scrollable pill bar. Replaces the underline tab bar entirely.

```tsx
{/* Mobile pill tabs — visible < md */}
<div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:hidden scrollbar-none mb-6">
  {tabs.map((tab) => (
    <button
      key={tab.id}
      onClick={() => setActiveTab(tab.id)}
      className={cn(
        "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors",
        activeTab === tab.id
          ? "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200"
          : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
      )}
    >
      {tab.label}
    </button>
  ))}
</div>
```

- **Active pill:** `bg-indigo-50` (#EEF0FF) background, `text-indigo-600` (#4F46E5) text, `ring-1 ring-indigo-200` border
- **Inactive pill:** `text-gray-500` (#667085), no background
- **Scrollbar:** hidden via `scrollbar-none` utility (Tailwind plugin or custom CSS)
- **Bleed:** `-mx-4 px-4` lets pills bleed to screen edges for thumb reach

### Tab Data Array

```tsx
const allTabs = [
  { id: 'profile',       label: 'Profile' },
  { id: 'billing',       label: 'Billing' },
  { id: 'notifications', label: 'Notifications' },
  // Future:
  // { id: 'api',   label: 'API',  gate: 'api_access' },
  // { id: 'team',  label: 'Team', gate: 'team_seats' },
]

const visibleTabs = allTabs.filter((tab) => {
  if (tab.gate && !plan?.features[tab.gate]) return false
  return true
})
```

---

## 2. Card Surface Treatment (All Tabs)

Every settings section uses the same card container. No exceptions.

```
bg-white border border-gray-200 rounded-xl p-6 shadow-xs
```

- **Background:** `#FFFFFF`
- **Border:** `border-gray-200` (#EAECF0)
- **Corner radius:** `rounded-xl` (16px)
- **Padding:** `p-6` (24px)
- **Shadow:** `shadow-xs` — `0 1px 2px rgba(16, 24, 40, 0.05)` (subtle lift off #F8FAFC page)
- **Spacing between cards:** `space-y-6` (24px)

### Section Headings Inside Cards

```tsx
<h2 className="text-sm font-semibold text-gray-900 mb-4">Section Title</h2>
```

- `text-sm` (12px), `font-semibold`, `text-gray-900` (#101828)
- `mb-4` gap before first form field

---

## 3. Profile Tab

Three stacked cards: Avatar + Profile form, Change Password, Danger Zone.

### 3A. Avatar + Profile Form Card

```
+──────────────────────────────────────────────────────+
│  Profile                                             │
│                                                      │
│  [  Avatar  ]   Ivan Flores                          │
│  [ 64px O   ]   ivan@example.com                     │
│                                                      │
│  Name  ┌────────────────────────────────┐            │
│         │ Ivan Flores                    │            │
│         └────────────────────────────────┘            │
│  Email ┌────────────────────────────────┐            │
│         │ ivan@example.com               │            │
│         └────────────────────────────────┘            │
│  Role  ┌────────────────────────────────┐            │
│         │ Admin (read-only)              │            │
│         └────────────────────────────────┘            │
│                                                      │
│  [ Save changes ]  (appears on field change)         │
+──────────────────────────────────────────────────────+
```

**Avatar section** — sits at top of the card, above form fields.

```tsx
<div className="flex items-center gap-4 mb-6">
  <div className="relative group">
    <div className="w-16 h-16 rounded-full bg-gray-100 border border-gray-200 overflow-hidden">
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-500 text-lg font-semibold">
          {initials}
        </div>
      )}
    </div>
    <button
      onClick={openFileDialog}
      className="absolute inset-0 rounded-full bg-gray-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
      aria-label="Upload avatar"
    >
      <Camera size={18} className="text-white" />
    </button>
  </div>
  <div>
    <p className="text-sm font-medium text-gray-900">{user.name}</p>
    <p className="text-xs text-gray-500">{user.email}</p>
  </div>
</div>
```

- **Avatar circle:** 64px, `bg-gray-100` fallback, `border border-gray-200`
- **Initials fallback:** `text-gray-500` on `bg-gray-100`
- **Hover overlay:** `bg-gray-900/50` with Camera icon in white, `opacity-0 -> opacity-100` transition
- **Upload:** `react-dropzone` (already installed). Accept `image/png, image/jpeg, image/webp`, max 2MB
- **Loading state:** Replace circle content with a shimmer skeleton while uploading

**Form fields** — standard light-theme input treatment.

```tsx
<div className="space-y-4">
  <div className="space-y-2">
    <Label htmlFor="name" className="text-sm font-medium text-gray-700">Name</Label>
    <Input
      id="name"
      value={name}
      onChange={(e) => setName(e.target.value)}
      className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400
                 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
    />
  </div>
  {/* Email field: same pattern */}
  <div className="space-y-2">
    <Label htmlFor="role" className="text-sm font-medium text-gray-700">Role</Label>
    <Input
      id="role"
      value={user?.role ?? ''}
      readOnly
      className="bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
    />
  </div>
</div>
```

- **Label:** `text-sm font-medium text-gray-700` (#344054)
- **Input bg:** `bg-white`, `border-gray-300` (#D0D5DD)
- **Input text:** `text-gray-900` (#101828)
- **Placeholder:** `text-gray-400` (#98A2B3)
- **Focus ring:** `focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20`
- **Read-only input:** `bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed`

### 3B. Change Password Card

Separate card below Profile. Same white card surface.

```
+──────────────────────────────────────────────────────+
│  Change Password                                     │
│                                                      │
│  Current Password   ┌────────────────────┐           │
│                      │ ********            │           │
│                      └────────────────────┘           │
│  New Password       ┌────────────────────┐           │
│                      │                     │           │
│                      └────────────────────┘           │
│  Confirm Password   ┌────────────────────┐           │
│                      │                     │           │
│                      └────────────────────┘           │
│                                                      │
│  [ Update password ]                                 │
+──────────────────────────────────────────────────────+
```

All inputs use `type="password"`. Validation inline:
- New password < 8 chars: red inline message below field
- Passwords don't match: red inline message below confirm field
- Error text: `text-sm text-error-600` (#DC2626)
- Success text: `text-sm text-success-600` (#059669) with Check icon

### 3C. Danger Zone (Bottom of Profile Tab)

Separated from password card by extra spacing. Visually de-emphasized but accessible.

```tsx
<div className="mt-12 pt-6 border-t border-error-200">
  <h3 className="text-sm font-semibold text-error-600 mb-1">Danger Zone</h3>
  <p className="text-sm text-gray-500 mb-4">
    Permanently delete your account and all associated data. This action cannot be undone.
  </p>
  <div className="flex items-center gap-3">
    <button
      onClick={() => setDeleteFlowOpen(true)}
      className="px-4 py-2 rounded-lg border border-error-300 text-error-600 text-sm font-medium
                 hover:bg-error-50 transition-colors"
    >
      Delete my account
    </button>
    <button
      onClick={downloadMyData}
      className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium
                 hover:bg-gray-50 transition-colors"
    >
      Download my data
    </button>
  </div>
</div>
```

- **Separator:** `border-t border-error-200` (#FECACA) -- subtle red tint to the divider signals caution
- **Heading:** `text-error-600` (#DC2626)
- **Body text:** `text-gray-500` (#667085)
- **Delete button:** outlined, `border-error-300 text-error-600`, hover `bg-error-50`
- **Download data button:** neutral outlined, `border-gray-300 text-gray-600`, hover `bg-gray-50`

---

## 4. Billing Tab

Three stacked sections: Plan Card, Usage Meters, Billing History.

### 4A. Current Plan Card

```
+──────────────────────────────────────────────────────+
│  Current Plan                                        │
│                                                      │
│  ◈ Pro Plan                            $29/mo        │
│    Renews Apr 30, 2026                 [Active]      │
│                                                      │
│  ─────────────────────────────────────────────────   │
│  [ Manage Subscription ]           Cancel Plan       │
+──────────────────────────────────────────────────────+
```

**Plan name row:**

```tsx
<div className="flex items-start justify-between">
  <div>
    <div className="flex items-center gap-2">
      <span className="text-lg font-semibold text-gray-900">{plan.name} Plan</span>
      <StatusBadge status={plan.status} />
    </div>
    <p className="text-sm text-gray-500 mt-1">
      {plan.cancel_at_period_end ? 'Cancels' : 'Renews'} {formatDate(plan.current_period_end)}
    </p>
  </div>
  <span className="text-lg font-semibold text-gray-900 tabular-nums">
    ${plan.price_cents / 100}<span className="text-sm text-gray-400 font-normal">/{plan.interval === 'month' ? 'mo' : 'yr'}</span>
  </span>
</div>
```

- **Plan name:** `text-lg font-semibold text-gray-900`
- **Price:** `font-semibold text-gray-900 tabular-nums` (Inter tabular figures for financial numbers -- NOT JetBrains Mono, per design tokens spec)
- **Interval suffix:** `text-sm text-gray-400 font-normal`
- **Renewal date:** `text-sm text-gray-500`

**Status badge colors (light theme):**

| Status | Background | Text | Border |
|--------|-----------|------|--------|
| active | `bg-success-50` (#ECFDF5) | `text-success-700` (#047857) | `ring-1 ring-success-200` |
| trialing | `bg-info-50` (#EFF6FF) | `text-info-700` (#1D4ED8) | `ring-1 ring-info-200` |
| past_due | `bg-warning-50` (#FFFBEB) | `text-warning-700` (#B45309) | `ring-1 ring-warning-200` |
| canceled | `bg-error-50` (#FEF2F2) | `text-error-700` (#B91C1C) | `ring-1 ring-error-200` |

```tsx
<span className={cn(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
  statusStyles[plan.status]
)}>
  {statusLabels[plan.status]}
</span>
```

**Action row** — below a `border-t border-gray-200` divider:

```tsx
<div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
  <button
    onClick={openStripePortal}
    className="px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium
               hover:bg-indigo-600 transition-colors shadow-xs"
  >
    Manage Subscription
  </button>
  <button
    onClick={() => setCancelFlowOpen(true)}
    className="text-sm text-gray-400 hover:text-error-600 transition-colors"
  >
    Cancel Plan
  </button>
</div>
```

- **Primary button:** `bg-indigo-500 hover:bg-indigo-600 text-white shadow-xs`
- **Cancel link:** `text-gray-400 hover:text-error-600` -- plain text style, not a button shape

### 4B. Usage Meters Card

```
+──────────────────────────────────────────────────────+
│  Usage This Period                                   │
│                                                      │
│  Deal analyses              3 / 100                  │
│  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░  3%             │
│                                                      │
│  AI chat messages           187 / 500                │
│  ████████████████████░░░░░░░░░░░░░░░  37%            │
│                                                      │
│  Document uploads           42 / Unlimited           │
│  (no bar)                                            │
│                                                      │
│  PDF reports                8 / Unlimited            │
│  (no bar)                                            │
│                                                      │
│  Resets on Apr 30, 2026                              │
+──────────────────────────────────────────────────────+
```

**Progress bar component:**

```tsx
function UsageMeter({ label, used, limit, unlimited = false }: UsageMeterProps) {
  const percent = unlimited ? 0 : Math.min((used / limit) * 100, 100)
  const barColor = percent > 90
    ? 'bg-error-500'
    : percent > 75
    ? 'bg-warning-500'
    : 'bg-indigo-500'

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-700">{label}</span>
        <span className="text-sm text-gray-500 tabular-nums">
          {unlimited ? `${used} used` : `${used} / ${limit}`}
        </span>
      </div>
      {!unlimited && (
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", barColor)}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
      {percent >= 90 && !unlimited && (
        <p className="text-xs text-warning-600 flex items-center gap-1">
          <AlertTriangle size={12} />
          Approaching limit — upgrade for more capacity
        </p>
      )}
    </div>
  )
}
```

- **Bar track:** `h-2 rounded-full bg-gray-100` (#F2F4F7)
- **Bar fill < 75%:** `bg-indigo-500` (#6366F1)
- **Bar fill 75-90%:** `bg-warning-500` (#F59E0B)
- **Bar fill > 90%:** `bg-error-500` (#EF4444)
- **Usage numbers:** `tabular-nums` (Inter tabular figures for aligned numerical columns)
- **Warning text:** `text-warning-600` (#D97706) with AlertTriangle icon
- **Reset date footer:** `text-xs text-gray-400 mt-4`

### 4C. Billing History Card

**Desktop (>= sm): minimal table.**

```
+──────────────────────────────────────────────────────+
│  Billing History                                     │
│                                                      │
│  Date          Description          Amount   Status  │
│  ─────────────────────────────────────────────────   │
│  Mar 1, 2026   Pro Plan - March     $29.00   Paid  ↓│
│  Feb 1, 2026   Pro Plan - February  $29.00   Paid  ↓│
│  Jan 1, 2026   Pro Plan - January   $29.00   Paid  ↓│
+──────────────────────────────────────────────────────+
```

```tsx
<table className="w-full text-sm">
  <thead>
    <tr className="border-b border-gray-200">
      <th className="text-left py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Date</th>
      <th className="text-left py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Description</th>
      <th className="text-right py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Amount</th>
      <th className="text-center py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Status</th>
      <th className="w-8"></th>
    </tr>
  </thead>
  <tbody className="divide-y divide-gray-100">
    {invoices.map((inv) => (
      <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
        <td className="py-3 text-gray-500">{formatDate(inv.date)}</td>
        <td className="py-3 text-gray-900">{inv.description}</td>
        <td className="py-3 text-right tabular-nums text-gray-900">
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
            className="text-indigo-600 hover:text-indigo-700 text-xs font-medium"
            aria-label={`Download invoice for ${inv.description}`}
          >
            <Download size={14} />
          </a>
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

- **Table header:** `text-xs uppercase tracking-wide text-gray-500 font-medium`
- **Row hover:** `hover:bg-gray-50`
- **Row divider:** `divide-gray-100` (very subtle)
- **Amount:** `tabular-nums text-gray-900` (Inter tabular figures)
- **Download link:** `text-indigo-600 hover:text-indigo-700`, Download icon only
- **Empty state:** "No invoices yet" centered text in `text-gray-400 py-8`

**Invoice status badge colors:**

| Status | Background | Text |
|--------|-----------|------|
| paid | `bg-success-50 text-success-700` | "Paid" |
| open | `bg-warning-50 text-warning-700` | "Open" |
| void | `bg-gray-100 text-gray-500` | "Void" |
| uncollectible | `bg-error-50 text-error-700` | "Failed" |

**Mobile (< sm): stacked cards.** Table is hidden; replaced with compact card per invoice.

```tsx
<div className="sm:hidden space-y-3">
  {invoices.map((inv) => (
    <div key={inv.id} className="bg-gray-50 rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-900">{inv.description}</span>
        <InvoiceStatusBadge status={inv.status} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{formatDate(inv.date)}</span>
        <span className="text-sm tabular-nums text-gray-900">
          {formatCurrency(inv.amount_cents)}
        </span>
      </div>
      <a href={inv.pdf_url} target="_blank" rel="noopener"
         className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
        Download invoice
      </a>
    </div>
  ))}
</div>
```

- **Card bg:** `bg-gray-50` (#F9FAFB) -- one shade darker than page to distinguish from container
- **Amount:** `tabular-nums text-gray-900` (Inter tabular figures)

---

## 5. Notifications Tab

Single card with toggle rows. Expandable as notification types grow.

```
+──────────────────────────────────────────────────────+
│  Email Notifications                                 │
│                                                      │
│  Document analysis complete              [ ═══○ ]    │
│  Get notified when AI finishes                       │
│  analyzing your uploaded documents.                  │
│                                                      │
│  ─────────────────────────────────────────────────   │
│                                                      │
│  Weekly portfolio digest                 [ ○═══ ]    │
│  A summary of your portfolio                         │
│  performance sent every Monday.                      │
│                                                      │
│  ─────────────────────────────────────────────────   │
│                                                      │
│  Deal stage changes                      [ ═══○ ]    │
│  Get notified when a deal moves                      │
│  to a new pipeline stage.                            │
│                                                      │
+──────────────────────────────────────────────────────+
```

**Toggle row pattern:**

```tsx
<div className="flex items-start justify-between py-4 border-b border-gray-100 last:border-b-0">
  <div className="pr-4">
    <p className="text-sm font-medium text-gray-900">Document analysis complete</p>
    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
      Get notified when AI finishes analyzing your uploaded documents.
    </p>
  </div>
  <Switch
    checked={pref.enabled}
    onCheckedChange={(checked) => togglePref(pref.key, checked)}
    className="shrink-0"
  />
</div>
```

- **Toggle label:** `text-sm font-medium text-gray-900`
- **Toggle description:** `text-xs text-gray-500 leading-relaxed`
- **Row divider:** `border-b border-gray-100` between items, none on last
- **Switch track (off):** `bg-gray-200`
- **Switch track (on):** `bg-indigo-500`
- **Switch thumb:** white circle with `shadow-xs`

**Save behavior:** Each toggle saves immediately on change via mutation (current behavior). Show a brief inline "Saved" confirmation with a Check icon in `text-success-600` that fades out after 2s.

```tsx
{notifSaved && (
  <motion.p
    initial={{ opacity: 0, y: -4 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0 }}
    className="flex items-center gap-1 text-success-600 text-sm mt-3"
  >
    <Check size={14} />
    Saved
  </motion.p>
)}
```

---

## 6. Save Behavior — Button on Change

### Profile + Password Forms

The save button is **always visible** but **disabled** until a field changes.

**Tracking dirty state:**

```tsx
const isDirty = name !== user.name || email !== user.email
```

**Button states:**

| State | Appearance |
|-------|-----------|
| Clean (no changes) | `bg-gray-100 text-gray-400 cursor-not-allowed` -- visually muted |
| Dirty (has changes) | `bg-indigo-500 text-white hover:bg-indigo-600 shadow-xs` -- fully active |
| Saving | `bg-indigo-500 text-white opacity-70 cursor-not-allowed` + "Saving..." text |

```tsx
<button
  type="submit"
  disabled={!isDirty || profileMutation.isPending}
  className={cn(
    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
    isDirty
      ? "bg-indigo-500 text-white hover:bg-indigo-600 shadow-xs"
      : "bg-gray-100 text-gray-400 cursor-not-allowed"
  )}
>
  {profileMutation.isPending ? 'Saving...' : 'Save changes'}
</button>
```

**Success/error feedback:** Inline message below the button, auto-clears after 3 seconds.

```tsx
{profileMsg && (
  <p className={cn(
    "text-sm mt-2 flex items-center gap-1",
    profileMsg.type === 'success' ? "text-success-600" : "text-error-600"
  )}>
    {profileMsg.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
    {profileMsg.text}
  </p>
)}
```

### Notification Toggles

No save button -- toggles fire mutations immediately. Inline "Saved" confirmation per Section 5.

### Billing Tab

No save button -- all actions are discrete (Stripe Portal redirect, Cancel flow).

---

## 7. Account Deletion — GDPR Confirmation Flow

### Trigger

The "Delete my account" button in the Danger Zone (Section 3C) opens a shadcn `AlertDialog`.

### AlertDialog Design

```tsx
<AlertDialog open={deleteFlowOpen} onOpenChange={setDeleteFlowOpen}>
  <AlertDialogContent className="bg-white border border-gray-200 shadow-xl max-w-md">
    <AlertDialogHeader>
      <AlertDialogTitle className="text-gray-900 text-lg font-semibold">
        Delete your account?
      </AlertDialogTitle>
      <AlertDialogDescription className="text-gray-500 text-sm leading-relaxed">
        This will permanently delete your account and all data including
        deals, documents, chat history, and pipeline. This cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>

    <div className="space-y-4 my-4">
      {/* What gets deleted */}
      <div className="bg-error-50 border border-error-200 rounded-lg p-4">
        <p className="text-sm font-medium text-error-700 mb-2">The following will be deleted:</p>
        <ul className="text-sm text-error-600 space-y-1">
          <li className="flex items-center gap-2">
            <X size={12} className="shrink-0" /> All deal analyses and saved results
          </li>
          <li className="flex items-center gap-2">
            <X size={12} className="shrink-0" /> Uploaded documents
          </li>
          <li className="flex items-center gap-2">
            <X size={12} className="shrink-0" /> Chat conversation history
          </li>
          <li className="flex items-center gap-2">
            <X size={12} className="shrink-0" /> Pipeline and portfolio data
          </li>
        </ul>
      </div>

      {/* GDPR notice */}
      <p className="text-xs text-gray-400 leading-relaxed">
        Per our privacy policy, all personal data will be permanently erased within 30 days.
        You may contact support to reactivate during this grace period.
      </p>

      {/* Email confirmation input */}
      <div className="space-y-2">
        <p className="text-sm text-gray-600">
          Type <span className="font-mono font-semibold text-gray-900">{user.email}</span> to confirm.
        </p>
        <Input
          value={deleteConfirmEmail}
          onChange={(e) => setDeleteConfirmEmail(e.target.value)}
          placeholder="your@email.com"
          className="bg-white border-gray-300 text-gray-900"
        />
      </div>
    </div>

    <AlertDialogFooter>
      <AlertDialogCancel className="text-gray-600 border-gray-300 hover:bg-gray-50">
        Cancel
      </AlertDialogCancel>
      <button
        disabled={deleteConfirmEmail !== user.email || deleteMutation.isPending}
        onClick={() => deleteMutation.mutate()}
        className="px-4 py-2 rounded-lg bg-error-600 text-white text-sm font-medium
                   disabled:opacity-40 disabled:cursor-not-allowed
                   hover:bg-error-700 transition-colors"
      >
        {deleteMutation.isPending ? 'Deleting...' : 'Permanently delete account'}
      </button>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**Dialog surface:** `bg-white border border-gray-200 shadow-xl`
**Deletion list:** `bg-error-50 border border-error-200` card with X icons in `text-error-600`
**GDPR text:** `text-xs text-gray-400` -- present but not visually dominant
**Confirm input:** standard light input style
**Delete button:** `bg-error-600 text-white hover:bg-error-700` -- red, not indigo
**Cancel button:** `text-gray-600 border-gray-300 hover:bg-gray-50`

### Backend Flow (Summary)

1. `DELETE /auth/account` -- soft-deletes user (sets `deleted_at`)
2. Cascade soft-delete to all user-owned tables
3. Revoke all sessions and refresh tokens immediately
4. Send confirmation email with 30-day grace period end date
5. Cron job hard-deletes after 30 days

### "Download My Data" Button

Sits next to "Delete my account" in the Danger Zone. Triggers `GET /auth/export` which returns a JSON archive of all user-owned records. Show a brief loading state on the button while generating.

---

## 8. Mobile Responsiveness Summary

| Element | Desktop (>= md) | Mobile (< md) |
|---------|-----------------|---------------|
| Tab bar | Underline tabs with sliding indicator | Scrollable pill bar |
| Content width | `max-w-[640px]` | Full width with `px-4` padding |
| Cards | `p-6` padding | `p-4` padding (tighter) |
| Billing history | Table with hover rows | Stacked cards |
| Avatar | 64px with hover overlay | Same, but overlay always visible on touch |
| Form inputs | Standard width | Full width (already 100%) |
| Danger Zone buttons | Side by side | Stack vertically (`flex-col`) |

**Mobile card padding override:**

```tsx
<div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6 shadow-xs">
```

---

## 9. Loading and Error States

### Loading

Show skeleton cards matching each tab's structure. Use `SkeletonCard` (already exists).

```tsx
{isLoading && (
  <div className="max-w-[640px] space-y-6">
    <SkeletonCard lines={4} />
    <SkeletonCard lines={3} />
  </div>
)}
```

Skeleton shimmer: `bg-gray-100` base with `bg-gray-200` animated sweep.

### Error

Full-width error card with retry button.

```tsx
<div className="rounded-xl border border-error-200 bg-error-50 p-6 flex items-start gap-3 max-w-[640px]">
  <AlertCircle size={20} className="text-error-500 shrink-0 mt-0.5" />
  <div className="space-y-2">
    <p className="text-sm font-medium text-gray-900">Failed to load settings</p>
    <p className="text-xs text-gray-500">Something went wrong. Please try again.</p>
    <button
      onClick={retry}
      className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
    >
      Try again
    </button>
  </div>
</div>
```

---

## 10. Animation

### Tab Content Transitions

Wrap tab content in `AnimatePresence` with a simple fade + slide.

```tsx
<AnimatePresence mode="wait">
  <motion.div
    key={activeTab}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -4 }}
    transition={{ duration: 0.15, ease: 'easeOut' }}
  >
    {activeTab === 'profile' && <ProfileTab />}
    {activeTab === 'billing' && <BillingTab />}
    {activeTab === 'notifications' && <NotificationsTab />}
  </motion.div>
</AnimatePresence>
```

- **Enter:** fade in + slide up 8px, 150ms
- **Exit:** fade out + slide up 4px, 150ms
- **Mode:** `wait` -- old exits before new enters, no overlap

### Card Stagger

Same `containerVariants` / `itemVariants` pattern currently used. Cards stagger in at 80ms intervals with a 6px upward slide.

### Tab Indicator

Framer Motion `layoutId="settings-tab-indicator"` on the underline `div`. The indicator slides smoothly between tab positions. Spring physics: `type: "spring", stiffness: 500, damping: 30`.

---

## CRITICAL DECISIONS

1. **Top tabs over sidebar tabs.** Three current sections (Profile, Billing, Notifications) fit the 3-5 range where top tabs work best. Avoids eating horizontal space alongside the 216px app sidebar. Future API and Team tabs slot in by adding to the tab array with feature gates -- no layout change needed.

2. **White cards on #F8FAFC page.** Every card uses `bg-white border border-gray-200 rounded-xl shadow-xs`. No colored backgrounds, no gradients on cards. The subtle `shadow-xs` lift and `border-gray-200` stroke provide just enough separation from the page without visual noise. This matches the light-theme card treatment across all other pages.

3. **Stripe Portal redirect, not custom billing UI.** The "Manage Subscription" button opens Stripe's hosted Customer Portal via a backend redirect URL. Parcel does not build custom plan-change, payment method, or invoice download UIs. Stripe handles PCI compliance, SCA, and edge cases. One backend endpoint (`POST /billing/portal-session`) is all that is needed.

4. **Immediate-save toggles vs. explicit-save forms.** Notification toggles save on change (optimistic, with "Saved" confirmation). Profile and password forms require an explicit "Save changes" / "Update password" button click. This split matches user expectations: toggles are discrete state flips, forms are batched edits. The save button stays visible but disabled until dirty state is detected.

5. **Inline cancel flow, not a modal.** Cancellation uses a 4-step inline expansion below the plan card: warning (what you lose) -> reason survey (radio group) -> type CANCEL to confirm -> success state. Inline because modals feel aggressive for a reversible action. The reason survey is the most valuable product signal from a churning user.

6. **AlertDialog for account deletion.** Unlike cancellation (reversible, end of billing period), account deletion is irreversible and requires the strongest friction pattern. The shadcn AlertDialog requires typing the user's email address to confirm (not "DELETE" -- the email is personal and harder to accidentally type). GDPR compliance: 30-day soft-delete grace period, "Download my data" button available before deletion, confirmation email with reactivation window.

7. **Mobile pill tabs, not collapsed dropdown.** On screens < md, the tab bar converts to horizontally scrollable pills with `-mx-4 px-4` bleed. This keeps all tabs visible and thumb-reachable. A dropdown/hamburger would hide the navigation structure and add a tap to every tab switch. The pill pattern matches the mobile pipeline stage tabs already in use.

8. **Font-mono for all financial/numerical data.** Plan price (`$29/mo`), usage counts (`3 / 100`), invoice amounts (`$29.00`) all use JetBrains Mono via `font-mono`. This is Parcel's established convention for financial numbers across the entire app and must carry through to the billing tab without exception.

9. **Color-shifting usage bars.** Progress bars use `bg-indigo-500` below 75%, `bg-warning-500` at 75-90%, and `bg-error-500` above 90%. The color shift provides an at-a-glance urgency signal without requiring the user to read the numbers. An inline "Approaching limit" warning appears at 90%+ with an AlertTriangle icon.

10. **"Download my data" alongside account deletion.** The download button sits next to the delete button in the Danger Zone, not buried in a separate section. This is both a GDPR requirement (right to data portability) and a trust signal. Backend generates a JSON archive of all user-owned records via `GET /auth/export`.
