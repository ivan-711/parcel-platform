# Add Contact button diagnosis

## Symptom

On `/contacts` with an empty contact list, clicking the center "Add Contact" CTA does nothing — no modal, no error, no navigation.

## Root cause

The EmptyState component only accepts `ctaHref` (a link target), not an `onClick` handler. The Contacts page passes `ctaHref="#"` as a placeholder:

```tsx
// ContactsListPage.tsx:186-193
<EmptyState
  icon={Users}
  heading="No contacts yet"
  description="Add sellers, buyers, agents, and other contacts you work with."
  ctaLabel="Add Contact"
  ctaHref="#"        // ← bug: renders <Link to="#"> which does nothing
/>
```

`EmptyState.tsx:44-49` renders this as `<Link to={ctaHref}>` — a React Router link to `#`, which performs no visible navigation.

Meanwhile, the **top-right** "Add Contact" button in the Topbar DOES work:
```tsx
// ContactsListPage.tsx:122-129
<button onClick={() => setModalOpen(true)} ...>
  Add Contact
</button>
```

The two buttons look identical to the user, but they're wired completely differently. The prominent center CTA is broken; the smaller top-right button works.

## Proposed fix (NOT APPLIED)

**Option A (structural, preferred):** Add an `onCtaClick` prop to EmptyState:

```tsx
// EmptyState.tsx — add to Props interface:
onCtaClick?: () => void

// EmptyState.tsx — render logic:
{ctaLabel && onCtaClick ? (
  <button onClick={onCtaClick} className="...same styles...">
    {ctaLabel}
  </button>
) : ctaLabel && ctaHref ? (
  <Link to={ctaHref} className="...same styles...">
    {ctaLabel}
  </Link>
) : null}
```

Then in ContactsListPage.tsx:
```tsx
<EmptyState
  icon={Users}
  heading="No contacts yet"
  description="Add sellers, buyers, agents, and other contacts you work with."
  ctaLabel="Add Contact"
  onCtaClick={() => setModalOpen(true)}
/>
```

## When did it break

**Pre-existing — never worked.** The `ctaHref="#"` has been present since the page was created in commit `71edbd9`. The a11y commit `5e8d12c` only added `aria-describedby={undefined}` to ContactModal's DialogContent — no behavioral change.

## Blast radius

**Pattern bug, not single-component.** Two `ctaHref="#"` instances in the codebase:

| File:Line | CTA Label | Should do |
|-----------|-----------|-----------|
| `ContactsListPage.tsx:192` | "Add Contact" | Open ContactModal |
| `PropertiesListPage.tsx:303` | "Clear Filters" | Call clearFilters() handler |

Both are broken for the same reason: EmptyState has no `onClick` path, only `ctaHref`. The fix (adding `onCtaClick` to EmptyState) covers both.

No other EmptyState usages are affected — all others have valid route paths (`/analyze`, `/contacts`, `/buyers`, etc.).
