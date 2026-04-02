# Documents & PDF Reports on a Luxury Dark Interface

Research for Parcel's document handling, AI analysis display, and PDF report generation
within the dark UI system (bg #0C0B0A, cream text #F0EDE8, violet accent #8B7AFF).

---

## 1. PDF Reports From a Dark UI: Dark or Light?

The universal standard is **light PDFs from dark interfaces**. Every premium tool that
ships a dark UI -- Linear, Raycast, Notion (dark mode), Arc Browser -- generates
print-ready white-background documents. The reasons are practical and perceptual:

- **Printing cost**: Dark backgrounds consume enormous ink/toner. Enterprise users
  print deal reports for lender meetings, broker packages, and investor decks.
- **Professional expectation**: Lenders, title companies, and attorneys expect
  white-paper documents. A dark PDF reads as a screenshot, not a report.
- **Contrast ratios**: WCAG AAA requires 7:1 for body text. A light page with
  near-black text achieves this effortlessly; dark pages require careful management
  of mid-tone text colors.
- **Fax/scan survival**: Many real estate workflows still involve scanning or
  faxing. Dark backgrounds degrade catastrophically.

**Verdict**: Parcel's existing light-PDF approach (white bg, indigo-600 accents) is
correct. The UI redesign should not change the PDF color scheme -- only refine
its branding to match the new luxury positioning.

---

## 2. PDF Branding: Making Reports Feel as Premium as the Interface

Parcel's current `pdf-report.ts` uses Helvetica/Courier with indigo-600 accents.
To elevate the PDF to match the luxury dark UI identity:

### 2a. Color Palette Shift

Replace the indigo palette with Parcel's new violet + warm neutral system. The PDF
remains light, but the accent color should be the brand violet (or a print-safe
darkened variant) rather than generic indigo:

```typescript
// New PDF color constants (light page, violet accents)
const VIOLET_700: [number, number, number] = [109, 96, 204]   // #6D60CC — print-safe
const VIOLET_50:  [number, number, number] = [245, 243, 255]  // #F5F3FF — KPI card bg
const CHARCOAL:   [number, number, number] = [12, 11, 10]     // #0C0B0A — header text
const WARM_800:   [number, number, number] = [41, 37, 36]     // #292524 — body text
const WARM_500:   [number, number, number] = [120, 113, 108]  // #78716C — secondary text
const WARM_300:   [number, number, number] = [214, 211, 209]  // #D6D3D1 — rules/borders
const CREAM:      [number, number, number] = [250, 250, 249]  // #FAFAF9 — page bg (not pure white)
```

Using `#FAFAF9` instead of pure white as the page background adds warmth and
aligns with the warm-neutral system. The difference is invisible on most printers
but perceptible on screen previews.

### 2b. Typography Strategy

jsPDF's built-in fonts are limited (Helvetica, Courier, Times). For a luxury feel:

- **Option A (practical)**: Stay with Helvetica for body, but use consistent
  letter-spacing and weight choices to approximate Inter's clean geometry. Use
  `doc.setCharSpace(0.3)` sparingly on section headers for tracked uppercase labels.
- **Option B (premium)**: Embed a custom font via `doc.addFont()`. jsPDF supports
  `.ttf` embedding. Load Inter-Regular and Inter-SemiBold as base64 strings at
  build time. This adds ~80KB per weight but creates exact brand consistency.

```typescript
// Option B: Embedding Inter for brand consistency
import interRegularBase64 from '@/assets/fonts/Inter-Regular.base64'
import interSemiBoldBase64 from '@/assets/fonts/Inter-SemiBold.base64'

doc.addFileToVFS('Inter-Regular.ttf', interRegularBase64)
doc.addFont('Inter-Regular.ttf', 'Inter', 'normal')
doc.addFileToVFS('Inter-SemiBold.ttf', interSemiBoldBase64)
doc.addFont('Inter-SemiBold.ttf', 'Inter', 'bold')
doc.setFont('Inter', 'normal')
```

### 2c. Header Refinement

The current header uses a filled indigo square with "P" as the logo. Upgrade:

- Replace the colored square with a more refined mark: a small violet rule +
  wordmark "PARCEL" in Inter SemiBold with generous tracking.
- Add a thin violet hairline (0.3pt) across the full content width.
- Right-align a subtle "Deal Intelligence Report" tagline in WARM_500.

### 2d. KPI Cards

The existing `INDIGO_50` filled rounded rects work well. Adapt to:
- Fill: `VIOLET_50` (#F5F3FF)
- Border: `WARM_300` at 0.25pt
- Label: `WARM_500`, 7pt, uppercase, tracked
- Value: `CHARCOAL`, 18pt, Inter SemiBold (or Courier Bold as fallback), tabular

### 2e. Footer Elevation

Add a "Confidential" watermark option for pro users. The legal disclaimer should
use 6pt WARM_500 with generous line height. Include a subtle Parcel wordmark
(not just text) in the bottom-left.

---

## 3. Document Upload Zone on Dark

The current upload zone uses `border-gray-300` with `bg-gray-50` hover states --
a light-theme pattern. For the dark interface:

### 3a. Resting State

```tsx
<div
  {...getRootProps()}
  className={cn(
    'border border-dashed rounded-xl p-6 text-center cursor-pointer',
    'transition-all duration-200',
    'border-[#2A2725] bg-[#151413]',               // subtle raised surface
    'hover:border-[#8B7AFF]/40 hover:bg-[#1A1918]', // violet hint on hover
    isDragActive && 'border-[#8B7AFF] bg-[#8B7AFF]/5 shadow-[0_0_24px_rgba(139,122,255,0.08)]',
    isUploading && 'pointer-events-none opacity-50',
  )}
>
```

Key principles:
- **No bright borders at rest**: Use `#2A2725` (barely visible against #0C0B0A).
  The zone should whisper, not shout.
- **Drag-active glow**: A faint violet shadow (`shadow-[0_0_24px_rgba(139,122,255,0.08)]`)
  creates a "magnetic" feel when files hover over the zone. This is the Mercury
  approach -- light responds to user intent.
- **Dashed-to-solid transition**: On drag-active, transition from dashed to solid
  border for a satisfying "locked on" feel.

### 3b. Upload Icon

Replace the generic `Upload` icon with a more refined animation:

```tsx
{isDragActive ? (
  <motion.div
    animate={{ y: [0, -3, 0] }}
    transition={{ repeat: Infinity, duration: 1.2 }}
  >
    <ArrowDownToLine size={24} className="text-[#8B7AFF]" />
  </motion.div>
) : (
  <Upload size={20} className="text-[#78716C]" />
)}
```

### 3c. File Type Indicators

Show accepted types as small pill badges below the instructions:

```tsx
<div className="flex items-center justify-center gap-1.5 mt-3">
  {['PDF', 'DOCX', 'PNG', 'JPG'].map(ext => (
    <span key={ext} className="text-[10px] font-medium text-[#78716C] bg-[#1A1918]
      rounded px-1.5 py-0.5 border border-[#2A2725]">
      {ext}
    </span>
  ))}
</div>
```

---

## 4. Document List on Dark

The document list is the primary navigation for the documents page. On dark:

### 4a. Row Structure

```tsx
<button
  onClick={onSelect}
  className={cn(
    'w-full text-left px-3 py-3 rounded-lg transition-all duration-150',
    isSelected
      ? 'bg-[#8B7AFF]/8 border border-[#8B7AFF]/25'
      : 'hover:bg-[#151413] border border-transparent',
  )}
>
  <div className="flex items-start gap-3">
    <FileText size={14} className="text-[#78716C] mt-0.5 shrink-0" />
    <div className="min-w-0 flex-1">
      <p className="text-sm text-[#F0EDE8] truncate">{doc.original_filename}</p>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[10px] text-[#57534E] tabular-nums">
          {formatFileSize(doc.file_size_bytes)}
        </span>
        <StatusBadge status={doc.status} />
      </div>
    </div>
  </div>
</button>
```

### 4b. Status Badges for Dark

Status badges need higher contrast backgrounds on dark. Use filled pills with
muted opacity backgrounds:

```tsx
// Complete
<span className="inline-flex items-center gap-1 text-[10px] font-medium
  text-emerald-400 bg-emerald-500/10 border border-emerald-500/20
  rounded-full px-2 py-0.5">
  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
  Done
</span>

// Processing
<span className="inline-flex items-center gap-1 text-[10px] font-medium
  text-amber-400 bg-amber-500/10 border border-amber-500/20
  rounded-full px-2 py-0.5">
  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
  Processing
</span>

// Failed
<span className="inline-flex items-center gap-1 text-[10px] font-medium
  text-red-400 bg-red-500/10 border border-red-500/20
  rounded-full px-2 py-0.5">
  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
  Failed
</span>
```

### 4c. Date Display

Use relative time for recent documents ("2h ago", "Yesterday") and absolute dates
for older ones. Display in `#57534E` (warm gray 600) with tabular-nums:

```tsx
<span className="text-[10px] text-[#57534E] tabular-nums">
  {formatRelativeDate(doc.created_at)}
</span>
```

### 4d. File Type Icons

Differentiate file types with subtle color coding on the icon:
- PDF: `text-red-400/60`
- DOCX: `text-blue-400/60`
- PNG/JPG: `text-emerald-400/60`

This is a small touch that helps scanability without being garish.

---

## 5. AI Analysis Results on Dark

This is the most information-dense section. The current implementation uses
white cards (`bg-white`) with gray borders -- these need full dark adaptation.

### 5a. AI Summary Card

The current code already uses a dark card (`bg-gray-900`) for emphasis -- in
the new system this becomes the standard surface:

```tsx
<div className="rounded-xl border border-[#2A2725] bg-[#151413] p-5">
  <h3 className="text-[10px] font-semibold text-[#78716C] uppercase
    tracking-[0.1em] mb-2">
    AI Summary
  </h3>
  <p className="text-sm text-[#D6D3D1] leading-relaxed">{doc.ai_summary}</p>
</div>
```

Party pills should use the subtle dark chip pattern:

```tsx
<span className="inline-flex items-center gap-1.5 rounded-full
  bg-[#1A1918] border border-[#2A2725] px-2.5 py-1 text-[10px]">
  <span className="text-[#D6D3D1]">{party.name}</span>
  <span className="text-[#57534E]">{party.role}</span>
</span>
```

### 5b. Risk Flags on Dark

Risk flags use a left-border accent pattern, which translates beautifully to dark:

```tsx
// Severity border colors on dark
const borderColor =
  flag.severity === 'high'   ? 'border-l-red-500'   :
  flag.severity === 'medium' ? 'border-l-amber-500'  :
                               'border-l-blue-400'

<div className={cn('border-l-2 pl-3 py-1', borderColor)}>
  <p className="text-sm text-[#F0EDE8]">{flag.description}</p>
  <p className="text-xs text-[#57534E] mt-1 italic">"{flag.quote}"</p>
</div>
```

The left-border pattern gains visual power on dark because the color accent pops
against the near-black background. No background fill needed -- the border alone
carries the severity signal.

For high-severity flags, consider adding a subtle red glow:

```css
.risk-flag-high {
  box-shadow: -4px 0 12px -4px rgba(239, 68, 68, 0.15);
}
```

### 5c. Extracted Numbers Grid

Financial numbers need `tabular-nums` and the cream color for maximum readability:

```tsx
<div className="grid grid-cols-2 gap-x-6 gap-y-3">
  {numbers.map(([key, value]) => (
    <div key={key} className="flex flex-col gap-0.5">
      <span className="text-[10px] text-[#57534E] uppercase tracking-[0.1em]">
        {formatLabel(key)}
      </span>
      <span className="text-sm text-[#F0EDE8] tabular-nums font-medium">
        {formatValue(key, value)}
      </span>
    </div>
  ))}
</div>
```

### 5d. Key Terms List

Use subtle dot separators instead of bullet points for a cleaner look:

```tsx
<ul className="space-y-1.5">
  {terms.map((term, i) => (
    <li key={i} className="flex items-start gap-2.5 text-sm text-[#D6D3D1]">
      <span className="w-1 h-1 rounded-full bg-[#8B7AFF]/50 mt-2 shrink-0" />
      {term}
    </li>
  ))}
</ul>
```

The violet-tinted dots create a subtle brand connection without drawing
excessive attention.

---

## 6. Processing Steps / Progress on Dark

The upload-to-analyze-to-complete flow needs clear visual hierarchy:

### 6a. Step States

```tsx
// Completed step
<div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center">
  <Check size={12} className="text-emerald-400" />
</div>

// Active step (currently processing)
<div className="w-5 h-5 rounded-full bg-[#8B7AFF]/15 flex items-center justify-center">
  <Loader2 size={12} className="text-[#8B7AFF] animate-spin" />
</div>

// Waiting step
<div className="w-5 h-5 rounded-full bg-[#1A1918] flex items-center justify-center">
  <Clock size={10} className="text-[#57534E]" />
</div>
```

### 6b. Connecting Line

Add a vertical connecting line between steps for visual flow:

```tsx
<div className="space-y-0">
  {steps.map((step, i) => (
    <div key={i} className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        {/* Icon circle */}
        <StepIcon step={step} />
        {/* Connector line (skip for last step) */}
        {i < steps.length - 1 && (
          <div className={cn(
            'w-px h-5 mt-1',
            step.done ? 'bg-emerald-500/30' : 'bg-[#2A2725]',
          )} />
        )}
      </div>
      <span className={cn(
        'text-sm pt-0.5',
        step.done ? 'text-[#D6D3D1]' : 'text-[#57534E]',
        step.active && 'text-[#F0EDE8]',
      )}>
        {step.label}
      </span>
    </div>
  ))}
</div>
```

### 6c. Processing Card Container

Wrap the entire processing state in a card with a subtle animated border:

```tsx
<div className="rounded-xl border border-[#2A2725] bg-[#151413] p-6
  relative overflow-hidden">
  {/* Subtle animated gradient along top edge */}
  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r
    from-transparent via-[#8B7AFF]/40 to-transparent animate-shimmer" />
  <h3 className="text-sm font-semibold text-[#F0EDE8] mb-5">
    Analyzing document...
  </h3>
  <ProcessingSteps status={status} />
  <p className="text-[10px] text-[#57534E] mt-5">
    This usually takes 15-30 seconds
  </p>
</div>
```

---

## 7. Document Preview & PDF Viewer on Dark

### 7a. Embedded PDF Viewer

For viewing uploaded PDFs, use an iframe with dark chrome:

```tsx
<div className="rounded-xl border border-[#2A2725] bg-[#0C0B0A] overflow-hidden">
  {/* Toolbar */}
  <div className="flex items-center justify-between px-4 py-2 bg-[#151413]
    border-b border-[#2A2725]">
    <span className="text-xs text-[#78716C] truncate">{filename}</span>
    <div className="flex gap-2">
      <button className="text-[#78716C] hover:text-[#F0EDE8] transition-colors">
        <Download size={14} />
      </button>
      <button className="text-[#78716C] hover:text-[#F0EDE8] transition-colors">
        <Maximize2 size={14} />
      </button>
    </div>
  </div>
  {/* PDF content area */}
  <div className="aspect-[8.5/11] bg-[#0C0B0A] flex items-center justify-center">
    <iframe src={presignedUrl} className="w-full h-full" />
  </div>
</div>
```

The dark chrome around a light PDF document creates a natural "viewport" effect,
similar to how Figma and design tools display white canvases on dark backgrounds.

### 7b. Image Preview

For uploaded PNG/JPG documents, display on a slightly elevated surface:

```tsx
<div className="rounded-xl border border-[#2A2725] bg-[#151413] p-4">
  <img
    src={presignedUrl}
    alt={filename}
    className="rounded-lg max-h-[600px] w-auto mx-auto shadow-lg"
  />
</div>
```

---

## 8. Export Button: Preview Before Download

### 8a. The Case for Preview

Users should see what the PDF looks like before committing to download. This
builds confidence and reduces frustration (no "download, open, realize it looks
wrong, try again" loops). Premium tools like Stripe and Linear show previews.

### 8b. Implementation Pattern

```tsx
function ExportButton({ deal }: { deal: DealResponse }) {
  const [showPreview, setShowPreview] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 border-[#2A2725] text-[#D6D3D1]
          hover:border-[#8B7AFF]/40 hover:text-[#F0EDE8]"
        onClick={() => setShowPreview(true)}
      >
        <FileDown size={14} />
        Export PDF
      </Button>

      {showPreview && (
        <PDFPreviewModal
          deal={deal}
          onClose={() => setShowPreview(false)}
          onDownload={() => {
            generateDealReport(deal)
            setShowPreview(false)
          }}
        />
      )}
    </>
  )
}
```

### 8c. Preview Modal

Use a full-screen modal with dark backdrop. Generate the PDF as a blob URL and
display it in an iframe:

```tsx
function PDFPreviewModal({ deal, onClose, onDownload }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  useEffect(() => {
    const doc = generateDealReportBlob(deal) // return doc.output('bloburl')
    setBlobUrl(doc)
    return () => { if (doc) URL.revokeObjectURL(doc) }
  }, [deal])

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm
      flex items-center justify-center p-6">
      <div className="bg-[#151413] rounded-2xl border border-[#2A2725]
        w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3
          border-b border-[#2A2725]">
          <h2 className="text-sm font-semibold text-[#F0EDE8]">
            Report Preview
          </h2>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" className="bg-[#8B7AFF] hover:bg-[#7B6AEF]"
              onClick={onDownload}>
              <Download size={14} className="mr-1.5" />
              Download
            </Button>
          </div>
        </div>
        {/* Preview */}
        <div className="flex-1 overflow-auto p-6 bg-[#0C0B0A]">
          {blobUrl ? (
            <iframe src={blobUrl} className="w-full h-[800px] rounded-lg" />
          ) : (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="text-[#8B7AFF] animate-spin" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

## 9. Document Metadata Display on Dark

### 9a. Metadata Row Pattern

For displaying metadata (upload date, file size, document type, page count):

```tsx
<div className="flex flex-wrap gap-x-4 gap-y-1">
  <MetaItem label="Uploaded" value={formatRelativeDate(doc.created_at)} />
  <MetaItem label="Size" value={formatFileSize(doc.file_size_bytes)} />
  <MetaItem label="Type" value={formatDocumentType(doc.document_type)} />
  {doc.page_count && <MetaItem label="Pages" value={doc.page_count} />}
</div>

function MetaItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-[#57534E] uppercase tracking-[0.08em]">
        {label}
      </span>
      <span className="text-xs text-[#A8A29E] tabular-nums">{value}</span>
    </div>
  )
}
```

### 9b. Document Type Badge

Use the same pill pattern as strategy badges, with muted dark-safe colors:

```tsx
const DOC_TYPE_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  purchase_agreement: { text: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
  lease:             { text: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20' },
  inspection:        { text: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20' },
  appraisal:         { text: 'text-emerald-400',bg: 'bg-emerald-500/10',border: 'border-emerald-500/20' },
  title:             { text: 'text-rose-400',   bg: 'bg-rose-500/10',   border: 'border-rose-500/20' },
  other:             { text: 'text-[#78716C]',  bg: 'bg-[#1A1918]',     border: 'border-[#2A2725]' },
}
```

---

## 10. Print Considerations

### 10a. Light PDF from Dark UI is Fine

Users universally accept that a dark application produces light printable output.
No adaptation is needed. The mental model is: the app is *my workspace* (dark,
comfortable); the PDF is *a document I share* (professional, standard).

### 10b. CSS Print Media for On-Screen Preview

If Parcel ever adds a browser-based print view (Cmd+P on a deal page), include
print-specific overrides:

```css
@media print {
  body { background: white !important; color: #1a1a1a !important; }
  .no-print { display: none !important; }
  .print-only { display: block !important; }
  * { box-shadow: none !important; text-shadow: none !important; }
}
```

### 10c. jsPDF Quality Settings

For maximum print quality in the generated PDF:
- Use vector shapes (rects, lines) rather than canvas-rendered images
- KPI values at 16pt or larger for clear readability
- Minimum body text at 9pt (Parcel's current 9pt is the safe floor)
- Set `doc.setProperties({ title, subject, author: 'Parcel' })` for metadata

---

## RECOMMENDATIONS FOR PARCEL

1. **Keep PDFs light, refine the accent palette**: Replace INDIGO_600 with a
   print-safe violet (#6D60CC) throughout `pdf-report.ts`. Use warm neutrals
   (stone scale) instead of cool grays for text. Use `#FAFAF9` as page
   background for subtle warmth. This is low effort with high brand payoff.

2. **Add a PDF preview modal before download**: Implement a blob-URL-based
   preview in a dark modal. This eliminates the blind download pattern and
   gives users confidence in what they are sharing with lenders. Generate
   via `doc.output('bloburl')` and display in an iframe.

3. **Dark-adapt the upload zone**: Replace light borders/hover states with
   the `#2A2725` border / `#151413` surface pattern. Add a violet-glow
   drag-active state (`shadow-[0_0_24px_rgba(139,122,255,0.08)]`) for a
   magnetic, responsive feel.

4. **Convert all document cards to dark surfaces**: Replace `bg-white` and
   `border-gray-200` with `bg-[#151413]` / `border-[#2A2725]`. Use
   `#F0EDE8` for primary text, `#78716C` for labels, `#57534E` for tertiary.

5. **Restyle status badges for dark backgrounds**: Switch from light-bg pills
   (`bg-sky-50`) to translucent dark-bg pills (`bg-emerald-500/10 border
   border-emerald-500/20`). The light-bg pills will look like floating
   white rectangles on the dark surface.

6. **Upgrade risk flag severity indicators**: The left-border accent pattern
   gains visual power on dark. Add a subtle colored glow for high-severity
   flags. Keep the pattern but swap text colors to cream/warm-gray.

7. **Add vertical connector lines to processing steps**: Connect the three
   step icons with a thin vertical line that turns emerald as steps complete.
   This creates visual flow and makes progress tangible.

8. **Differentiate file type icons by color**: Use muted color hints on
   the `FileText` icon (red for PDF, blue for DOCX, green for images) to
   aid scanability in the document list without adding visual noise.

9. **Embed Inter font in PDF reports (Pro tier)**: For Pro subscribers,
   embed Inter-Regular and Inter-SemiBold via `doc.addFont()`. This creates
   exact brand consistency between the app and its exports. Keep Helvetica
   as the fallback for free-tier reports to manage bundle size.

10. **Set PDF metadata properties**: Call `doc.setProperties()` with title
    (deal address), subject ("Deal Analysis Report"), author ("Parcel"),
    and creator fields. This makes PDFs searchable and professional when
    opened in document management systems.
