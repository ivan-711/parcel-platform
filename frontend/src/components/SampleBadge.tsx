/**
 * Badge indicating a record is sample/demo data from onboarding.
 * Apply to any card or list item where is_sample === true.
 */
export function SampleBadge() {
  return (
    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border border-dashed border-text-muted text-text-muted whitespace-nowrap">
      Sample
    </span>
  )
}
