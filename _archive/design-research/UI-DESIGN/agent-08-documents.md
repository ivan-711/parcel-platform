# Agent 08 — Documents Page (Light Theme)

Design spec for Parcel's document management experience. Covers the document
list grid, drag-and-drop upload, document detail with AI analysis panel,
risk flag cards, empty states, mobile adaptations, and paywall gating for
Free users. All specs target the light theme: white cards on `#F8FAFC`
page background, slate grays, indigo accents, JetBrains Mono for financial
numbers.

---

## 1. Document List: Card Grid

### Layout

The current implementation uses a narrow 320px left-panel list. The light
theme redesign switches to a full-page card grid as the primary view, with
the detail panel opening as a slide-over or replacing the grid on selection.
This gives documents visual weight and makes the AI analysis status
immediately scannable.

```
+---------------------------------------------------------------+
| Documents                              [Upload] [Search]      |
+---------------------------------------------------------------+
| Upload zone (dashed, full width)                              |
+---------------------------------------------------------------+
| [Card] [Card] [Card]                                          |
| [Card] [Card] [Card]                                          |
| [Card] [Card]                                                 |
+---------------------------------------------------------------+
| Pagination: < Previous  Page 1 of 3  Next >                  |
+---------------------------------------------------------------+
```

### Grid Responsive Breakpoints

```
grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4
```

- **Desktop (>= 1024px):** 3 columns, 16px gap
- **Tablet (640px - 1023px):** 2 columns, 16px gap
- **Mobile (< 640px):** Single column stack

### Page Container

```tsx
<div className="min-h-full bg-[#F8FAFC]">
  <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
    {/* Page header */}
    {/* Upload zone */}
    {/* Document grid */}
    {/* Pagination */}
  </div>
</div>
```

### Page Header

```tsx
<div className="flex items-center justify-between gap-4">
  <div>
    <h1 className="text-lg font-semibold text-slate-900">Documents</h1>
    <p className="text-sm text-slate-500 mt-0.5">
      Upload contracts, leases, and disclosures for AI analysis
    </p>
  </div>
  <div className="flex items-center gap-2">
    {/* Search input */}
    <div className="relative">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        placeholder="Search documents..."
        className="pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg
                   placeholder:text-slate-400 text-slate-700
                   focus:outline-none focus:ring-2 focus:ring-indigo-500/20
                   focus:border-indigo-300 transition-colors w-48 lg:w-64"
      />
    </div>
    {/* Upload button (visible when upload zone is collapsed/scrolled past) */}
    <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg
                       bg-indigo-500 hover:bg-indigo-600 text-white text-sm
                       font-medium transition-colors shadow-sm">
      <Upload size={14} />
      Upload
    </button>
  </div>
</div>
```

---

## 2. Document Card

Each document renders as an interactive card showing file type icon, filename,
upload date, and AI analysis status.

### Card Structure

```tsx
<button
  onClick={() => onSelect(doc.id)}
  className={cn(
    "group w-full text-left bg-white rounded-xl p-4",
    "border border-slate-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
    "hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:border-slate-300/80",
    "transition-all duration-150 cursor-pointer",
    isSelected && "border-indigo-500 ring-2 ring-indigo-500/15 shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
  )}
>
  {/* File type icon */}
  <div className={cn(
    "w-10 h-10 rounded-lg flex items-center justify-center mb-3",
    fileTypeStyles[doc.file_type]?.bg ?? "bg-slate-100"
  )}>
    <FileTypeIcon
      type={doc.file_type}
      className={cn("w-5 h-5", fileTypeStyles[doc.file_type]?.text ?? "text-slate-500")}
    />
  </div>

  {/* File name */}
  <p className="text-sm font-medium text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
    {doc.original_filename}
  </p>

  {/* Meta row: date + analysis status */}
  <div className="flex items-center justify-between mt-2">
    <span className="text-xs text-slate-500">
      {formatRelativeDate(doc.created_at)}
    </span>
    <AnalysisStatusBadge status={doc.status} />
  </div>

  {/* Document type tag (if analysis is complete) */}
  {doc.document_type && (
    <div className="mt-2.5">
      <span className="inline-flex items-center px-2 py-0.5 rounded-full
                       bg-indigo-50 text-indigo-700 text-[10px] font-medium uppercase tracking-wide">
        {formatDocumentType(doc.document_type)}
      </span>
    </div>
  )}
</button>
```

### File Type Icon Styles

Map file extensions to distinct icon backgrounds. This makes the grid
visually scannable by file type at a glance.

```ts
const fileTypeStyles: Record<string, { bg: string; text: string }> = {
  'application/pdf':  { bg: 'bg-red-50',    text: 'text-red-500' },
  'image/png':        { bg: 'bg-emerald-50', text: 'text-emerald-500' },
  'image/jpeg':       { bg: 'bg-amber-50',  text: 'text-amber-500' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                      { bg: 'bg-blue-50',   text: 'text-blue-500' },
}
```

Icons from Lucide:
- PDF: `FileText`
- DOCX: `FileType`
- PNG/JPG: `Image`
- Fallback: `File`

### Analysis Status Badge

Three states with color-coded pills:

```tsx
function AnalysisStatusBadge({ status }: { status: DocumentListItem['status'] }) {
  if (status === 'complete') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium
                       text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Analyzed
      </span>
    )
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium
                       text-red-700 bg-red-50 rounded-full px-2 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        Failed
      </span>
    )
  }
  // pending | processing
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium
                     text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
      Analyzing
    </span>
  )
}
```

Key changes from dark theme:
- Bare colored text (`text-emerald-400`) becomes tinted pill badges
  (`bg-emerald-50 text-emerald-700`). Bare color lacks contrast on white.
- Status dot colors shift from 400 to 500 for WCAG visibility on light bg.

### Card Skeleton (Loading)

```tsx
<div className="bg-white rounded-xl border border-slate-200/60
                shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-4 space-y-3">
  <div className="w-10 h-10 rounded-lg bg-slate-100 animate-pulse" />
  <div className="h-4 w-3/4 rounded bg-slate-100 animate-pulse" />
  <div className="flex justify-between">
    <div className="h-3 w-20 rounded bg-slate-100 animate-pulse" />
    <div className="h-3 w-16 rounded bg-slate-100 animate-pulse" />
  </div>
</div>
```

Three skeleton cards per row during initial load. Uses `bg-slate-100
animate-pulse` -- no indigo shimmer gradient. Indigo shimmer is reserved
for the AI processing indicator only.

---

## 3. Upload Zone: Drag-and-Drop

### Default State

Full-width dashed border zone sitting above the document grid. Compact by
default (single row), expands on drag-over.

```tsx
<div
  {...getRootProps()}
  className={cn(
    "relative border-2 border-dashed rounded-xl transition-all duration-200",
    "bg-white cursor-pointer group",
    isDragActive
      ? "border-indigo-400 bg-indigo-50/50 shadow-[0_0_0_4px_rgba(99,102,241,0.08)]"
      : "border-slate-300 hover:border-slate-400 hover:bg-slate-50/50",
    isUploading && "pointer-events-none opacity-60"
  )}
>
  <input {...getInputProps()} />
  <div className={cn(
    "flex items-center justify-center gap-4 transition-all",
    isDragActive ? "py-10" : "py-5"
  )}>
    {/* Icon container */}
    <div className={cn(
      "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
      isDragActive ? "bg-indigo-100" : "bg-slate-100 group-hover:bg-slate-200/70"
    )}>
      <Upload size={18} className={cn(
        "transition-colors",
        isDragActive ? "text-indigo-500" : "text-slate-400 group-hover:text-slate-500"
      )} />
    </div>

    {/* Text */}
    <div className="text-left">
      <p className="text-sm text-slate-700 font-medium">
        {isDragActive
          ? "Drop file to upload"
          : <>Drag & drop a file, or <span className="text-indigo-500 underline underline-offset-2">browse</span></>
        }
      </p>
      <p className="text-xs text-slate-400 mt-0.5">
        PDF, DOCX, PNG, JPG -- max 10 MB
      </p>
    </div>
  </div>
</div>
```

Key design decisions:
- **`border-2`** not `border`: dashed borders need 2px to read on light
  backgrounds. At 1px the dashes become invisible.
- **Drag-active ring**: `shadow-[0_0_0_4px_rgba(99,102,241,0.08)]` adds an
  indigo glow around the zone, matching the selected card pattern.
- **Expand on drag**: `py-5` to `py-10` creates a larger drop target when
  the user is actively dragging.
- **"browse" link text**: Underlined indigo text cues that the zone is also
  clickable, not drag-only.

### Uploading State (Progress Bar)

When a file is being uploaded and processed, the zone transforms into a
progress indicator.

```tsx
{isUploading && (
  <div className="border-2 border-dashed border-indigo-200 rounded-xl bg-indigo-50/30 p-5">
    <div className="flex items-center gap-4">
      {/* File info */}
      <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
        <Loader2 size={18} className="text-indigo-500 animate-spin" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700 truncate">
          {uploadingFile.name}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">Uploading...</p>

        {/* Progress bar */}
        <div className="mt-2 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  </div>
)}
```

Progress bar anatomy:
- Track: `h-1.5 bg-slate-200 rounded-full`
- Fill: `bg-indigo-500 rounded-full` with CSS `width` transition
- If upload progress is not available from the API (current implementation
  uses a single mutation), use an indeterminate animation:

```tsx
{/* Indeterminate progress */}
<div className="mt-2 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
  <div className="h-full w-1/3 bg-indigo-500 rounded-full animate-[indeterminate_1.5s_ease-in-out_infinite]" />
</div>
```

Add to `index.css`:
```css
@keyframes indeterminate {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(400%); }
}
```

---

## 4. Document Detail: Preview + AI Analysis Panel

When a user selects a document from the grid, the detail view opens. On
desktop this is a right slide-over panel; on mobile it replaces the grid
entirely.

### Desktop Layout: Grid + Slide-Over Panel

```
+-------------------------------------+----------------------------+
| Document Grid (shrinks)             | Detail Panel (480px)       |
| [Card] [Card]                       | [Header card]              |
| [Card] [Card]                       | [AI Summary card]          |
|                                     | [Risk Flags card]          |
|                                     | [Extracted Numbers card]   |
|                                     | [Key Terms card]           |
+-------------------------------------+----------------------------+
```

```tsx
<div className="flex h-full">
  {/* Grid area — shrinks when panel open */}
  <div className={cn(
    "flex-1 min-w-0 overflow-y-auto transition-all duration-200",
    selectedId ? "hidden lg:block" : "block"
  )}>
    {/* Upload zone + card grid + pagination */}
  </div>

  {/* Detail panel — slides in from right */}
  <AnimatePresence>
    {selectedId && (
      <motion.aside
        initial={{ x: 480, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 480, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full lg:w-[480px] lg:shrink-0 border-l border-slate-200
                   bg-[#F8FAFC] overflow-y-auto"
      >
        <div className="p-5 space-y-4">
          <DetailPanelContent ... />
        </div>
      </motion.aside>
    )}
  </AnimatePresence>
</div>
```

Panel enters with a spring animation (`damping: 25, stiffness: 300`) --
snappy but not abrupt. Matches the animation system spec for slide-overs.

### Detail Panel: Header Card

```tsx
<div className="bg-white rounded-xl border border-slate-200/60
                shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-5">
  {/* Close / back button */}
  <div className="flex items-center justify-between mb-4">
    <button
      onClick={onClose}
      className="inline-flex items-center gap-1 text-sm text-slate-500
                 hover:text-slate-700 transition-colors"
    >
      <ChevronLeft size={16} />
      Back
    </button>
    <div className="flex items-center gap-1.5">
      {doc.presigned_url && (
        <a href={doc.presigned_url} target="_blank" rel="noopener noreferrer">
          <button className="p-2 rounded-lg text-slate-400 hover:text-slate-600
                             hover:bg-slate-100 transition-colors">
            <Download size={16} />
          </button>
        </a>
      )}
      <button
        onClick={() => navigate(`/chat?context=document&id=${doc.id}`)}
        className="p-2 rounded-lg text-slate-400 hover:text-slate-600
                   hover:bg-slate-100 transition-colors"
      >
        <MessageSquare size={16} />
      </button>
      <button
        onClick={onDelete}
        className="p-2 rounded-lg text-slate-400 hover:text-red-500
                   hover:bg-red-50 transition-colors"
      >
        <Trash2 size={16} />
      </button>
    </div>
  </div>

  {/* File info */}
  <div className="flex items-start gap-3">
    <div className={cn(
      "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
      fileTypeStyles[doc.file_type]?.bg ?? "bg-slate-100"
    )}>
      <FileTypeIcon type={doc.file_type} className={cn(
        "w-6 h-6",
        fileTypeStyles[doc.file_type]?.text ?? "text-slate-500"
      )} />
    </div>
    <div className="min-w-0 flex-1">
      <h2 className="text-base font-semibold text-slate-900 line-clamp-2">
        {doc.original_filename}
      </h2>
      <div className="flex items-center gap-2 mt-1 flex-wrap">
        {doc.document_type && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full
                           bg-indigo-50 text-indigo-700 text-[10px] font-medium
                           uppercase tracking-wide">
            {formatDocumentType(doc.document_type)}
          </span>
        )}
        <span className="text-xs text-slate-500 font-mono">
          {formatFileSize(doc.file_size_bytes)}
        </span>
        <span className="text-xs text-slate-400">
          {new Date(doc.created_at).toLocaleDateString()}
        </span>
      </div>
    </div>
  </div>
</div>
```

### Detail Panel: Processing State

When the document is still being analyzed, show a centered processing card
inside the detail panel.

```tsx
<div className="bg-white rounded-xl border border-slate-200/60
                shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-6">
  <h3 className="text-sm font-semibold text-slate-900 mb-4">
    Analyzing document...
  </h3>
  <ProcessingSteps status={doc.status} />
  <p className="text-[10px] text-slate-400 mt-4">
    This usually takes 15-30 seconds
  </p>
</div>
```

Processing step icon colors (light theme adaptation):
- **Done**: `bg-emerald-100` container, `text-emerald-600` check icon
- **Active**: `bg-indigo-100` container, `text-indigo-500` spinner
- **Waiting**: `bg-slate-100` container, `text-slate-400` clock icon
- Step text: done = `text-slate-600`, active = `text-slate-900`, waiting = `text-slate-400`

---

## 5. AI Analysis Panel Sections

All analysis sections are stacked cards within the detail panel. Each card
uses the base card pattern from agent-05:

```
bg-white rounded-xl border border-slate-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.04)]
```

### 5a. AI Summary

A dark emphasis card (per agent-05 Section 5). Maximum one dark card per
page -- the AI summary gets it because it is the highest-value content.

```tsx
<div className="bg-slate-900 rounded-xl p-5">
  <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.08em] mb-2">
    AI Summary
  </h3>
  <p className="text-sm text-slate-200 leading-relaxed">
    {doc.ai_summary}
  </p>

  {/* Parties */}
  {doc.parties.length > 0 && (
    <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t border-slate-700/50">
      <span className="text-[10px] text-slate-500 uppercase tracking-wide mr-1 self-center">
        Parties
      </span>
      {doc.parties.map((party, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded-full
                     bg-slate-800 px-2.5 py-0.5 text-[11px] text-slate-300"
        >
          {party.name}
          <span className="text-slate-500">({party.role})</span>
        </span>
      ))}
    </div>
  )}
</div>
```

### 5b. Document Type

Displayed as a badge in the header card (see Section 4 header card), not as
a separate section. Types include: Purchase Agreement, Lease, Disclosure,
Title Report, Inspection Report, etc. Formatted via `formatDocumentType()`.

### 5c. Parties

Displayed inline within the AI Summary dark card (see 5a). Each party
renders as a pill showing name and role. This avoids a separate low-value
card and keeps the summary contextually complete.

### 5d. Key Terms

```tsx
<div className="bg-white rounded-xl border border-slate-200/60
                shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-5">
  <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.08em] mb-3">
    Key Terms
  </h3>
  <ul className="space-y-2">
    {visibleTerms.map((term, i) => (
      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
        <span className="text-indigo-400 mt-1 shrink-0">&#8226;</span>
        {term}
      </li>
    ))}
  </ul>

  {/* Show more toggle */}
  {doc.key_terms.length > 8 && (
    <button
      onClick={() => setShowAll(!showAll)}
      className="flex items-center gap-1 mt-3 text-xs text-indigo-500
                 hover:text-indigo-600 font-medium transition-colors"
    >
      {showAll ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      {showAll ? 'Show less' : `Show all ${doc.key_terms.length} terms`}
    </button>
  )}
</div>
```

### 5e. Extracted Numbers

Financial figures use JetBrains Mono. Two-column grid for density.

```tsx
<div className="bg-white rounded-xl border border-slate-200/60
                shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-5">
  <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.08em] mb-3">
    Extracted Numbers
  </h3>
  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
    {numbers.map(([key, value]) => (
      <div key={key} className="flex flex-col">
        <span className="text-[10px] text-slate-400 uppercase tracking-[0.08em]">
          {formatLabel(key)}
        </span>
        <span className="font-mono text-sm font-medium text-slate-900 mt-0.5">
          {isCurrencyKey(key) ? formatCurrency(value) : value.toLocaleString()}
        </span>
      </div>
    ))}
  </div>
</div>
```

---

## 6. Risk Flag Cards

Risk flags are the most critical analysis output. Each flag needs to
communicate severity at a glance.

### Risk Flags Section

```tsx
<div className="bg-white rounded-xl border border-slate-200/60
                shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-5">
  <div className="flex items-center justify-between mb-3">
    <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.08em]">
      Risk Flags
    </h3>
    <span className="text-[10px] font-mono text-slate-400">
      {doc.risk_flags.length} found
    </span>
  </div>

  <div className="space-y-3">
    {doc.risk_flags.map((flag, i) => (
      <RiskFlagCard key={i} flag={flag} />
    ))}
  </div>
</div>
```

### Individual Risk Flag Card

Each flag is a mini-card within the section, differentiated by severity.

```tsx
function RiskFlagCard({ flag }: { flag: RiskFlag }) {
  return (
    <div className={cn(
      "rounded-lg p-3 border-l-[3px]",
      flag.severity === 'high'   && "bg-red-50/60 border-l-red-500",
      flag.severity === 'medium' && "bg-amber-50/60 border-l-amber-500",
      flag.severity === 'low'    && "bg-blue-50/60 border-l-blue-500",
    )}>
      <div className="flex items-start gap-2.5">
        {/* Severity icon */}
        <div className={cn(
          "w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5",
          flag.severity === 'high'   && "bg-red-100",
          flag.severity === 'medium' && "bg-amber-100",
          flag.severity === 'low'    && "bg-blue-100",
        )}>
          {flag.severity === 'high' && (
            <AlertTriangle size={13} className="text-red-600" />
          )}
          {flag.severity === 'medium' && (
            <AlertCircle size={13} className="text-amber-600" />
          )}
          {flag.severity === 'low' && (
            <Info size={13} className="text-blue-600" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          {/* Severity badge + description */}
          <div className="flex items-center gap-2 mb-1">
            <SeverityBadge severity={flag.severity} />
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">
            {flag.description}
          </p>

          {/* Quoted text from document */}
          {flag.quote && (
            <blockquote className="mt-2 pl-3 border-l-2 border-slate-200
                                   text-xs text-slate-500 italic leading-relaxed">
              "{flag.quote}"
            </blockquote>
          )}
        </div>
      </div>
    </div>
  )
}
```

### Severity Badge

```tsx
function SeverityBadge({ severity }: { severity: 'high' | 'medium' | 'low' }) {
  const styles = {
    high:   'bg-red-100 text-red-700',
    medium: 'bg-amber-100 text-amber-700',
    low:    'bg-blue-100 text-blue-700',
  }
  const labels = {
    high:   'High Risk',
    medium: 'Medium Risk',
    low:    'Low Risk',
  }

  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide",
      styles[severity]
    )}>
      {labels[severity]}
    </span>
  )
}
```

### Risk Flag Visual Hierarchy

The left border accent (`border-l-[3px]`) is the primary severity signal.
This is a Mercury/Stripe pattern for inline alerts:

| Severity | Left border    | Background     | Icon             | Badge              |
|----------|---------------|----------------|------------------|--------------------|
| High     | `red-500`     | `red-50/60`    | `AlertTriangle`  | `bg-red-100 text-red-700` |
| Medium   | `amber-500`   | `amber-50/60`  | `AlertCircle`    | `bg-amber-100 text-amber-700` |
| Low      | `blue-500`    | `blue-50/60`   | `Info`           | `bg-blue-100 text-blue-700` |

Why blue for "low" instead of green: green implies "good" or "safe." Low
risk is still a risk worth noting. Blue is neutral-informational and
prevents users from ignoring low flags.

---

## 7. Empty State

When no documents have been uploaded, the grid area is replaced by a
centered empty state that doubles as an upload prompt.

```tsx
<div className="bg-white rounded-xl border border-slate-200/60
                shadow-[0_1px_2px_rgba(0,0,0,0.04)]
                flex flex-col items-center justify-center py-20 px-6 text-center">
  {/* Icon container */}
  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
    <FileSearch size={24} className="text-slate-400" />
  </div>

  {/* Headline */}
  <h3 className="text-base font-semibold text-slate-900">
    No documents yet
  </h3>

  {/* Description */}
  <p className="text-sm text-slate-500 mt-1.5 max-w-sm leading-relaxed">
    Upload purchase agreements, leases, inspection reports, or any real estate
    document. Our AI will extract key terms, identify parties, and flag risks.
  </p>

  {/* Upload zone (inline) */}
  <div className="mt-6 w-full max-w-md">
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all",
        isDragActive
          ? "border-indigo-400 bg-indigo-50/50"
          : "border-slate-300 hover:border-indigo-300 hover:bg-slate-50/50"
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-2">
        <Upload size={20} className={cn(
          "transition-colors",
          isDragActive ? "text-indigo-500" : "text-slate-400"
        )} />
        <p className="text-sm text-slate-600">
          Drag & drop or <span className="text-indigo-500 font-medium">browse files</span>
        </p>
        <p className="text-xs text-slate-400">PDF, DOCX, PNG, JPG -- max 10 MB</p>
      </div>
    </div>
  </div>
</div>
```

The empty state includes an embedded upload zone rather than just a button.
This reduces clicks-to-value from 2 (click button, then pick file) to 1
(drop or click directly on the zone).

---

## 8. Mobile Adaptations

### Grid to List

On mobile (< 640px), the 3-column grid collapses to a single-column stack.
Cards render at full width with the same content. The grid utility
`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` handles this automatically.

### Detail View: Full-Screen Takeover

When a document is selected on mobile, the grid is hidden and the detail
panel fills the screen. A prominent back button returns to the grid.

```tsx
{/* Mobile: show detail full-screen when selected */}
<div className={cn(
  selectedId ? "block" : "hidden",
  "lg:hidden fixed inset-0 z-40 bg-[#F8FAFC] overflow-y-auto"
)}>
  <div className="px-4 py-4 space-y-4">
    <button
      onClick={onClearSelection}
      className="inline-flex items-center gap-1 text-sm text-slate-500
                 hover:text-slate-700 transition-colors"
    >
      <ChevronLeft size={16} />
      All Documents
    </button>
    <DetailPanelContent ... />
  </div>
</div>
```

### Upload: Camera + Files

Mobile upload zone adds a camera option for photographing physical
documents. The file input accepts camera capture:

```tsx
<input
  {...getInputProps()}
  capture="environment"
  accept="image/*,application/pdf,.docx"
/>
```

Add a visual cue for the camera option on mobile:

```tsx
<div className="flex flex-col items-center gap-2">
  <div className="flex items-center gap-3">
    <div className="flex flex-col items-center">
      <Camera size={18} className="text-slate-400" />
      <span className="text-[10px] text-slate-400 mt-1">Camera</span>
    </div>
    <span className="text-slate-300">|</span>
    <div className="flex flex-col items-center">
      <Upload size={18} className="text-slate-400" />
      <span className="text-[10px] text-slate-400 mt-1">Files</span>
    </div>
  </div>
  <p className="text-xs text-slate-400">PDF, DOCX, PNG, JPG -- max 10 MB</p>
</div>
```

This layout only renders below `sm:` breakpoint. Desktop continues to show
the standard single upload icon.

### Mobile Pagination

Pagination controls at the bottom of the mobile list use full-width buttons
for easier tap targets:

```tsx
<div className="flex items-center justify-between gap-3 px-4 py-3
                border-t border-slate-200 bg-white sm:px-0 sm:bg-transparent">
  <button className="flex-1 flex items-center justify-center gap-1
                     px-3 py-2.5 rounded-lg border border-slate-200
                     text-sm text-slate-600 hover:bg-slate-50 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed">
    <ChevronLeft size={14} />
    Previous
  </button>
  <span className="text-xs text-slate-400 font-mono shrink-0">
    {page}/{pages}
  </span>
  <button className="flex-1 flex items-center justify-center gap-1
                     px-3 py-2.5 rounded-lg border border-slate-200
                     text-sm text-slate-600 hover:bg-slate-50 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed">
    Next
    <ChevronRight size={14} />
  </button>
</div>
```

---

## 9. Paywall for Free Users

Free-tier users have limited document uploads (e.g., 3 documents). Once the
limit is reached, the upload zone is replaced by a paywall card and existing
documents remain viewable but new uploads are blocked.

### Usage Counter

Show remaining uploads in the page header, visible only for Free users:

```tsx
{plan === 'free' && (
  <div className="flex items-center gap-2 text-xs text-slate-500">
    <span className="font-mono">
      {remaining}
      <span className="text-slate-400">/{limit}</span>
    </span>
    <span>documents remaining</span>
  </div>
)}
```

### Locked Upload Zone (At Limit)

When the user has no remaining uploads, replace the upload zone:

```tsx
{remaining <= 0 ? (
  <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200
                  rounded-xl p-6 text-center space-y-3">
    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mx-auto">
      <Lock size={18} className="text-indigo-500" />
    </div>
    <div>
      <h4 className="text-sm font-semibold text-slate-900">
        Document limit reached
      </h4>
      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
        Free accounts can upload up to {limit} documents. Upgrade to Pro for
        unlimited uploads and AI analysis.
      </p>
    </div>
    <button className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600
                       text-white text-sm font-medium rounded-xl
                       transition-colors shadow-sm">
      Upgrade to Pro
    </button>
    <p className="text-[11px] text-slate-400">
      Starting at $29/mo
    </p>
  </div>
) : (
  <UploadZone ... />
)}
```

This follows the exact paywall card pattern from agent-07-chat: gradient
background (`from-indigo-50 to-violet-50`), indigo border, lock icon in
a tinted circle, centered layout.

### Approaching Limit Warning

When the user has 1 upload remaining, show a subtle warning below the
upload zone:

```tsx
{remaining === 1 && (
  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50
                  border border-amber-200 text-xs text-amber-700">
    <AlertCircle size={14} className="shrink-0" />
    <span>Last free upload. <button className="font-medium underline underline-offset-2">Upgrade to Pro</button> for unlimited.</span>
  </div>
)}
```

---

## CRITICAL DECISIONS

### 1. Full-page grid replaces sidebar list

The current two-panel layout (320px list + detail) wastes space and makes
documents feel like a secondary feature. The card grid gives each document
visual presence and makes the analysis status badge scannable at a glance.
The detail panel slides over as needed rather than permanently consuming
layout real estate. This matches the pattern users expect from modern
document management (Notion, Google Drive, Dropbox).

### 2. Dark card for AI Summary, white cards for everything else

The AI summary is the single highest-value output of document analysis. It
gets the `bg-slate-900` dark card treatment (per agent-05 Section 5) to
visually separate it from the structured data cards below. Maximum one dark
card per page. Key terms, extracted numbers, and risk flags use standard
white cards so the summary stands as the visual anchor.

### 3. Risk flags use left-border accent, not full-colored cards

Full-colored backgrounds (e.g., `bg-red-100` for the entire card) would
compete visually with the AI summary and create overwhelming color blocks
when multiple high-severity flags exist. The left-border accent (`border-l-[3px]`)
is a subtler signal that scales well: five high flags in a row look serious
but not chaotic. Background tint at `/60` opacity provides just enough
color to reinforce the border without dominating.

### 4. Severity color mapping: red / amber / blue (not red / yellow / green)

Green for "low risk" implies safety. Low-risk flags are still actionable
items that should not be dismissed. Blue is neutral-informational and avoids
the "green means good" misread. This is the Stripe Risk Radar pattern.

### 5. Tinted pill badges replace bare colored text

Every status indicator (analysis status, document type, severity) uses a
tinted pill (`bg-{color}-50 text-{color}-700`) instead of bare colored
text. On a `#F8FAFC` background, bare colored text below 700-weight lacks
sufficient contrast for WCAG AA. The tinted pill background creates a
contained, legible label regardless of surrounding content.

### 6. Upload zone uses border-2 (not border)

Dashed borders at 1px are invisible on light backgrounds. `border-2` makes
the dashes readable while remaining visually light. The drag-active state
adds an indigo ring shadow to provide a large, visible drop target.

### 7. Camera option on mobile only

Mobile users frequently need to photograph physical documents (contracts at
closing tables, inspection reports on-site). The `capture="environment"`
attribute opens the rear camera directly. This option is hidden on desktop
where it serves no purpose and would clutter the interface.

### 8. Paywall follows agent-07 chat pattern exactly

Consistent paywall treatment across features (chat, documents) prevents
user confusion. Same gradient (`from-indigo-50 to-violet-50`), same border
(`border-indigo-200`), same icon treatment (lock in tinted circle), same
CTA button style. The only difference is the copy, which is
feature-specific.

### 9. Detail panel is a slide-over, not a route change

Selecting a document does not navigate to `/documents/:id`. The detail
panel renders inline via component state (`selectedId`). This preserves
scroll position in the grid, enables quick switching between documents, and
avoids unnecessary route transitions. The URL can optionally update via
`replaceState` for shareability without triggering a full navigation.

### 10. Page background is #F8FAFC, not #F9FAFB

The documents page uses `#F8FAFC` (slightly cooler than the `#F9FAFB`
recommended in agent-05 for the general page background). This provides
marginally more contrast against white cards in a grid-heavy layout where
card boundaries must be immediately visible. The difference is 1 step on
the blue channel -- imperceptible in isolation, measurable with 12+ cards
on screen.
