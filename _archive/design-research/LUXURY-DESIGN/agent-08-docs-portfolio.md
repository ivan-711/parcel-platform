# Documents & Portfolio — Luxury Dark Redesign Spec

Design specification for the Documents page (upload, list, processing, AI analysis, detail)
and Portfolio page (KPIs, charts, table, modals) adapted to Parcel's luxury dark system.

**Locked tokens:**
- Background `#0C0B0A` | Surface `#141312` | Elevated `#1E1D1B`
- Text `#F0EDE8` | Secondary `#A09D98` | Accent `#8B7AFF`
- Borders `white/[0.04]` (resolves to ~`#2A2725` on `#0C0B0A`)

---

## 1. Document List (Left Panel)

### 1a. Panel Container

Replace the current `bg-white border-gray-200` left panel with a dark surface:

```
className="w-full md:w-[320px] md:shrink-0 border-r border-white/[0.04] flex flex-col bg-[#141312]"
```

Scrollable area padding stays `p-3 space-y-3`.

### 1b. Document Row

```tsx
<button
  onClick={onSelect}
  className={cn(
    'w-full text-left px-3 py-2.5 rounded-lg transition-all duration-150',
    isSelected
      ? 'bg-[#8B7AFF]/[0.08] border border-[#8B7AFF]/25'
      : 'hover:bg-white/[0.03] border border-transparent',
  )}
>
  <div className="flex items-start gap-2.5">
    <FileTypeIcon filename={doc.original_filename} className="mt-0.5 shrink-0" />
    <div className="min-w-0 flex-1">
      <p className="text-sm text-[#F0EDE8] truncate">{doc.original_filename}</p>
      <div className="flex items-center gap-2 mt-0.5">
        <span className="text-[10px] text-[#57534E] tabular-nums">
          {formatFileSize(doc.file_size_bytes)}
        </span>
        <span className="text-[10px] text-[#57534E] tabular-nums">
          {formatRelativeDate(doc.created_at)}
        </span>
        <StatusBadge status={doc.status} />
      </div>
    </div>
  </div>
</button>
```

Selection state uses violet tint (`bg-[#8B7AFF]/[0.08]`) with a faint violet border,
replacing the old `bg-lime-50 border-lime-300`.

### 1c. File-Type Icon Colors

Differentiate types with muted color on the `FileText` icon (14px):

| Type     | Class                     |
|----------|---------------------------|
| PDF      | `text-red-400/60`         |
| DOCX     | `text-blue-400/60`        |
| PNG/JPG  | `text-emerald-400/60`     |
| Default  | `text-[#57534E]`          |

### 1d. Status Badges (Translucent Dark)

Replace the light-bg pills (`bg-sky-50`, `bg-amber-50`, `bg-red-50`) with translucent dark variants:

**Complete:**
```
className="inline-flex items-center gap-1 text-[10px] font-medium
  text-emerald-400 bg-emerald-500/10 border border-emerald-500/20
  rounded-full px-2 py-0.5"
```
Inner dot: `w-1.5 h-1.5 rounded-full bg-emerald-400`

**Processing:**
```
className="inline-flex items-center gap-1 text-[10px] font-medium
  text-amber-400 bg-amber-500/10 border border-amber-500/20
  rounded-full px-2 py-0.5"
```
Inner dot: `w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse`

**Failed:**
```
className="inline-flex items-center gap-1 text-[10px] font-medium
  text-red-400 bg-red-500/10 border border-red-500/20
  rounded-full px-2 py-0.5"
```
Inner dot: `w-1.5 h-1.5 rounded-full bg-red-500`

### 1e. Date Display

Use relative time for recent ("2h ago", "Yesterday"), absolute for older.
Color: `text-[#57534E] tabular-nums text-[10px]`.

### 1f. Skeleton Loading State

```tsx
<div className="space-y-2 px-1">
  {Array.from({ length: 3 }).map((_, i) => (
    <div key={i} className="px-3 py-2.5 rounded-lg space-y-2">
      <div className="h-3.5 w-4/5 rounded bg-white/[0.04] animate-pulse" />
      <div className="h-2.5 w-2/5 rounded bg-white/[0.04] animate-pulse" />
    </div>
  ))}
</div>
```

### 1g. Pagination Controls

```tsx
<div className="flex items-center justify-between px-3 py-2 border-t border-white/[0.04]">
  <button className={cn(
    'flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs transition-colors',
    'border border-white/[0.04] bg-[#1E1D1B] hover:bg-white/[0.06]',
    'text-[#A09D98]',
    page <= 1 && 'opacity-40 cursor-not-allowed hover:bg-[#1E1D1B]',
  )}>
    <ChevronLeft size={14} /> Previous
  </button>
  <span className="text-xs text-[#57534E]">
    Page <span className="tabular-nums text-[#F0EDE8]">{page}</span> of{' '}
    <span className="tabular-nums text-[#F0EDE8]">{pages}</span>
  </span>
  <button className={cn(
    'flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs transition-colors',
    'border border-white/[0.04] bg-[#1E1D1B] hover:bg-white/[0.06]',
    'text-[#A09D98]',
    page >= pages && 'opacity-40 cursor-not-allowed hover:bg-[#1E1D1B]',
  )}>
    Next <ChevronRight size={14} />
  </button>
</div>
```

---

## 2. Upload Zone

### 2a. Resting State

```tsx
<div
  {...getRootProps()}
  className={cn(
    'border border-dashed rounded-xl p-4 text-center cursor-pointer',
    'transition-all duration-200',
    'border-[#2A2725] bg-[#151413]',
    'hover:border-[#8B7AFF]/40 hover:bg-[#1A1918]',
    isDragActive && 'border-[#8B7AFF] border-solid bg-[#8B7AFF]/[0.05] shadow-[0_0_24px_rgba(139,122,255,0.08)]',
    isUploading && 'pointer-events-none opacity-50',
  )}
>
```

Key changes from current:
- `border-gray-300` becomes `border-[#2A2725]`
- `bg-lime-50` drag-active becomes violet glow + `bg-[#8B7AFF]/[0.05]`
- Border transitions from dashed to solid on drag-active for a "locked on" feel
- Rounded-lg becomes rounded-xl for luxury feel

### 2b. Upload Icon

```tsx
{isDragActive ? (
  <motion.div
    animate={{ y: [0, -3, 0] }}
    transition={{ repeat: Infinity, duration: 1.2 }}
  >
    <ArrowDownToLine size={24} className="text-[#8B7AFF]" />
  </motion.div>
) : isUploading ? (
  <Loader2 size={20} className="text-[#8B7AFF] animate-spin" />
) : (
  <Upload size={20} className="text-[#57534E]" />
)}
```

### 2c. Copy Text

```tsx
<p className="text-xs text-[#A09D98]">
  {isDragActive ? 'Drop file here' : 'Drag & drop or click to upload'}
</p>
<p className="text-[10px] text-[#57534E]">PDF, DOCX, PNG, JPG — max 10 MB</p>
```

### 2d. File Type Pills

```tsx
<div className="flex items-center justify-center gap-1.5 mt-2.5">
  {['PDF', 'DOCX', 'PNG', 'JPG'].map(ext => (
    <span key={ext} className="text-[10px] font-medium text-[#57534E]
      bg-[#1A1918] rounded px-1.5 py-0.5 border border-[#2A2725]">
      {ext}
    </span>
  ))}
</div>
```

### 2e. Uploading State Text

`<p className="text-xs text-[#57534E]">Uploading...</p>`

---

## 3. Processing Steps

### 3a. Step Icon States

**Completed:**
```tsx
<div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center">
  <Check size={12} className="text-emerald-400" />
</div>
```

**Active (processing):**
```tsx
<div className="w-5 h-5 rounded-full bg-[#8B7AFF]/15 flex items-center justify-center">
  <Loader2 size={12} className="text-[#8B7AFF] animate-spin" />
</div>
```

**Waiting:**
```tsx
<div className="w-5 h-5 rounded-full bg-white/[0.04] flex items-center justify-center">
  <Clock size={10} className="text-[#57534E]" />
</div>
```

### 3b. Vertical Connector Lines

Add a thin line between steps that reflects completion state:

```tsx
<div className="space-y-0">
  {steps.map((step, i) => (
    <div key={i} className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <StepIcon step={step} />
        {i < steps.length - 1 && (
          <div className={cn(
            'w-px h-5 mt-1',
            step.done ? 'bg-emerald-500/30' : 'bg-white/[0.06]',
          )} />
        )}
      </div>
      <span className={cn(
        'text-sm pt-0.5',
        step.done && !step.active ? 'text-[#A09D98]' : '',
        step.active ? 'text-[#F0EDE8]' : '',
        !step.done && !step.active ? 'text-[#57534E]' : '',
      )}>
        {step.label}
      </span>
    </div>
  ))}
</div>
```

### 3c. Processing Card Container

Wrap in a dark surface card with an animated violet shimmer along the top edge:

```tsx
<div className="rounded-xl border border-white/[0.04] bg-[#141312] p-6
  w-full max-w-sm relative overflow-hidden">
  {/* Animated top-edge shimmer */}
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

The shimmer keyframe: translate-x from -100% to 100% over 2s, infinite.

---

## 4. AI Analysis Results (Document Detail — Right Panel)

### 4a. Right Panel Background

Replace `bg-gray-50` with `bg-[#0C0B0A]`:

```
className="flex-1 overflow-y-auto p-4 bg-[#0C0B0A]"
```

### 4b. Header Card

```tsx
<div className="rounded-xl border border-white/[0.04] bg-[#141312] p-4">
  <h2 className="text-base font-semibold text-[#F0EDE8] truncate">
    {doc.original_filename}
  </h2>
  <div className="flex items-center gap-2 mt-1 flex-wrap">
    <span className="inline-flex items-center text-[10px] font-medium
      text-[#8B7AFF] bg-[#8B7AFF]/10 border border-[#8B7AFF]/20
      rounded-full px-2 py-0.5">
      {formatDocumentType(doc.document_type)}
    </span>
    <span className="text-xs text-[#57534E] tabular-nums">
      {formatFileSize(doc.file_size_bytes)}
    </span>
    <span className="text-xs text-[#57534E]">
      {new Date(doc.created_at).toLocaleDateString()}
    </span>
  </div>
  <div className="flex items-center gap-2 mt-3">
    <Button variant="outline" size="sm"
      className="h-7 text-xs gap-1.5 border-white/[0.04] text-[#A09D98]
        hover:border-[#8B7AFF]/40 hover:text-[#F0EDE8] bg-transparent">
      <Download size={12} /> Download
    </Button>
    <Button variant="outline" size="sm"
      className="h-7 text-xs gap-1.5 border-white/[0.04] text-[#A09D98]
        hover:border-[#8B7AFF]/40 hover:text-[#F0EDE8] bg-transparent">
      <MessageSquare size={12} /> Chat
    </Button>
    <Button variant="outline" size="sm"
      className="h-7 text-xs gap-1.5 border-white/[0.04] text-red-400/80
        hover:border-red-500/30 hover:text-red-400 bg-transparent">
      <Trash2 size={12} /> Delete
    </Button>
  </div>
</div>
```

### 4c. AI Summary Card

The current code already uses a dark card for the AI summary. Adapt to the token system:

```tsx
<div className="rounded-xl border border-white/[0.04] bg-[#141312] p-5">
  <h3 className="text-[10px] font-semibold text-[#57534E] uppercase
    tracking-[0.1em] mb-2">
    AI Summary
  </h3>
  <p className="text-sm text-[#D6D3D1] leading-relaxed">{doc.ai_summary}</p>
  {/* Party pills */}
  <div className="flex flex-wrap gap-1.5 mt-3">
    {doc.parties.map((party, i) => (
      <span key={i} className="inline-flex items-center gap-1
        rounded-full bg-white/[0.03] border border-white/[0.04]
        px-2.5 py-0.5 text-[10px]">
        <span className="text-[#D6D3D1]">{party.name}</span>
        <span className="text-[#57534E]">({party.role})</span>
      </span>
    ))}
  </div>
</div>
```

### 4d. Risk Flags with Colored Glow

```tsx
<div className="rounded-xl border border-white/[0.04] bg-[#141312] p-5">
  <h3 className="text-[10px] font-semibold text-[#57534E] uppercase
    tracking-[0.1em] mb-3">
    Risk Flags
  </h3>
  <div className="space-y-3">
    {doc.risk_flags.map((flag, i) => {
      const borderColor =
        flag.severity === 'high'   ? 'border-l-red-500'   :
        flag.severity === 'medium' ? 'border-l-amber-500'  :
                                     'border-l-blue-400'
      const glowClass =
        flag.severity === 'high'
          ? 'shadow-[-4px_0_12px_-4px_rgba(239,68,68,0.15)]'
          : ''
      return (
        <div key={i} className={cn(
          'border-l-2 pl-3 py-1', borderColor, glowClass
        )}>
          <p className="text-sm text-[#F0EDE8]">{flag.description}</p>
          <p className="text-xs text-[#57534E] mt-0.5 italic">
            "{flag.quote}"
          </p>
        </div>
      )
    })}
  </div>
</div>
```

High-severity flags get a subtle red glow from the left border.

### 4e. Extracted Numbers Grid

```tsx
<div className="rounded-xl border border-white/[0.04] bg-[#141312] p-5">
  <h3 className="text-[10px] font-semibold text-[#57534E] uppercase
    tracking-[0.1em] mb-3">
    Extracted Numbers
  </h3>
  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
    {numbers.map(([key, value]) => (
      <div key={key} className="flex flex-col gap-0.5">
        <span className="text-[10px] text-[#57534E] uppercase tracking-[0.08em]">
          {formatLabel(key)}
        </span>
        <span className="text-sm text-[#F0EDE8] tabular-nums font-medium">
          {formatValue(key, value)}
        </span>
      </div>
    ))}
  </div>
</div>
```

### 4f. Key Terms List

Replace bullet dots with violet-tinted dots:

```tsx
<div className="rounded-xl border border-white/[0.04] bg-[#141312] p-5">
  <h3 className="text-[10px] font-semibold text-[#57534E] uppercase
    tracking-[0.1em] mb-3">
    Key Terms
  </h3>
  <ul className="space-y-1.5">
    {visibleTerms.map((term, i) => (
      <li key={i} className="flex items-start gap-2.5 text-sm text-[#D6D3D1]">
        <span className="w-1 h-1 rounded-full bg-[#8B7AFF]/50 mt-2 shrink-0" />
        {term}
      </li>
    ))}
  </ul>
  {doc.key_terms.length > 8 && (
    <button className="flex items-center gap-1 mt-2 text-xs
      text-[#8B7AFF] hover:text-[#8B7AFF]/80 transition-colors">
      {showAllTerms ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      {showAllTerms ? 'Show less' : `Show all ${doc.key_terms.length} terms`}
    </button>
  )}
</div>
```

---

## 5. Document Detail — Viewer Frame & Metadata Sidebar

### 5a. PDF/Image Viewer Frame

```tsx
<div className="rounded-xl border border-white/[0.04] bg-[#0C0B0A] overflow-hidden">
  {/* Toolbar */}
  <div className="flex items-center justify-between px-4 py-2 bg-[#141312]
    border-b border-white/[0.04]">
    <span className="text-xs text-[#57534E] truncate">{filename}</span>
    <div className="flex gap-2">
      <button className="text-[#57534E] hover:text-[#F0EDE8] transition-colors">
        <Download size={14} />
      </button>
      <button className="text-[#57534E] hover:text-[#F0EDE8] transition-colors">
        <Maximize2 size={14} />
      </button>
    </div>
  </div>
  <div className="aspect-[8.5/11] bg-[#0C0B0A] flex items-center justify-center">
    <iframe src={presignedUrl} className="w-full h-full" />
  </div>
</div>
```

Dark chrome around a light PDF creates a natural viewport effect.

### 5b. Metadata Sidebar Row Pattern

```tsx
<div className="flex flex-wrap gap-x-4 gap-y-1">
  <MetaItem label="Uploaded" value={formatRelativeDate(doc.created_at)} />
  <MetaItem label="Size" value={formatFileSize(doc.file_size_bytes)} />
  <MetaItem label="Type" value={formatDocumentType(doc.document_type)} />
</div>

function MetaItem({ label, value }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-[#57534E] uppercase tracking-[0.08em]">
        {label}
      </span>
      <span className="text-xs text-[#A09D98] tabular-nums">{value}</span>
    </div>
  )
}
```

### 5c. Failed State Card

```tsx
<div className="rounded-xl border border-red-500/20 bg-red-500/[0.05] p-4">
  <div className="flex items-start gap-3">
    <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
    <div>
      <h3 className="text-sm font-semibold text-red-400">Analysis failed</h3>
      <p className="text-xs text-[#A09D98] mt-1">{doc.processing_error}</p>
      <Button variant="outline" size="sm"
        className="mt-3 h-7 text-xs text-red-400 border-red-500/20
          hover:border-red-500/30 bg-transparent">
        <Trash2 size={12} className="mr-1.5" /> Delete
      </Button>
    </div>
  </div>
</div>
```

### 5d. Loading Skeleton (Right Panel)

```tsx
<div className="space-y-3 p-1">
  <div className="rounded-xl border border-white/[0.04] bg-[#141312] p-4 space-y-3">
    <div className="h-4 w-3/5 rounded bg-white/[0.04] animate-pulse" />
    <div className="h-3 w-2/5 rounded bg-white/[0.04] animate-pulse" />
  </div>
  <div className="rounded-xl border border-white/[0.04] bg-[#141312] p-4 space-y-2">
    <div className="h-3 w-full rounded bg-white/[0.04] animate-pulse" />
    <div className="h-3 w-full rounded bg-white/[0.04] animate-pulse" />
    <div className="h-3 w-3/4 rounded bg-white/[0.04] animate-pulse" />
  </div>
</div>
```

---

## 6. Portfolio Page

### 6a. KPI Cards

The existing `KPICard` component gets dark tokens:

```
Container: rounded-xl border border-white/[0.04] bg-[#141312] p-5
Label: text-[10px] font-semibold text-[#57534E] uppercase tracking-[0.1em]
Value: text-2xl font-semibold text-[#F0EDE8] tabular-nums kpi-value
```

For positive monetary values, use `text-emerald-400` instead of `text-sky-600`.
Grid stays `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`.

### 6b. Chart Cards

All chart wrappers adopt the standard dark card:

```
className="rounded-xl border border-white/[0.04] bg-[#141312] p-5"
```

Chart section title:
```
className="text-[10px] font-semibold text-[#57534E] uppercase tracking-[0.1em] mb-4"
```

### 6c. Chart Color Adaptations

**Area chart (Cash Flow Over Time):**
- Gradient: from `#8B7AFF` at 0.08 opacity to transparent
- Stroke: `#8B7AFF`
- Grid: `stroke="#1E1D1B"` (elevated surface as grid line)
- Axis ticks: `fill="#57534E"` fontSize 11

**Bar chart (Monthly Cash Flow):**
- Positive bars: `#8B7AFF` (accent) instead of `#0EA5E9`
- Negative bars: `#EF4444` (keep red)
- Grid: `stroke="#1E1D1B"` vertical={false}
- Cursor fill on hover: `fill="rgba(255,255,255,0.03)"`

**Pie chart (Strategy Breakdown):**
- Stroke between segments: `stroke="#0C0B0A"` (background, not white)
- Center text count: `fill="#F0EDE8"`
- Center text label: `fill="#57534E"`

**Chart tooltip (all charts):**
```tsx
<div className="bg-[#1E1D1B] border border-white/[0.06] rounded-lg
  px-3 py-2 text-xs shadow-xl">
  <p className="text-[#57534E] mb-1">{label}</p>
  <p className="tabular-nums text-[#F0EDE8] font-medium">
    {formatCurrency(payload[0].value)}
  </p>
</div>
```

**Donut legend:**
```tsx
<div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3">
  {payload.map((entry) => (
    <div key={entry.value} className="flex items-center gap-1.5 text-xs">
      <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
        style={{ backgroundColor: entry.color }} />
      <span className="text-[#57534E]">{entry.value}</span>
      <span className="tabular-nums text-[#F0EDE8]">{pct}%</span>
    </div>
  ))}
</div>
```

### 6d. Closed Deals Table

**Table container:**
```
className="rounded-xl border border-white/[0.04] bg-[#141312] overflow-hidden"
```

**Table header:**
```
<tr className="border-b border-white/[0.04] bg-white/[0.02]">
  <th className="text-left text-[10px] font-semibold text-[#57534E]
    uppercase tracking-[0.08em] px-4 py-3">
    ...
  </th>
</tr>
```

**Table rows:**
```
<tr className="group border-b border-white/[0.03] last:border-0
  hover:bg-white/[0.02] transition-colors">
  <td className="px-4 py-3 text-sm text-[#F0EDE8]">{entry.address}</td>
  <td className="px-4 py-3 text-sm text-[#A09D98] tabular-nums">
    {formatMonthYear(entry.closed_date)}
  </td>
  <td className="px-4 py-3 text-right text-sm text-[#F0EDE8] tabular-nums">
    {formatCurrency(entry.closed_price)}
  </td>
  <td className={cn(
    'px-4 py-3 text-right text-sm tabular-nums',
    profit >= 0 ? 'text-emerald-400' : 'text-red-400',
  )}>
    {formatCurrency(entry.profit)}
  </td>
</tr>
```

**Edit button (row hover):**
```
className="md:opacity-0 md:group-hover:opacity-100 p-1.5 rounded-md
  text-[#57534E] hover:text-[#F0EDE8] hover:bg-white/[0.04] transition-all"
```

**Notes tooltip:**
```
className="max-w-xs bg-[#1E1D1B] border-white/[0.06] text-[#F0EDE8] text-xs shadow-xl"
```

### 6e. Add Closed Deal Button

```tsx
<button className="flex items-center gap-1.5 text-xs font-medium
  text-[#8B7AFF] hover:text-[#8B7AFF]/80 transition-colors">
  <Plus size={14} /> Add closed deal
</button>
```

### 6f. Add Entry Sheet (Side Panel)

```
<SheetContent className="bg-[#141312] border-white/[0.04] overflow-y-auto">
  <SheetTitle className="text-[#F0EDE8]">Add Closed Deal</SheetTitle>
  <SheetDescription className="text-[#57534E]">
    Record a deal you've closed to track in your portfolio.
  </SheetDescription>
</SheetContent>
```

Form inputs within the sheet:
```
Label: text-[#57534E] text-xs
Input: bg-[#1E1D1B] border-white/[0.06] text-[#F0EDE8]
       placeholder:text-[#57534E] focus:ring-[#8B7AFF]/40
       focus:border-[#8B7AFF]/40
Select trigger: bg-[#1E1D1B] border-white/[0.06] text-[#F0EDE8]
Select content: bg-[#1E1D1B] border-white/[0.06]
Select item: text-[#F0EDE8] focus:bg-white/[0.04]
Textarea: bg-[#1E1D1B] border-white/[0.06] text-[#F0EDE8]
          placeholder:text-[#57534E]
Submit button: bg-[#8B7AFF] text-white hover:bg-[#7B6AEF]
               disabled:opacity-40
```

---

## 7. Edit Portfolio Modal

### 7a. Modal Container

```
<DialogContent className="bg-[#1E1D1B] border-white/[0.06] sm:max-w-[425px]">
  <DialogTitle className="text-[#F0EDE8]">Edit Portfolio Entry</DialogTitle>
</DialogContent>
```

### 7b. Entry Identifier

```tsx
<div className="text-sm text-[#A09D98] mb-4">
  <span className="text-[#57534E]">Editing:</span>{' '}
  <span className="text-[#F0EDE8]">{entry.address}</span>
</div>
```

### 7c. Form Fields

All inputs follow the shared dark input pattern:

```
Label: text-[#57534E] text-xs
Input: bg-[#141312] border-white/[0.06] text-[#F0EDE8]
       placeholder:text-[#57534E]
       focus:ring-[#8B7AFF]/40 focus:border-[#8B7AFF]/40
       tabular-nums (for number fields)
Textarea: same as Input, with resize-none
```

### 7d. Footer Buttons

```tsx
<DialogFooter className="gap-2 sm:gap-0 mt-6">
  <Button variant="outline"
    className="border-white/[0.06] text-[#A09D98] bg-transparent
      hover:bg-white/[0.04] hover:text-[#F0EDE8]">
    Cancel
  </Button>
  <Button
    className="bg-[#8B7AFF] text-white hover:bg-[#7B6AEF]
      disabled:opacity-40">
    {isSaving ? 'Saving...' : 'Save Changes'}
  </Button>
</DialogFooter>
```

---

## 8. Empty States

### 8a. Documents — No Documents Yet

```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <FileText size={28} className="text-[#57534E] mb-2" />
  <p className="text-sm text-[#A09D98]">No documents yet</p>
  <p className="text-xs text-[#57534E] mt-0.5">Upload a file to get started</p>
</div>
```

### 8b. Documents — No Document Selected (Right Panel)

```tsx
<div className="flex flex-col items-center justify-center h-full text-center px-6">
  <FileSearch size={40} className="text-[#2A2725] mb-3" />
  <p className="text-sm text-[#57534E]">Select a document to view AI analysis</p>
</div>
```

### 8c. Portfolio — No Closed Deals

```tsx
<div className="rounded-xl border border-white/[0.04] bg-[#141312]
  flex flex-col items-center justify-center py-16 gap-3">
  <Inbox size={32} className="text-[#2A2725]" />
  <p className="text-sm text-[#57534E]">Close your first deal to get started</p>
</div>
```

### 8d. Portfolio — Chart Empty States (Insufficient Data)

```tsx
<div className="flex items-center justify-center h-[200px]">
  <p className="text-sm text-[#57534E]">
    Add at least 2 closed deals to see your cash flow trend.
  </p>
</div>
```

### 8e. Documents — Error State

```tsx
<div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
  <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
    <AlertTriangle className="w-6 h-6 text-red-400" />
  </div>
  <p className="text-base font-medium text-[#F0EDE8]">Failed to load documents</p>
  <p className="text-sm text-[#57534E]">Check your connection and try again.</p>
</div>
```

### 8f. Portfolio — Error State

Same pattern as documents error but with `Inbox` icon and "Failed to load portfolio" copy.

---

## CRITICAL DECISIONS

1. **Violet selection state replaces lime**: Document list selection changes from
   `bg-lime-50 border-lime-300` to `bg-[#8B7AFF]/[0.08] border-[#8B7AFF]/25`.
   All lime accent references (toggle buttons, links) become `#8B7AFF`.

2. **Status badges go translucent**: Light-bg pills (`bg-sky-50`) become translucent
   dark pills (`bg-emerald-500/10 border border-emerald-500/20`). "Done" status
   changes from sky/blue to emerald/green for universally recognized success signaling.

3. **Upload zone drag-active uses violet glow**: The signature interaction of the
   upload zone is a `shadow-[0_0_24px_rgba(139,122,255,0.08)]` glow with a border
   transition from dashed to solid. This is the Mercury-inspired "light responds to
   intent" pattern.

4. **Processing steps gain vertical connectors**: Thin `w-px` lines between step
   icons that turn emerald as steps complete. The active step uses violet, not lime.

5. **Risk flag glow for high severity**: High-severity risk flags get a red glow
   (`shadow-[-4px_0_12px_-4px_rgba(239,68,68,0.15)]`) to create urgency without
   overwhelming the dark interface.

6. **Chart tooltips are dark elevated surfaces**: All Recharts tooltips use
   `bg-[#1E1D1B]` with `border-white/[0.06]` instead of white backgrounds. This
   prevents jarring white flashes during chart interaction.

7. **Portfolio profit color shifts to emerald**: Positive monetary values use
   `text-emerald-400` instead of `text-sky-600`. Emerald reads as "money" more
   naturally than sky blue on a dark surface.

8. **Pie chart segment stroke is background color**: Use `stroke="#0C0B0A"` (the page
   background) between donut segments instead of white. White segments would create
   visible cutting lines on the dark canvas.

9. **Edit modal uses elevated surface (#1E1D1B)**: Modals sit one step above the
   standard surface, using `bg-[#1E1D1B]` with inputs at `bg-[#141312]`. This creates
   depth hierarchy: page > card > modal > modal-input.

10. **Skeleton pulses use white/[0.04]**: All loading placeholders use
    `bg-white/[0.04] animate-pulse` instead of `bg-gray-100`, keeping the shimmer
    barely perceptible on dark backgrounds.
