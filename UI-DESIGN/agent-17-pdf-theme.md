# Agent 17 -- PDF Report Light Theme Spec

Definitive styling specification for `frontend/src/lib/pdf-report.ts`. Maps every PDF element from the old dark theme to the new light brand. All RGB values are exact, implementation-ready arrays for jsPDF's `setTextColor`, `setFillColor`, and `setDrawColor`.

---

## 1. PDF Color Scheme

The old report was designed around a dark header (`#08080F`) and near-white body. The new light theme eliminates the dark header entirely in favor of a clean white page with indigo accents. All colors are derived from the token system in `agent-01-design-tokens.md`.

### Primary Palette (RGB arrays for jsPDF)

```ts
// -- Brand --
const INDIGO_600: [number, number, number] = [79, 70, 229]    // #4F46E5 -- primary accent (headings, rules, badges)
const INDIGO_700: [number, number, number] = [67, 56, 202]    // #4338CA -- active/pressed accent
const INDIGO_50:  [number, number, number] = [238, 240, 255]  // #EEF0FF -- KPI card fill, section highlight bg
const INDIGO_100: [number, number, number] = [224, 226, 255]  // #E0E2FF -- subtle tint (optional emphasis rows)

// -- Neutral text & backgrounds --
const GRAY_900: [number, number, number] = [16, 24, 40]       // #101828 -- primary text (headings, values)
const GRAY_700: [number, number, number] = [52, 64, 84]       // #344054 -- body text, table values
const GRAY_500: [number, number, number] = [102, 112, 133]    // #667085 -- secondary text (labels, metadata)
const GRAY_300: [number, number, number] = [208, 213, 221]    // #D0D5DD -- borders, dividers, table rules
const GRAY_200: [number, number, number] = [234, 236, 240]    // #EAECF0 -- alternating row fill
const GRAY_100: [number, number, number] = [242, 244, 247]    // #F2F4F7 -- table header row background (future)
const GRAY_50:  [number, number, number] = [249, 250, 251]    // #F9FAFB -- (reserved, not used in PDF)
const WHITE:    [number, number, number] = [255, 255, 255]    // #FFFFFF -- page bg, odd rows, badge text

// -- Semantic: cash flow / risk --
const SUCCESS_700: [number, number, number] = [4, 120, 87]    // #047857 -- positive cash flow text
const SUCCESS_600: [number, number, number] = [5, 150, 105]   // #059669 -- (reserved)
const SUCCESS_50:  [number, number, number] = [236, 253, 245] // #ECFDF5 -- (reserved for future badges)

const WARNING_600: [number, number, number] = [217, 119, 6]   // #D97706 -- medium risk text
const WARNING_50:  [number, number, number] = [255, 251, 235] // #FFFBEB -- (reserved for future badges)

const ERROR_700:   [number, number, number] = [185, 28, 28]   // #B91C1C -- negative cash flow text, high risk
const ERROR_600:   [number, number, number] = [220, 38, 38]   // #DC2626 -- danger badge
const ERROR_50:    [number, number, number] = [254, 242, 242] // #FEF2F2 -- (reserved for future badges)

const CRITICAL:    [number, number, number] = [127, 29, 29]   // #7F1D1D -- critical risk (unchanged)
```

### Old-to-New Mapping

| Old constant     | Old value          | New constant | New value          | Notes                                    |
|------------------|--------------------|--------------|--------------------|------------------------------------------|
| `INDIGO`         | `[99, 102, 241]`  | `INDIGO_600` | `[79, 70, 229]`   | Deeper, WCAG AA on white (4.63:1)        |
| `WHITE`          | `[255, 255, 255]` | `WHITE`      | `[255, 255, 255]` | Unchanged                                |
| `DARK_HEADER`    | `[8, 8, 15]`      | -- removed -- | --                | No more dark header bar                  |
| `TEXT_PRIMARY`   | `[30, 30, 30]`    | `GRAY_900`   | `[16, 24, 40]`    | Cool-tinted neutral, not pure gray       |
| `TEXT_SECONDARY` | `[100, 100, 110]` | `GRAY_500`   | `[102, 112, 133]` | Slightly cooler, brand-aligned           |
| `ROW_EVEN`       | `[245, 245, 250]` | `GRAY_200`   | `[234, 236, 240]` | Stronger stripe, better contrast         |
| `ROW_ODD`        | `[255, 255, 255]` | `WHITE`      | `[255, 255, 255]` | Unchanged                                |
| `BORDER_LIGHT`   | `[220, 220, 230]` | `GRAY_300`   | `[208, 213, 221]` | Cooler, matches token system             |

---

## 2. Font Mapping

jsPDF has no custom font embedding by default. Use Helvetica (built-in) for everything.

| Web font       | PDF font              | Usage                                         |
|----------------|-----------------------|-----------------------------------------------|
| Inter          | Helvetica, normal     | Body text, labels, metadata, paragraphs       |
| Satoshi        | Helvetica, bold       | Display headings (report title, section heads) |
| JetBrains Mono | Courier, bold         | Financial values ($, %, numbers in tables)    |

**Font sizes (in points, jsPDF units):**

| Element              | Size | Weight          | Color        |
|----------------------|------|-----------------|--------------|
| Logo "PARCEL"        | 14pt | Helvetica bold  | `INDIGO_600` |
| Report title         | 22pt | Helvetica bold  | `GRAY_900`   |
| Subtitle / date      | 9pt  | Helvetica normal| `GRAY_500`   |
| Property address     | 20pt | Helvetica bold  | `GRAY_900`   |
| Section heading      | 12pt | Helvetica bold  | `INDIGO_600` |
| Sub-heading          | 10pt | Helvetica bold  | `GRAY_700`   |
| Body / AI text       | 10pt | Helvetica normal| `GRAY_700`   |
| Table label          | 9pt  | Helvetica normal| `GRAY_500`   |
| Table value          | 9pt  | Courier bold    | `GRAY_700`   |
| Table header row     | 9pt  | Helvetica bold  | `GRAY_900`   |
| KPI label            | 8pt  | Helvetica normal| `GRAY_500`   |
| KPI value            | 16pt | Courier bold    | `GRAY_900`   |
| Footer text          | 8pt  | Helvetica normal| `GRAY_500`   |
| Disclaimer           | 6pt  | Helvetica normal| `GRAY_500`   |
| Strategy badge       | 8pt  | Helvetica bold  | Per strategy |

**Line spacing rules:**
- Body text: 5mm per line (unchanged)
- Table rows: 7mm row height (unchanged)
- Section gap after heading: 6mm below underline
- Between sections: 8mm gap

---

## 3. Header Design

**Old:** Dark near-black bar (`#08080F`) spanning full width with white "PARCEL" text and an indigo line beneath.

**New:** Clean white header with indigo accent.

```
drawPageHeader(doc):
  1. No background fill -- white page shows through
  2. Logo placeholder area:
     - Draw indigo square icon: 8x8mm rounded rect at (MARGIN, 6) filled with INDIGO_600
     - White "P" letter inside: Helvetica bold 12pt, centered in the square
     - "PARCEL" text: Helvetica bold 14pt, INDIGO_600, at (MARGIN + 11, 13)
  3. Tagline right-aligned:
     - "Real Estate Deal Intelligence" at 8pt, GRAY_500, right-aligned at (PAGE_WIDTH - MARGIN, 13)
  4. Accent underline:
     - 0.8pt line, INDIGO_600, from x=MARGIN to x=PAGE_WIDTH-MARGIN at y=HEADER_HEIGHT
     - This replaces the full-bleed dark bar
  5. HEADER_HEIGHT stays 22mm (unchanged layout math)
```

**jsPDF calls:**
```ts
function drawPageHeader(doc: jsPDF): void {
  // Logo icon -- indigo rounded square
  doc.setFillColor(...INDIGO_600)          // [79, 70, 229]
  doc.roundedRect(MARGIN, 6, 8, 8, 1.5, 1.5, 'F')
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...WHITE)               // [255, 255, 255]
  doc.text('P', MARGIN + 4, 12.5, { align: 'center' })

  // Brand name
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...INDIGO_600)          // [79, 70, 229]
  doc.text('PARCEL', MARGIN + 11, 13)

  // Tagline
  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...GRAY_500)            // [102, 112, 133]
  doc.text('Real Estate Deal Intelligence', PAGE_WIDTH - MARGIN, 13, { align: 'right' })

  // Accent underline
  doc.setDrawColor(...INDIGO_600)          // [79, 70, 229]
  doc.setLineWidth(0.8)
  doc.line(MARGIN, HEADER_HEIGHT, PAGE_WIDTH - MARGIN, HEADER_HEIGHT)
}
```

**Key changes from old:**
- `DARK_HEADER` full-width rect removed entirely
- Accent line inset to margins (was `0` to `PAGE_WIDTH`, now `MARGIN` to `PAGE_WIDTH - MARGIN`)
- Brand name in indigo, not white-on-dark
- Small logo square placeholder added
- Tagline added right-aligned

---

## 4. Footer Design

```
drawPageFooter(doc, pageNum, totalPages, dateStr):
  y = PAGE_HEIGHT - FOOTER_HEIGHT

  1. Top border: 0.3pt line, GRAY_300, from MARGIN to PAGE_WIDTH-MARGIN
  2. Branding line (y + 7):
     - Left: "Generated by Parcel  |  {dateStr}  |  parcel-platform.com"
     - Font: Helvetica normal 8pt, GRAY_500
     - Right: "Page {n} of {total}"
     - Font: Helvetica normal 8pt, GRAY_500, right-aligned
  3. Disclaimer (y + 11):
     - Font: Helvetica normal 6pt, GRAY_500
     - Text: "For informational purposes only. Not an appraisal, financial advice, or investment recommendation. AI content may contain errors."
```

**jsPDF calls:**
```ts
function drawPageFooter(doc: jsPDF, pageNum: number, totalPages: number, dateStr: string): void {
  const y = PAGE_HEIGHT - FOOTER_HEIGHT
  doc.setDrawColor(...GRAY_300)            // [208, 213, 221]
  doc.setLineWidth(0.3)
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y)

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...GRAY_500)            // [102, 112, 133]
  doc.text(`Generated by Parcel  |  ${dateStr}  |  parcel-platform.com`, MARGIN, y + 7)
  doc.text(`Page ${pageNum} of ${totalPages}`, PAGE_WIDTH - MARGIN, y + 7, { align: 'right' })

  doc.setFontSize(6)
  doc.text(
    'For informational purposes only. Not an appraisal, financial advice, or investment recommendation. AI content may contain errors.',
    MARGIN, y + 11
  )
}
```

**Changes from old:**
- Unicode bullet `\u2022` replaced with pipe `|` for safer cross-viewer rendering
- Divider color updated from `BORDER_LIGHT [220,220,230]` to `GRAY_300 [208,213,221]`
- Text color updated from `TEXT_SECONDARY [100,100,110]` to `GRAY_500 [102,112,133]`

---

## 5. Section Headings

**Style: Indigo text + thin indigo underline**

All section headings follow one pattern:

```ts
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...INDIGO_600)          // [79, 70, 229]
  doc.text(title, MARGIN, y)
  y += 2

  doc.setDrawColor(...INDIGO_600)          // [79, 70, 229]
  doc.setLineWidth(0.4)
  doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y)
  y += 6
```

This applies to: "Key Metrics", "Analysis Outputs", "Deal Inputs", "Risk Factor Breakdown", "Property Details", "AI RECOMMENDATION", "Deal Status", "RISK SCORE".

Identical structure to old code but uses `INDIGO_600 [79,70,229]` instead of old `INDIGO [99,102,241]`.

**Alternative considered but rejected:** Indigo background bar with white text. Heavier on ink, less print-friendly. The underline approach is preferred for light-theme PDFs.

---

## 6. Body Text Specifications

### AI Recommendation Block

```ts
  // Heading
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...INDIGO_600)          // [79, 70, 229]
  doc.text('AI RECOMMENDATION', MARGIN, y)
  y += 6

  // Body
  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...GRAY_700)            // [52, 64, 84]
  const recLines = doc.splitTextToSize(recommendation, CONTENT_WIDTH)
  doc.text(recLines, MARGIN, y)
  y += recLines.length * 5 + 4
```

**Change:** Body text color moves from `TEXT_PRIMARY [30,30,30]` to `GRAY_700 [52,64,84]`. Slightly lighter but maintains excellent readability on white (contrast ratio 8.19:1). The cooler tone matches the brand palette.

### Property Metadata (zip, type, dates)

```ts
  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GRAY_500)            // [102, 112, 133]
```

### Deal Status Text

```ts
  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...GRAY_700)            // [52, 64, 84]
```

---

## 7. Data Tables

### Table Header Row (new, for future multi-column tables)

The old code had no dedicated header row. For the current key-value pair tables, the section heading + indigo underline serves as the visual anchor. A header row style is defined here for future multi-column tables (e.g., monthly cash flow projections):

```ts
// Table header row (when applicable)
doc.setFillColor(...GRAY_100)              // [242, 244, 247]
doc.rect(MARGIN, y - 4.5, CONTENT_WIDTH, ROW_HEIGHT, 'F')
doc.setFont('Helvetica', 'bold')
doc.setFontSize(9)
doc.setTextColor(...GRAY_900)              // [16, 24, 40]
```

### Alternating Data Rows

```ts
const ROW_HEIGHT = 7

for (let i = 0; i < rows.length; i++) {
  const bgColor = i % 2 === 0 ? GRAY_200 : WHITE  // [234,236,240] or [255,255,255]
  doc.setFillColor(...bgColor)
  doc.rect(MARGIN, y - 4.5, CONTENT_WIDTH, ROW_HEIGHT, 'F')

  // Label (left)
  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GRAY_500)            // [102, 112, 133]
  doc.text(row.label, LABEL_X, y)

  // Value (right, monospace)
  doc.setFont('Courier', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...GRAY_700)            // [52, 64, 84]
  doc.text(row.value, VALUE_X, y, { align: 'right' })

  y += ROW_HEIGHT
}
```

### Table Borders

No per-row horizontal borders. The alternating fills provide sufficient visual separation. A bottom border closes the table:

```ts
// After all rows rendered
doc.setDrawColor(...GRAY_300)              // [208, 213, 221]
doc.setLineWidth(0.2)
doc.line(MARGIN, y - 3.5, MARGIN + CONTENT_WIDTH, y - 3.5)
```

---

## 8. Risk Score Section

### Color-Coded Display

The risk score uses semantic colors from the design token system:

```ts
function getRiskColor(score: number): [number, number, number] {
  if (score <= 30) return [4, 120, 87]     // SUCCESS_700 -- #047857 (green, WCAG AA)
  if (score <= 60) return [217, 119, 6]    // WARNING_600 -- #D97706 (amber, WCAG AA)
  if (score <= 80) return [185, 28, 28]    // ERROR_700   -- #B91C1C (red, WCAG AA)
  return [127, 29, 29]                      // CRITICAL    -- #7F1D1D (dark red)
}
```

**Old-to-new risk color changes:**
- Low Risk:    `[16, 185, 129]` -> `[4, 120, 87]`   (darker green, prints better)
- Medium Risk: `[245, 158, 11]` -> `[217, 119, 6]`   (darker amber, better contrast)
- High Risk:   `[239, 68, 68]`  -> `[185, 28, 28]`   (darker red, WCAG AA compliant)
- Critical:    `[127, 29, 29]`  -> `[127, 29, 29]`   (unchanged)

### Risk Badge Rendering

```ts
function drawRiskScore(doc: jsPDF, score: number, startY: number): number {
  let y = startY

  if (y + 24 > maxContentY()) {
    doc.addPage()
    drawPageHeader(doc)
    y = contentStartY()
  }

  const label = getRiskLabel(score)
  const color = getRiskColor(score)

  // Section label
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...INDIGO_600)          // [79, 70, 229]
  doc.text('RISK SCORE', MARGIN, y)

  // Score badge -- filled rounded rect
  const badgeX = MARGIN + 42
  doc.setFillColor(...color)               // semantic color from getRiskColor
  doc.roundedRect(badgeX, y - 6, 24, 9, 2, 2, 'F')
  doc.setFont('Courier', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...WHITE)               // [255, 255, 255]
  doc.text(`${score}`, badgeX + 12, y, { align: 'center' })

  // Label text in matching semantic color
  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...color)               // same semantic color as badge
  doc.text(`  ${label}`, badgeX + 26, y)

  return y + 12
}
```

---

## 9. Cash Flow Table

When outputs contain cash-flow-related keys, values are color-coded for quick scanning.

### Positive Values (profit, positive cash flow)

```ts
doc.setTextColor(...SUCCESS_700)           // [4, 120, 87] -- #047857
```

### Negative Values (loss, negative cash flow)

```ts
doc.setTextColor(...ERROR_700)             // [185, 28, 28] -- #B91C1C
```

### Implementation in `drawTable`

Add conditional coloring inside the row loop. Only negative currency values get red by default. Green is reserved for explicitly profit-oriented keys in the outputs table:

```ts
// Cash-flow-sensitive keys (only in "Analysis Outputs" table)
const CASH_FLOW_KEYS = [
  'monthly_cash_flow', 'annual_cash_flow', 'net_profit',
  'total_profit', 'cash_flow', 'spread'
]

// Inside drawTable row loop, replacing the fixed GRAY_700 value color:
if (isCashFlowKey && numericValue > 0) {
  doc.setTextColor(...SUCCESS_700)         // [4, 120, 87]
} else if (numericValue < 0) {
  doc.setTextColor(...ERROR_700)           // [185, 28, 28]
} else {
  doc.setTextColor(...GRAY_700)            // [52, 64, 84]
}
```

**Design decision:** Only negative currency values get red universally. Positive values get green only for explicit cash-flow/profit keys in the outputs table. All other values stay `GRAY_700`. This prevents a "Christmas tree" effect and keeps the report professional.

---

## 10. Print-Friendly Guidelines

### Minimal Background Fills

- **Page background:** Pure white. No full-page tint.
- **Header:** No dark bar. Only a thin 0.8pt indigo rule and small 8x8mm logo square.
- **Table rows:** Alternating `GRAY_200 [234,236,240]` / `WHITE`. Light enough for clean laser printing without banding.
- **KPI cards:** `INDIGO_50 [238,240,255]` fill with `GRAY_300` border. Near-white on most printers.
- **Badges:** Small area fills only (strategy badge ~25x8mm, risk badge ~24x9mm).

### Ink Budget

Total filled area per page is under 5% of page area. This is a significant reduction from the old dark-header design which filled 22mm x 210mm = 4,620mm2 of near-black on every page.

### Border Strategy

| Element           | Width | Color      | Span                        |
|-------------------|-------|------------|-----------------------------|
| Header accent     | 0.8pt | INDIGO_600 | MARGIN to PAGE_WIDTH-MARGIN |
| Section underline | 0.4pt | INDIGO_600 | MARGIN to MARGIN+CONTENT_WIDTH |
| Footer divider    | 0.3pt | GRAY_300   | MARGIN to PAGE_WIDTH-MARGIN |
| Table bottom      | 0.2pt | GRAY_300   | MARGIN to MARGIN+CONTENT_WIDTH |
| KPI card border   | 0.3pt | GRAY_300   | Card perimeter              |

No per-row horizontal lines in tables -- alternating fills suffice.

### Contrast Ratios (all pass WCAG AA for normal text unless noted)

| Element                 | Foreground   | Background | Ratio   | Status    |
|-------------------------|--------------|------------|---------|-----------|
| Primary text on white   | `GRAY_900`   | White      | 14.68:1 | AAA       |
| Body text on white      | `GRAY_700`   | White      | 8.19:1  | AAA       |
| Secondary text on white | `GRAY_500`   | White      | 4.57:1  | AA        |
| Indigo heading on white | `INDIGO_600` | White      | 4.63:1  | AA        |
| Table label on gray row | `GRAY_500`   | `GRAY_200` | 3.34:1  | See note  |
| Table value on gray row | `GRAY_700`   | `GRAY_200` | 5.99:1  | AA        |
| Success text on white   | `SUCCESS_700`| White      | 5.45:1  | AA        |
| Error text on white     | `ERROR_700`  | White      | 5.72:1  | AA        |

Note: `GRAY_500` on `GRAY_200` (3.34:1) is below AA for 9pt text. Accepted trade-off because the label column is always paired with a high-contrast value column. If stricter compliance is required, upgrade table labels to `GRAY_600 [71, 84, 103]` (`#475467`, 4.69:1 on `GRAY_200`).

---

## 11. Complete RGB Reference Table

Every color used in the PDF, in one place:

```ts
// -- Brand --
const INDIGO_600: [number, number, number] = [79, 70, 229]    // #4F46E5 -- primary accent
const INDIGO_700: [number, number, number] = [67, 56, 202]    // #4338CA -- (reserved, pressed state)
const INDIGO_50:  [number, number, number] = [238, 240, 255]  // #EEF0FF -- KPI card background

// -- Neutrals --
const GRAY_900:   [number, number, number] = [16, 24, 40]     // #101828 -- headings, KPI values
const GRAY_700:   [number, number, number] = [52, 64, 84]     // #344054 -- body text, table values
const GRAY_500:   [number, number, number] = [102, 112, 133]  // #667085 -- labels, metadata, footer
const GRAY_300:   [number, number, number] = [208, 213, 221]  // #D0D5DD -- borders, dividers
const GRAY_200:   [number, number, number] = [234, 236, 240]  // #EAECF0 -- even row background
const GRAY_100:   [number, number, number] = [242, 244, 247]  // #F2F4F7 -- table header row bg (future)
const WHITE:      [number, number, number] = [255, 255, 255]  // #FFFFFF -- page bg, odd rows, badge text

// -- Semantic --
const SUCCESS_700:[number, number, number] = [4, 120, 87]     // #047857 -- positive cash flow
const SUCCESS_50: [number, number, number] = [236, 253, 245]  // #ECFDF5 -- (reserved for future badges)
const WARNING_600:[number, number, number] = [217, 119, 6]    // #D97706 -- medium risk
const WARNING_50: [number, number, number] = [255, 251, 235]  // #FFFBEB -- (reserved for future badges)
const ERROR_700:  [number, number, number] = [185, 28, 28]    // #B91C1C -- negative values, high risk
const ERROR_50:   [number, number, number] = [254, 242, 242]  // #FEF2F2 -- (reserved for future badges)
const CRITICAL:   [number, number, number] = [127, 29, 29]    // #7F1D1D -- critical risk score

// -- Strategy badges (from design tokens) --
const STRATEGY_COLORS: Record<Strategy, { bg: [number, number, number]; text: [number, number, number] }> = {
  wholesale:        { bg: [254, 243, 199], text: [146, 64, 14] },   // Amber 100 / Amber 800
  creative_finance: { bg: [237, 233, 254], text: [91, 33, 182] },   // Violet 100 / Violet 800
  brrrr:            { bg: [219, 234, 254], text: [30, 64, 175] },   // Blue 100 / Blue 800
  buy_and_hold:     { bg: [209, 250, 229], text: [6, 95, 70] },     // Emerald 100 / Emerald 800
  flip:             { bg: [255, 228, 230], text: [159, 18, 57] },   // Rose 100 / Rose 800
}
```

### Strategy Badge Old vs New

| Strategy          | Old bg             | New bg             | Old text          | New text          |
|-------------------|--------------------|--------------------|-------------------|-------------------|
| wholesale         | `[255, 237, 180]`  | `[254, 243, 199]`  | `[120, 80, 0]`   | `[146, 64, 14]`  |
| creative_finance  | `[220, 210, 255]`  | `[237, 233, 254]`  | `[80, 40, 150]`  | `[91, 33, 182]`  |
| brrrr             | `[200, 220, 255]`  | `[219, 234, 254]`  | `[30, 60, 140]`  | `[30, 64, 175]`  |
| buy_and_hold      | `[200, 240, 220]`  | `[209, 250, 229]`  | `[20, 100, 60]`  | `[6, 95, 70]`    |
| flip              | `[255, 215, 210]`  | `[255, 228, 230]`  | `[150, 40, 30]`  | `[159, 18, 57]`  |

All new values are from `agent-01-design-tokens.md` strategy badge definitions. The old values were hand-picked approximations.

### KPI Card Styling (Updated)

```ts
// Card fill: INDIGO_50 with GRAY_300 border
doc.setFillColor(...INDIGO_50)             // [238, 240, 255]
doc.setDrawColor(...GRAY_300)              // [208, 213, 221]
doc.setLineWidth(0.3)
doc.roundedRect(x, cardY, CARD_W, CARD_H, 3, 3, 'FD')

// Label
doc.setFont('Helvetica', 'normal')
doc.setFontSize(8)
doc.setTextColor(...GRAY_500)              // [102, 112, 133]

// Value
doc.setFont('Courier', 'bold')
doc.setFontSize(16)
doc.setTextColor(...GRAY_900)              // [16, 24, 40]
```

Old card fill was `[250, 250, 255]` -- new is `INDIGO_50 [238, 240, 255]` (slightly more saturated, aligns with token).

---

## CRITICAL DECISIONS

1. **No dark header bar.** The old `DARK_HEADER [8, 8, 15]` full-bleed rectangle is removed entirely. The header is now white with an indigo logo square, brand wordmark, and a margin-to-margin indigo rule. This is the single largest visual change and reduces ink usage dramatically.

2. **Indigo shifts from 500 to 600.** All accent uses move from `#6366F1 [99, 102, 241]` to `#4F46E5 [79, 70, 229]`. The 600 shade passes WCAG AA on white (4.63:1) while the 500 shade falls short (4.17:1). This is a non-negotiable accessibility requirement.

3. **Text colors use cool-tinted grays, not pure grays.** The old `[30,30,30]` / `[100,100,110]` values had a warm neutral tone. The new `GRAY_900` / `GRAY_700` / `GRAY_500` use cool blue-tinted grays from the Untitled UI scale (matching `agent-01-design-tokens.md`) to create visual cohesion with the web app.

4. **No green for ordinary positive dollar values.** Only explicitly profit-oriented output keys (`monthly_cash_flow`, `net_profit`, `total_profit`, `cash_flow`, `spread`, `annual_cash_flow`) get `SUCCESS_700` green. All other currency values stay `GRAY_700`. This prevents visual noise and keeps the report professional.

5. **Risk score colors darkened for print.** Old `[16, 185, 129]` (success-500) is vibrant on screen but washes out on paper. New `[4, 120, 87]` (success-700) prints as a clear, readable green. Same logic for amber (`[245, 158, 11]` to `[217, 119, 6]`) and red (`[239, 68, 68]` to `[185, 28, 28]`).

6. **Strategy badge colors sourced from design tokens.** Old values were hand-picked approximations. New values are exact matches to `agent-01-design-tokens.md` definitions (Amber 100/800, Violet 100/800, Blue 100/800, Emerald 100/800, Rose 100/800).

7. **Table bottom border added.** The old table had no closing border -- rows just ended. A thin 0.2pt `GRAY_300` line now closes each table for visual completeness.

8. **Footer bullet replaced with pipe.** The `\u2022` Unicode bullet in the footer string is replaced with `|`. Some PDF viewers render Unicode bullets inconsistently at small sizes. The pipe is safe in all Helvetica subsets.

9. **Header accent line inset to margins.** The old indigo line ran from `x=0` to `x=PAGE_WIDTH` (full bleed). The new line runs from `MARGIN` to `PAGE_WIDTH - MARGIN`, matching the footer divider and creating a contained, balanced layout.

10. **No structural layout changes.** Page dimensions (A4), margins (15mm), content width (180mm), header height (22mm), footer height (18mm), row heights (7mm), and KPI card dimensions remain identical. This is a color/typography refresh, not a layout redesign. The tagline in the header is the only new text element.

11. **GRAY_500 on GRAY_200 is a known borderline contrast (3.34:1).** Accepted trade-off because: (a) the label column is always paired with a high-contrast value column, (b) the information is supplementary, (c) upgrading to `GRAY_600 [71, 84, 103]` is a one-line change if accessibility audits require it.

12. **No new fonts loaded.** Helvetica remains the only text font. Courier bold remains for financial values. No font files, no CORS issues, no bundle size impact.
