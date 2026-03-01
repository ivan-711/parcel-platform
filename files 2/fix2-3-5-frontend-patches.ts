// ─────────────────────────────────────────────────────────────────────────────
// FIX 2 — frontend/src/pages/analyze/ResultsPage.tsx
// formatOutputValue helper: add "mgmt" and "maintenance" to currency detection
//
// FIND the currency key detection line, which currently looks like:
//   const isCurrency = /price|cost|value|profit|flow|arv|mao|payment|balance|equity|loan|cash/i.test(key)
//
// REPLACE WITH:
//   const isCurrency = /price|cost|value|profit|flow|arv|mao|payment|balance|equity|loan|cash|mgmt|maintenance/i.test(key)
// ─────────────────────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────────────────────
// FIX 3 — frontend/src/pages/analyze/AnalyzerFormPage.tsx
// BRRRR form useForm config: set new_loan_rate default to 7.0
//
// FIND the BRRRR useForm defaultValues block (looks like):
//   const brrrrForm = useForm<BrrrrInputs>({
//     defaultValues: {
//       purchase_price: 0,
//       rehab_costs: 0,
//       arv_post_rehab: 0,
//       refinance_ltv_pct: 75,
//       new_loan_rate: 0,         // <-- THIS LINE
//       ...
//     }
//   })
//
// REPLACE that one line with:
//       new_loan_rate: 7.0,       // sensible default for current rate environment
// ─────────────────────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────────────────────
// FIX 5 — frontend/src/pages/analyze/ResultsPage.tsx
// formatOutputValue helper: convert finance_type underscores to Title Case
//
// ADD this block BEFORE the currency/percent checks, at the very top of
// the formatOutputValue function body:
//
//   if (key === 'finance_type' && typeof value === 'string') {
//     return value
//       .split('_')
//       .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
//       .join(' ')
//   }
//
// FULL updated formatOutputValue (for reference — adapt to your actual code):

function formatOutputValue(key: string, value: unknown): string {
  // Fix 5: finance_type snake_case → Title Case
  if (key === 'finance_type' && typeof value === 'string') {
    return value
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  if (value == null) return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'

  if (typeof value === 'number') {
    // Fix 2: add mgmt and maintenance to currency detection
    const isCurrency =
      /price|cost|value|profit|flow|arv|mao|payment|balance|equity|loan|cash|mgmt|maintenance/i.test(key)
    const isPercent = /rate|pct|percent|return|ltv|vacancy/i.test(key)

    if (isCurrency) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(value)
    }
    if (isPercent) {
      return `${value.toFixed(2)}%`
    }
    return value.toLocaleString()
  }

  return String(value)
}

export { formatOutputValue }
// ─────────────────────────────────────────────────────────────────────────────
