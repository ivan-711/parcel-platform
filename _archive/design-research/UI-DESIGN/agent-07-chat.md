# Agent 07 — AI Chat Interface (Light Theme)

Design spec for Parcel's AI chat experience. Covers layout, message rendering,
streaming UX, deal context, conversation management, mobile behavior, usage
tracking, and paywall gating. All specs target the light theme with white
backgrounds, slate grays, and indigo accents.

---

## 1. Chat Layout: Sidebar + Active Chat

### Desktop (>= 1024px)

Two-panel layout: 280px conversation sidebar on the left, active chat filling
the remaining width.

```
+-------------------+------------------------------------------+
| Conversation      |  Chat Header                             |
| Sidebar           |  ----------------------------------------|
| (280px)           |  Message Area (scrollable)               |
|                   |                                          |
| [New Chat]        |  user row                                |
| [Search]          |  assistant row                           |
| Today             |  user row                                |
|  - Conv 1 (active)|  assistant row (streaming...)            |
|  - Conv 2         |                                          |
| Yesterday         |  ----------------------------------------|
|  - Conv 3         |  Input Bar (sticky bottom)               |
+-------------------+------------------------------------------+
```

```tsx
<div className="flex h-full bg-white">
  {/* Sidebar — hidden below lg */}
  <aside className="hidden lg:flex w-[280px] shrink-0 border-r border-slate-200
                    bg-slate-50/50 flex-col h-full">
    {/* Section 7: Conversation List */}
  </aside>

  {/* Chat area */}
  <div className="flex-1 min-w-0 flex flex-col h-[100dvh] md:h-full">
    {/* Header */}
    {/* Deal context banner (conditional) */}
    {/* Message area */}
    {/* Input bar */}
  </div>
</div>
```

### Tablet (768px - 1023px)

Sidebar collapses. A history icon in the header opens a slide-over sheet from
the left (see Section 9 Mobile). Chat area is full width.

### Mobile (< 768px)

Full-screen chat. No sidebar chrome. See Section 9.

---

## 2. Message Design: Flat Rows, Not Bubbles

The current implementation uses bubble-style messages (`max-w-[75%]`,
`rounded-2xl`, alignment shifts). The light theme switches to flat full-width
rows. This gives markdown content (tables, code blocks, lists) room to render
without awkward width constraints.

### Row Structure

Each message is a full-width row. Content is centered within a `max-w-3xl`
container with avatar + content columns.

**User message row:**

```tsx
<div className="w-full py-5 px-6 bg-white border-b border-slate-100">
  <div className="max-w-3xl mx-auto flex gap-4">
    {/* Content — right-aligned via ml-auto on inner wrapper */}
    <div className="flex-1 min-w-0 flex justify-end">
      <div className="max-w-[85%]">
        <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
          {msg.content}
        </p>
      </div>
    </div>
    {/* User avatar */}
    <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center shrink-0 mt-0.5">
      <span className="text-xs font-semibold text-white">IF</span>
    </div>
  </div>
</div>
```

**Assistant message row:**

```tsx
<div className="w-full py-5 px-6 bg-slate-50/60 border-b border-slate-100">
  <div className="max-w-3xl mx-auto flex gap-4">
    {/* AI avatar */}
    <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100
                    flex items-center justify-center shrink-0 mt-0.5">
      <Sparkles size={14} className="text-indigo-500" />
    </div>
    {/* Content */}
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium text-slate-400 mb-1.5">Parcel AI</p>
      <ReactMarkdown components={MD_LIGHT}>{msg.content}</ReactMarkdown>
      {/* Streaming indicators (Section 4) */}
      {/* Post-message actions (Section 2a) */}
    </div>
  </div>
</div>
```

### Key Design Decisions

- **No bubbles.** Full-width rows differentiated by background: `bg-white` for
  user, `bg-slate-50/60` for assistant. This is the ChatGPT/Claude pattern.
- **User content right-aligned** within the row via `flex justify-end`. The
  avatar sits to the right of the content column. This preserves the familiar
  "user on right, AI on left" mental model without actual bubble shapes.
- **Assistant content left-aligned** with avatar on the left.
- **`max-w-3xl mx-auto`** centers content and caps readable width at 768px.
  Tables and code blocks can use the full 768px without fighting a 75% bubble.
- **Border dividers** (`border-b border-slate-100`) between rows, not gaps.

### 2a. Post-Message Actions

After an assistant message finishes streaming, a subtle action row fades in:

```tsx
{!msg.isStreaming && msg.role === 'assistant' && (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.2, duration: 0.3 }}
    className="flex items-center gap-3 mt-3 pt-2 border-t border-slate-100"
  >
    <button className="flex items-center gap-1.5 text-xs text-slate-400
                       hover:text-slate-600 transition-colors">
      <Copy size={12} />
      Copy
    </button>
    <button className="flex items-center gap-1.5 text-xs text-slate-400
                       hover:text-slate-600 transition-colors">
      <RotateCcw size={12} />
      Regenerate
    </button>
  </motion.div>
)}
```

---

## 3. AI Messages: Markdown Rendering (Light Theme)

The existing `MD` component map uses hardcoded dark-theme hex values. Every
token must be replaced for the light theme.

### MD_LIGHT Component Map

```tsx
const MD_LIGHT: ComponentProps<typeof ReactMarkdown>['components'] = {
  p: ({ children }) => (
    <p className="text-sm text-slate-800 leading-relaxed mb-3 last:mb-0">
      {children}
    </p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-slate-900">{children}</strong>
  ),
  // @ts-expect-error react-markdown passes inline prop not in types
  code: ({ inline, children }) =>
    inline ? (
      <code className="font-mono text-[13px] bg-slate-100 text-violet-600
                       px-1.5 py-0.5 rounded">
        {children}
      </code>
    ) : (
      <pre className="bg-slate-100 rounded-lg p-4 overflow-x-auto my-3
                      border border-slate-200">
        <code className="font-mono text-[13px] text-slate-800 leading-relaxed">
          {children}
        </code>
      </pre>
    ),
  ul: ({ children }) => (
    <ul className="space-y-1.5 my-2 pl-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="space-y-1.5 my-2 pl-1 list-decimal list-inside">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-sm text-slate-800 flex items-start gap-2">
      <span className="text-indigo-500 mt-0.5 shrink-0">&#9656;</span>
      <span className="leading-relaxed">{children}</span>
    </li>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-3 rounded-lg border border-slate-200">
      <table className="w-full">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-slate-100/80">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 text-[11px] uppercase tracking-wide text-slate-500
                   text-left font-medium border-b border-slate-200">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 font-mono text-[13px] text-slate-700
                   border-t border-slate-100">
      {children}
    </td>
  ),
  h3: ({ children }) => (
    <h3 className="text-[15px] font-semibold text-slate-900 mt-4 mb-2">
      {children}
    </h3>
  ),
}
```

### Color Mapping (Dark to Light)

| Element           | Dark (current)           | Light (new)              |
|-------------------|--------------------------|--------------------------|
| Body text         | `text-[#F1F5F9]`        | `text-slate-800`         |
| Bold text         | `text-white`             | `text-slate-900`         |
| Inline code bg    | `bg-[#16162A]`           | `bg-slate-100`           |
| Inline code text  | `text-[#C4B5FD]`        | `text-violet-600`        |
| Code block bg     | `bg-[#16162A]`           | `bg-slate-100`           |
| Code block border | (none)                   | `border border-slate-200`|
| Table border      | `border-[#1A1A2E]`      | `border-slate-200`       |
| Table header bg   | `bg-[#16162A]`           | `bg-slate-100/80`        |
| Table header text | `text-[#94A3B8]`        | `text-slate-500`         |
| Table cell text   | `text-[#F1F5F9]`        | `text-slate-700`         |
| Heading text      | `text-white`             | `text-slate-900`         |
| List bullet       | `text-[#6366F1]`        | `text-indigo-500`        |

### Financial Numbers

All `$`, `%`, cap rate, and cash flow values use JetBrains Mono via `font-mono`.
The `td` element already applies this. For inline financial figures, the AI
system prompt wraps them in backticks so they render as `<code>` with the
monospace font.

---

## 4. Streaming UX: Typing Dots, Progressive Render, Cursor

Three states during an AI response:

### State A: Waiting (no tokens yet)

Three-dot bounce animation. The dots use `bg-indigo-400` for visibility against
the `bg-slate-50/60` assistant row.

```tsx
{msg.isStreaming && !msg.content && (
  <span
    className="inline-flex items-center gap-1.5 py-1"
    role="status"
    aria-label="AI is thinking"
  >
    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400
                     animate-[typing_1.4s_ease-in-out_infinite]" />
    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400
                     animate-[typing_1.4s_ease-in-out_0.2s_infinite]" />
    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400
                     animate-[typing_1.4s_ease-in-out_0.4s_infinite]" />
  </span>
)}
```

Existing `typing` keyframe in index.css stays unchanged.

### State B: Streaming (tokens arriving)

Progressive markdown render with a blinking indigo cursor at the end:

```tsx
{msg.isStreaming && msg.content && (
  <span
    className="inline-block w-[2px] h-[18px] bg-indigo-500 animate-pulse
               ml-0.5 align-text-bottom rounded-full"
    aria-hidden="true"
  />
)}
```

Changes from current:
- Width increased from `w-0.5` (2px) to explicit `w-[2px]` for light-bg visibility.
- Height `h-[18px]` matches 14px text line height.
- `rounded-full` softens the cursor shape.
- `align-text-bottom` aligns with the last text line.

### State C: Complete

Cursor disappears. Post-message action row fades in (Section 2a). The message
list element has `aria-live="polite"` so screen readers announce completion.

### Animation Spec (from agent-15-animations)

Message entrance uses the refined easing curve:

```tsx
<motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -4 }}
  transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
>
```

`y: 8` (not 10) per Mercury style -- minimal distance, fast settle.

---

## 5. Input Area: Textarea, Send, Attach Deal

### Layout

Sticky bottom bar with white background, top border, and barely-there shadow:

```tsx
<div className="shrink-0 px-6 py-4 border-t border-slate-200 bg-white
                shadow-[0_-1px_3px_rgba(0,0,0,0.03)]">
  <div className="max-w-3xl mx-auto">
    {/* Attached deal chip (conditional — Section 6) */}
    <div className="flex gap-3 items-end">
      {/* Attach deal button */}
      <button
        className="w-10 h-10 rounded-xl border border-slate-200 bg-white
                   flex items-center justify-center text-slate-400
                   hover:text-slate-600 hover:border-slate-300
                   transition-colors shrink-0"
        aria-label="Attach a deal"
      >
        <Paperclip size={16} />
      </button>

      {/* Textarea */}
      <textarea
        className={cn(
          "flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50",
          "px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400",
          "focus:outline-none focus:ring-2 focus:ring-indigo-500/20",
          "focus:border-indigo-300 transition-all",
          "min-h-[48px] max-h-[140px] leading-relaxed shadow-sm"
        )}
        placeholder="Ask about deals, strategies, or financing..."
        aria-label="Type your message"
      />

      {/* Send / Stop button */}
      {/* See states below */}
    </div>

    {/* Hint row */}
    <div className="flex justify-between mt-2">
      <p className="text-[11px] text-slate-400">
        Enter to send &middot; Shift+Enter for new line
      </p>
      {/* Usage counter (Section 10) */}
    </div>

    {/* Disclaimer */}
    <p className="text-[11px] text-slate-400 mt-1 italic">
      AI responses are for informational purposes only. Not financial advice.
    </p>
  </div>
</div>
```

### Send Button States

| State             | Classes                                                          |
|-------------------|------------------------------------------------------------------|
| **Active** (text) | `w-10 h-10 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white shadow-sm` |
| **Disabled**      | `w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-300 cursor-not-allowed` |
| **Stop** (stream) | `w-10 h-10 rounded-xl bg-red-50 border border-red-200 text-red-500 hover:bg-red-100` |

All buttons use `flex items-center justify-center transition-colors shrink-0`.

### Textarea Behavior

- Auto-grows from 48px to 140px max (100px max on mobile).
- `bg-slate-50` gives an inset look against the white bar.
- `focus:ring-2 focus:ring-indigo-500/20` adds a soft glow ring on focus.
- Enter sends; Shift+Enter inserts newline. Existing `handleKeyDown` logic.

---

## 6. Deal Context: Mini-Card When Deal Attached

### Attachment Flow

1. User clicks the Paperclip button in the input area.
2. A floating dropdown appears above the button with a search input and a list
   of recent deals.
3. User selects a deal. A chip appears above the textarea.
4. The deal context is sent with the next message payload.

### Attachment Dropdown

```tsx
<div className="absolute bottom-full left-0 mb-2 w-72 bg-white
                border border-slate-200 rounded-xl shadow-lg overflow-hidden z-20">
  <div className="p-2">
    <input
      placeholder="Search deals..."
      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200
                 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20
                 focus:border-indigo-300"
    />
  </div>
  <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
    {deals.map(deal => (
      <button className="w-full text-left px-3 py-2.5 hover:bg-slate-50
                         flex items-center gap-3 transition-colors">
        <StrategyBadge strategy={deal.strategy} size="sm" />
        <div className="min-w-0">
          <p className="text-sm text-slate-800 truncate">{deal.address}</p>
          <p className="text-xs text-slate-400 font-mono">${deal.price.toLocaleString()}</p>
        </div>
      </button>
    ))}
  </div>
</div>
```

### Attached Deal Chip

Rendered above the textarea row, inside the `max-w-3xl` container:

```tsx
<div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-indigo-50
                border border-indigo-100 rounded-lg w-fit text-xs text-indigo-700">
  <Building2 size={12} />
  <span className="font-medium">123 Main St</span>
  <span className="text-indigo-400">&middot;</span>
  <span className="font-mono">$185,000</span>
  <button
    className="text-indigo-400 hover:text-indigo-600 ml-1 transition-colors"
    aria-label="Remove deal context"
  >
    <X size={12} />
  </button>
</div>
```

### Persistent Context Banner (URL-driven)

When navigating from a deal page via `?context=deal&id=...`, a banner appears
below the chat header:

```tsx
<div className="px-6 py-3 bg-indigo-50 border-b border-indigo-100">
  <div className="max-w-3xl mx-auto flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 animate-pulse" />
      <div>
        <p className="text-xs font-medium text-indigo-700">Deal context active</p>
        <p className="text-xs text-indigo-500/70">
          123 Main St &middot; BRRRR &middot; $185,000
        </p>
      </div>
    </div>
    <button className="text-xs text-indigo-400 hover:text-indigo-600 transition-colors">
      Detach
    </button>
  </div>
</div>
```

### Desktop Split View (>= 1280px)

When deal context is active on xl screens, the layout splits: a 400px deal
summary panel on the left, chat on the right.

```tsx
<div className="flex h-full">
  {contextType === 'deal' && (
    <aside className="hidden xl:flex w-[400px] shrink-0 border-r border-slate-200
                      bg-slate-50/30 flex-col overflow-y-auto p-6 space-y-6">
      <DealSummaryCard dealId={contextId} />
    </aside>
  )}
  <div className="flex-1 min-w-0 flex flex-col">
    {/* Chat header, messages, input */}
  </div>
</div>
```

The deal panel shows: property image (placeholder if none), address, strategy
badge, purchase price, ARV, key metrics (cap rate, CoC return, DSCR), and a
"View full deal" link. All numeric values use `font-mono`.

---

## 7. Conversation List: Title, Preview, Timestamp

### Sidebar Contents

```tsx
<aside className="w-[280px] shrink-0 border-r border-slate-200 bg-slate-50/50
                  flex flex-col h-full">
  {/* New Chat button */}
  <div className="p-4">
    <button className="w-full py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600
                       text-white text-sm font-medium transition-colors shadow-sm
                       flex items-center justify-center gap-2">
      <Plus size={16} />
      New Conversation
    </button>
  </div>

  {/* Search */}
  <div className="px-4 pb-3">
    <div className="relative">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        placeholder="Search conversations..."
        className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200
                   rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20
                   focus:border-indigo-300 transition-all"
      />
    </div>
  </div>

  {/* Conversation list — grouped by date */}
  <div className="flex-1 overflow-y-auto px-2 space-y-1">
    {/* Date header */}
    <p className="text-[11px] uppercase tracking-wide text-slate-400
                  font-medium px-3 py-2">
      Today
    </p>

    {/* Active conversation */}
    <button className="w-full text-left px-3 py-2.5 rounded-lg bg-indigo-50
                       border border-indigo-100 transition-colors">
      <p className="text-sm text-indigo-700 font-medium truncate">
        BRRRR analysis for 123 Main St
      </p>
      <p className="text-[11px] text-indigo-400 mt-0.5">Just now</p>
    </button>

    {/* Inactive conversation */}
    <button className="w-full text-left px-3 py-2.5 rounded-lg
                       hover:bg-slate-100 transition-colors group">
      <p className="text-sm text-slate-700 truncate">
        Wholesale MAO calculator help
      </p>
      <p className="text-[11px] text-slate-400 mt-0.5">2 hours ago</p>
    </button>

    {/* Date header */}
    <p className="text-[11px] uppercase tracking-wide text-slate-400
                  font-medium px-3 py-2 mt-2">
      Yesterday
    </p>

    {/* More conversations... */}
  </div>
</aside>
```

### Conversation Item Data

Each item shows:
- **Title**: first user message, truncated to one line (`truncate`).
- **Timestamp**: relative time ("Just now", "2 hours ago", "Yesterday").
- **Active state**: `bg-indigo-50 border border-indigo-100` with `text-indigo-700`.
- **Hover state**: `hover:bg-slate-100` on inactive items.
- **Delete**: a trash icon appears on hover (`opacity-0 group-hover:opacity-100`),
  positioned at the right edge of the item.

### Hover Animation

Per agent-15-animations, sidebar items get a subtle scale on interaction:

```tsx
<motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
```

---

## 8. Empty Chat: Centered Suggested Prompts

When no messages exist and history has finished loading, display a centered
welcome state with suggested questions.

```tsx
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
  className="flex flex-col items-center justify-center h-full min-h-[400px]
             space-y-8 px-6"
>
  {/* Icon + heading */}
  <div className="flex flex-col items-center gap-3">
    <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100
                    flex items-center justify-center">
      <Sparkles size={24} className="text-indigo-500" />
    </div>
    <h3 className="text-lg font-semibold text-slate-900">Parcel AI</h3>
    <p className="text-sm text-slate-500 text-center max-w-sm">
      Ask about deal analysis, financing structures, market comps,
      or any real estate investment question.
    </p>
  </div>

  {/* Suggested questions — 2x3 grid on sm+, stacked on mobile */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg">
    {SUGGESTED_QUESTIONS.map((q, index) => (
      <motion.button
        key={q.question}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.05 }}
        onClick={() => handleSend(q.question)}
        className="text-left p-3.5 rounded-xl border border-slate-200 bg-white
                   hover:border-indigo-200 hover:bg-indigo-50/30 transition-all
                   shadow-sm hover:shadow group"
        aria-label={q.question}
      >
        <p className="text-[11px] uppercase tracking-wide text-slate-400 font-medium
                      group-hover:text-indigo-400 transition-colors">
          {q.category}
        </p>
        <p className="text-[13px] text-slate-600 leading-snug mt-1">
          {q.question}
        </p>
      </motion.button>
    ))}
  </div>
</motion.div>
```

### Suggested Questions

```ts
const SUGGESTED_QUESTIONS = [
  { category: 'Wholesale',        question: 'How do I calculate MAO for a wholesale deal?' },
  { category: 'Creative Finance',  question: 'Explain subject-to financing with a real example.' },
  { category: 'BRRRR',            question: 'What makes a good BRRRR deal vs a bad one?' },
  { category: 'Buy & Hold',       question: 'What cap rate should I target in the Midwest?' },
  { category: 'Risk',             question: "What's a healthy DSCR for a rental property?" },
  { category: 'Flip',             question: 'How should I estimate holding costs on a 6-month flip?' },
]
```

---

## 9. Mobile: Full-Screen, Back Button, Sticky Input

### Full-Screen Layout

On mobile (< 768px), the chat consumes the entire viewport. The AppShell
sidebar is already hidden. Use `h-[100dvh]` (dynamic viewport height) so the
layout accounts for the virtual keyboard.

```tsx
<div className="flex flex-col h-[100dvh] md:h-full">
  {/* Mobile header with back + history */}
  <div className="shrink-0 px-4 py-3 border-b border-slate-200 bg-white
                  flex items-center justify-between md:hidden">
    <button className="w-9 h-9 rounded-lg flex items-center justify-center
                       text-slate-500 hover:bg-slate-100 transition-colors"
            aria-label="Back">
      <ChevronLeft size={20} />
    </button>
    <div className="flex items-center gap-2">
      <Sparkles size={14} className="text-indigo-500" />
      <span className="text-sm font-semibold text-slate-900">AI Chat</span>
    </div>
    <button className="w-9 h-9 rounded-lg flex items-center justify-center
                       text-slate-500 hover:bg-slate-100 transition-colors"
            aria-label="Chat history">
      <MessageSquare size={18} />
    </button>
  </div>

  {/* Messages (flex-1, scrollable) */}
  <div className="flex-1 overflow-y-auto overscroll-contain scroll-smooth"
       role="log" aria-live="polite">
    {/* Message rows */}
  </div>

  {/* Sticky input — safe area padding for iOS */}
  <div className="shrink-0 px-4 py-3 border-t border-slate-200 bg-white
                  pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
    {/* Same input layout, but textarea max-h reduced to 100px */}
  </div>
</div>
```

### Mobile History Sheet

Tapping the history icon opens a full-screen sheet from the left:

```tsx
<AnimatePresence>
  {showHistory && (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/20"
        onClick={() => setShowHistory(false)}
      />
      {/* Sheet */}
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-y-0 left-0 z-50 w-[85vw] max-w-[320px] bg-white
                   shadow-xl border-r border-slate-200"
      >
        {/* Close button */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <span className="text-sm font-semibold text-slate-900">Conversations</span>
          <button onClick={() => setShowHistory(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center
                             text-slate-400 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>
        {/* Same conversation list content as desktop sidebar */}
      </motion.div>
    </>
  )}
</AnimatePresence>
```

### Scroll-to-Bottom FAB

When the user scrolls up during a conversation, a floating button appears:

```tsx
<AnimatePresence>
  {showScrollButton && (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      onClick={scrollToBottom}
      className="absolute bottom-20 right-6 w-9 h-9 rounded-full bg-white
                 border border-slate-200 shadow-md flex items-center justify-center
                 text-slate-500 hover:text-slate-700 z-10"
      aria-label="Scroll to bottom"
    >
      <ChevronDown size={16} />
    </motion.button>
  )}
</AnimatePresence>
```

### Mobile Input Adjustments

- Touch targets: 44x44 minimum (send, attach, stop buttons).
- Textarea `max-h` reduced from 140px to 100px to preserve screen real estate.
- `overscroll-behavior: contain` on the message scroll area to prevent
  pull-to-refresh interference.

---

## 10. Usage Counter Near Input

### Layout

The usage counter sits at the right edge of the hint text row, below the
textarea:

```tsx
<div className="flex justify-between items-center mt-2">
  <p className="text-[11px] text-slate-400">
    Enter to send &middot; Shift+Enter for new line
  </p>
  <p className={cn(
    "text-[11px] font-mono",
    remaining <= 5 ? "text-amber-500" : "text-slate-400",
    remaining <= 0 && "text-red-500"
  )}>
    {used} / {limit} messages
  </p>
</div>
```

### Behavior

- **Free tier**: shows "X of 25 messages" (or whatever the limit is).
  Counter text turns `text-amber-500` when 5 or fewer remain.
  Counter text turns `text-red-500` at 0 remaining.
- **Pro tier**: counter is hidden entirely (unlimited messages).
- **Reset cadence**: "Resets in X hours" appended when under 5 remaining.

### Near-Limit Warning

When 3 or fewer messages remain, a subtle banner appears above the input:

```tsx
{remaining <= 3 && remaining > 0 && (
  <div className="max-w-3xl mx-auto mb-2 px-3 py-2 bg-amber-50 border
                  border-amber-200 rounded-lg flex items-center justify-between">
    <p className="text-xs text-amber-700">
      {remaining} AI message{remaining !== 1 ? 's' : ''} remaining today
    </p>
    <button className="text-xs text-indigo-500 hover:text-indigo-600
                       font-medium transition-colors">
      Upgrade
    </button>
  </div>
)}
```

---

## 11. Paywall for Free Users

### At-Limit State (0 messages remaining)

When the user has exhausted their free messages, the textarea and send button
are disabled. A paywall card replaces the input area:

```tsx
{remaining <= 0 && (
  <div className="shrink-0 px-6 py-6 border-t border-slate-200 bg-white">
    <div className="max-w-3xl mx-auto">
      <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border
                      border-indigo-200 rounded-xl p-5 text-center space-y-3">
        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center
                        justify-center mx-auto">
          <Sparkles size={18} className="text-indigo-500" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-900">
            You've used all your free AI messages
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            Upgrade to Pro for unlimited AI conversations, deal analysis,
            and financing insights.
          </p>
        </div>
        <button className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600
                           text-white text-sm font-medium rounded-xl
                           transition-colors shadow-sm">
          Upgrade to Pro
        </button>
        <p className="text-[11px] text-slate-400">
          Or wait — messages reset in {hoursUntilReset}h
        </p>
      </div>
    </div>
  </div>
)}
```

### Disabled Input State

When remaining is 0, the textarea gets additional visual treatment:

```tsx
<textarea
  disabled
  className={cn(
    baseTextareaClasses,
    "opacity-50 cursor-not-allowed bg-slate-100"
  )}
  placeholder="Upgrade to Pro for unlimited AI messages..."
/>
```

### Paywall Nudge in Messages

If the user tries to send when at limit, insert a system-style message:

```tsx
const paywallMsg: UIMessage = {
  id: crypto.randomUUID(),
  role: 'assistant',
  content: 'You\'ve reached your daily message limit. Upgrade to Pro for unlimited AI conversations.',
  isStreaming: false,
  isPaywall: true,  // custom flag for special rendering
}
```

This message renders with a distinctive style:

```tsx
{msg.isPaywall && (
  <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border
                  border-indigo-100 rounded-lg p-4 flex items-center gap-3">
    <Lock size={16} className="text-indigo-500 shrink-0" />
    <div className="flex-1">
      <p className="text-sm text-slate-700">{msg.content}</p>
    </div>
    <button className="px-3 py-1.5 bg-indigo-500 text-white text-xs
                       font-medium rounded-lg hover:bg-indigo-600
                       transition-colors shrink-0">
      Upgrade
    </button>
  </div>
)}
```

---

## 12. Skeleton Loading States

Replace current dark skeleton with light-theme equivalents:

```tsx
{historyLoading && (
  <div className="space-y-1">
    {/* User skeleton row */}
    <div className="w-full py-5 px-6">
      <div className="max-w-3xl mx-auto flex gap-4 justify-end">
        <div className="h-10 w-48 rounded-xl bg-slate-100 animate-pulse" />
        <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse shrink-0" />
      </div>
    </div>
    {/* Assistant skeleton row */}
    <div className="w-full py-5 px-6 bg-slate-50/60">
      <div className="max-w-3xl mx-auto flex gap-4">
        <div className="w-8 h-8 rounded-lg bg-slate-200 animate-pulse shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-3/4 rounded bg-slate-200 animate-pulse" />
          <div className="h-4 w-1/2 rounded bg-slate-200 animate-pulse" />
          <div className="h-4 w-2/3 rounded bg-slate-200 animate-pulse" />
        </div>
      </div>
    </div>
    {/* Another user skeleton row */}
    <div className="w-full py-5 px-6">
      <div className="max-w-3xl mx-auto flex gap-4 justify-end">
        <div className="h-10 w-40 rounded-xl bg-slate-100 animate-pulse" />
        <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse shrink-0" />
      </div>
    </div>
  </div>
)}
```

---

## 13. Accessibility

| Concern                  | Implementation                                                |
|--------------------------|---------------------------------------------------------------|
| Message list semantics   | `role="log"` with `aria-live="polite"` on scroll container    |
| Typing indicator         | `role="status"` + `aria-label="AI is thinking"`               |
| Suggested questions      | `aria-label` with full question text on each button           |
| Stop button              | `aria-label="Stop generating"`                                |
| Send button              | `aria-label="Send message"`                                   |
| Attach button            | `aria-label="Attach a deal"`                                  |
| Focus rings              | `focus-visible:ring-2 focus-visible:ring-indigo-500/30`       |
| Skip-to-content          | Existing skip link targets the message input                  |
| Reduced motion           | Entrance animations disabled via `useReducedMotion()` guard   |
| Color contrast (AA)      | `text-slate-800` on white = 12.6:1; `text-slate-400` on white = 4.5:1; `text-white` on indigo-500 = 4.6:1 |

---

## 14. Color Reference Table

| Surface                | Token                  | Value     | Tailwind               |
|------------------------|------------------------|-----------|------------------------|
| Page background        | --chat-bg              | #FFFFFF   | `bg-white`             |
| Assistant message bg   | --chat-ai-bg           | #F8FAFC   | `bg-slate-50/60`       |
| User message bg        | --chat-user-bg         | #FFFFFF   | `bg-white`             |
| Input area bg          | --chat-input-bg        | #FFFFFF   | `bg-white`             |
| Input field bg         | --chat-field-bg        | #F8FAFC   | `bg-slate-50`          |
| Sidebar bg             | --chat-sidebar-bg      | #F8FAFC   | `bg-slate-50/50`       |
| Code block bg          | --chat-code-bg         | #F1F5F9   | `bg-slate-100`         |
| Header bg              | --chat-header-bg       | #FFFFFF   | `bg-white`             |
| Primary text           | --                     | #0F172A   | `text-slate-900`       |
| Secondary text         | --                     | #475569   | `text-slate-600`       |
| Muted text             | --                     | #94A3B8   | `text-slate-400`       |
| Accent                 | --                     | #6366F1   | `text-indigo-500`      |
| Message divider        | --                     | #F1F5F9   | `border-slate-100`     |
| Input border           | --                     | #E2E8F0   | `border-slate-200`     |
| Input focus border     | --                     | #6366F1/50| `focus:border-indigo-300` |

---

## CRITICAL DECISIONS

### 1. Flat rows, not bubbles
Switch from the current bubble layout (`max-w-[75%]`, `rounded-2xl`, alignment
shifts) to full-width rows with `max-w-3xl mx-auto`. This is the ChatGPT/Claude
pattern and is required because AI responses contain tables, code blocks, and
multi-paragraph markdown that break inside narrow bubbles. User messages are
right-aligned within the row; AI messages are left-aligned. Background color
differentiates them: `bg-white` vs `bg-slate-50/60`.

### 2. Conversation sidebar is a new component
The current ChatPage has no conversation list. The 280px sidebar with
date-grouped history, search, and "New Chat" button is new infrastructure.
It requires a backend endpoint for listing conversations (title, last message
timestamp, message count). On mobile, the sidebar becomes a slide-over sheet
triggered from the header.

### 3. Deal attachment replaces URL-only context
Currently, deal context is only available via `?context=deal&id=...` URL params.
The new design adds a Paperclip button with a quick-search dropdown so users can
attach deals mid-conversation without navigating away. This requires a deals
search endpoint (already exists as the `q` param on the deals list endpoint).

### 4. Usage counter is visible, paywall is inline
The "X of Y messages" counter is always visible for Free users, positioned at the
bottom-right of the hint row. When messages run out, the input area is replaced
by a paywall card. This is intentionally inline (not a modal) to feel less
aggressive while still being impossible to miss.

### 5. MD_LIGHT replaces MD entirely
The markdown component map is a full replacement, not a toggle. Every dark hex
(`#08080F`, `#0F0F1A`, `#16162A`, `#1A1A2E`, `#C4B5FD`, `#F1F5F9`) becomes a
Tailwind slate/violet utility class. Code block bg goes from `#16162A` to
`bg-slate-100` with a `border border-slate-200`. Table borders go from
`border-[#1A1A2E]` to `border-slate-200`. This is a breaking visual change with
no backward compatibility path.

### 6. Streaming cursor width increases
The blinking cursor during token streaming changes from `w-0.5` (2px via
Tailwind, but actually the browser may render 0.5 of its base) to explicit
`w-[2px]` for reliable visibility on the light background. Height increases to
`h-[18px]` to match text line height. `rounded-full` softens the shape.

### 7. `100dvh` on mobile, not `h-full`
The root chat container uses `h-[100dvh]` on mobile to account for dynamic
viewport changes when the virtual keyboard opens. This prevents the input bar
from being pushed off-screen on iOS Safari. Falls back to `h-full` on desktop
via `md:h-full`.

### 8. Post-message actions fade in after streaming
Copy and Regenerate buttons appear below completed AI messages with a 200ms
delay fade-in via Framer Motion. These are text-only buttons (`text-xs
text-slate-400 hover:text-slate-600`) separated from the message content by a
thin `border-t border-slate-100` divider. They do not appear during streaming.

### 9. Split-view deal panel on xl only
The 400px deal summary panel alongside the chat only renders at the `xl`
breakpoint (1280px+). Below that, deal context falls back to the compact banner
below the header. This prevents the chat area from becoming too narrow on smaller
screens.

### 10. Animations follow Mercury rules
Per agent-15-animations: message entrance uses `y: 8` (not 10), duration 0.2s,
easing `[0.25, 0.1, 0.25, 1]`. Suggested question cards stagger at 50ms
intervals. Sidebar items get `whileHover: { scale: 1.01 }`. Exit animations are
75% of enter duration. All animations respect `prefers-reduced-motion` via the
`useReducedMotion()` hook.
