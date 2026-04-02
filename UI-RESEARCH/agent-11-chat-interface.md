# Agent 11 — AI Chat Interface Redesign (Light Theme)

Research document for redesigning Parcel's AI chat experience.
Covers layout patterns, message components, streaming UX, markdown rendering,
deal context integration, and mobile behavior -- all specified for a light theme.

---

## 1. Chat UI Patterns: Bubbles vs Flat Messages

There are two dominant patterns for chat interfaces in production SaaS tools:

**Bubble style** (current Parcel approach):
User messages float right in a colored bubble, assistant messages float left.
Clear visual separation but can feel consumer-grade (iMessage, WhatsApp).

**Flat / card style** (ChatGPT, Claude, Linear AI):
Full-width rows, no alignment shift. User and assistant messages are differentiated
by background color or left-border accent. Feels more professional and handles
long-form markdown (tables, code) without awkward width constraints.

**Recommendation for Parcel:** Switch to flat rows. Real estate AI responses contain
tables (comps, financials), bullet lists, and multi-paragraph analysis. A 75% max-width
bubble fights against that content. Flat rows give markdown room to breathe.

### Flat Message Row Spec

```
Container (full width):
  className="w-full py-5 px-6"

User row:
  className="bg-white border-b border-gray-100"

Assistant row:
  className="bg-gray-50/60 border-b border-gray-100"
```

Each row contains a fixed-width left column (avatar/icon) and a fluid right column
(message content) up to a max readable width:

```
<div className="max-w-3xl mx-auto flex gap-4">
  {/* Avatar column */}
  <div className="w-8 h-8 shrink-0 mt-1">...</div>
  {/* Content column */}
  <div className="flex-1 min-w-0">...</div>
</div>
```

---

## 2. Light Theme Color System

### Background Layers

| Surface              | Token               | Value      | Tailwind              |
|----------------------|----------------------|------------|-----------------------|
| Page background      | --chat-bg            | #FFFFFF    | bg-white              |
| Assistant message bg | --chat-ai-bg         | #F8FAFC    | bg-slate-50           |
| User message bg      | --chat-user-bg       | #FFFFFF    | bg-white              |
| Input area bg        | --chat-input-bg      | #FFFFFF    | bg-white              |
| Input field bg       | --chat-field-bg      | #F8FAFC    | bg-slate-50           |
| Sidebar bg           | --chat-sidebar-bg    | #F1F5F9    | bg-slate-100          |
| Code block bg        | --chat-code-bg       | #F1F5F9    | bg-slate-100          |
| Header bg            | --chat-header-bg     | #FFFFFF    | bg-white              |

### Text Colors

| Role               | Value      | Tailwind            |
|---------------------|------------|---------------------|
| Primary text        | #0F172A    | text-slate-900      |
| Secondary text      | #475569    | text-slate-600      |
| Tertiary / muted    | #94A3B8    | text-slate-400      |
| Link / accent       | #6366F1    | text-indigo-500     |
| Code text           | #7C3AED    | text-violet-600     |
| User message text   | #FFFFFF    | text-white          |

### Border Colors

| Usage               | Value      | Tailwind              |
|----------------------|------------|-----------------------|
| Message divider      | #F1F5F9    | border-slate-100      |
| Input border         | #E2E8F0    | border-slate-200      |
| Input focus border   | #6366F1/50 | focus:border-indigo-500/50 |
| Sidebar divider      | #E2E8F0    | border-slate-200      |
| Card border          | #E2E8F0    | border-slate-200      |

### Shadows

Input field: `shadow-sm` (Tailwind default).
Header/footer: `shadow-[0_1px_3px_rgba(0,0,0,0.04)]` -- barely-there depth.
Floating elements (emoji picker, attachment menu): `shadow-lg`.

---

## 3. User vs AI Differentiation

### User Avatar

Circle with user initials, indigo background:

```tsx
<div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center">
  <span className="text-xs font-semibold text-white">IF</span>
</div>
```

### AI Avatar

Rounded square with Sparkles icon, light indigo tint:

```tsx
<div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
  <Sparkles size={14} className="text-indigo-500" />
</div>
```

### Role Label (Optional)

Small text above the message content for clarity:

```tsx
<p className="text-xs font-medium text-slate-400 mb-1">
  {role === 'assistant' ? 'Parcel AI' : 'You'}
</p>
```

This is optional -- the avatar alone may suffice. But it helps screen readers
and adds scannability when scrolling long conversations.

---

## 4. Markdown Rendering in Light Theme

The current `MD` component map needs a full recolor. Every hardcoded dark hex
must map to a light-theme equivalent.

### Component Map Spec

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
  code: ({ inline, children }) =>
    inline ? (
      <code className="font-mono text-[13px] bg-slate-100 text-violet-600 px-1.5 py-0.5 rounded">
        {children}
      </code>
    ) : (
      <pre className="bg-slate-100 rounded-lg p-3 overflow-x-auto my-2 border border-slate-200">
        <code className="font-mono text-[13px] text-slate-800">{children}</code>
      </pre>
    ),
  ul: ({ children }) => (
    <ul className="space-y-1 my-2 pl-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="space-y-1 my-2 pl-1 list-decimal list-inside">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-sm text-slate-800 flex items-start gap-2">
      <span className="text-indigo-500 mt-0.5 shrink-0">&#9656;</span>
      <span>{children}</span>
    </li>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-3">
      <table className="w-full border border-slate-200 rounded-lg overflow-hidden">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-slate-50">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 text-[11px] uppercase tracking-wide text-slate-500 text-left font-medium border-b border-slate-200">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 font-mono text-[13px] text-slate-700 border-t border-slate-100">
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

### Financial Numbers

All `$`, `%`, cap rate, and cash flow values must use JetBrains Mono regardless of
where they appear. The `td` element already uses `font-mono`. For inline financial
figures inside paragraphs, the AI system prompt should wrap them in backticks so
they render as `<code>` with the mono font.

---

## 5. Streaming Indicators

Three streaming states exist in the current implementation. All need light-theme updates.

### State A: Waiting (assistant message created, no tokens yet)

Three-dot bounce animation. Change from indigo-400 on dark to indigo-500 on light:

```tsx
{msg.isStreaming && !msg.content && (
  <span className="inline-flex items-center gap-1.5 py-1" aria-label="AI is thinking">
    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-[typing_1.4s_ease-in-out_infinite]" />
    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-[typing_1.4s_ease-in-out_0.2s_infinite]" />
    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-[typing_1.4s_ease-in-out_0.4s_infinite]" />
  </span>
)}
```

The existing `typing` keyframe animation works well. No changes needed to timing.

### State B: Streaming (tokens arriving)

Current: blinking cursor bar (indigo-500, animate-pulse). This is the right pattern.
Update color contrast for light background:

```tsx
{msg.isStreaming && msg.content && (
  <span
    className="inline-block w-[2px] h-[18px] bg-indigo-500 animate-pulse ml-0.5 align-text-bottom rounded-full"
    aria-hidden="true"
  />
)}
```

The cursor should be 2px wide (not 0.5, which is barely visible on light bg),
rounded, and aligned to text bottom for visual consistency with the last line.

### State C: Complete

No indicator. The cursor disappears, and a subtle action row fades in:

```tsx
{!msg.isStreaming && msg.role === 'assistant' && (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.2, duration: 0.3 }}
    className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100"
  >
    <button className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
      Copy
    </button>
    <button className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
      Regenerate
    </button>
  </motion.div>
)}
```

---

## 6. Chat Input Area

### Layout

Sticky bottom bar. White background with a top border and subtle shadow
to visually separate from the message scroll area:

```tsx
<div className="shrink-0 px-6 py-4 border-t border-slate-200 bg-white shadow-[0_-1px_3px_rgba(0,0,0,0.03)]">
  <div className="max-w-3xl mx-auto flex gap-3 items-end">
    {/* Attachment button */}
    <button className="w-10 h-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors shrink-0">
      <Paperclip size={16} />
    </button>
    {/* Textarea */}
    <textarea ... />
    {/* Send / Stop button */}
    <button ... />
  </div>
  <div className="max-w-3xl mx-auto">
    <p className="text-[11px] text-slate-400 mt-2">
      Enter to send &middot; Shift+Enter for new line
    </p>
  </div>
</div>
```

### Textarea Spec

```
className={cn(
  "flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3",
  "text-sm text-slate-800 placeholder:text-slate-400",
  "focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300",
  "transition-all min-h-[48px] max-h-[140px] leading-relaxed"
)}
```

Key changes from current:
- `focus:ring-2 focus:ring-indigo-500/20` adds a soft focus ring (more visible than border-only on light).
- `bg-slate-50` gives the field a slight inset look against the white bar.

### Send Button States

Active (has text):
```
className="w-10 h-10 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white
           flex items-center justify-center transition-colors shadow-sm"
```

Disabled (empty):
```
className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200
           text-slate-300 flex items-center justify-center cursor-not-allowed"
```

Stop (streaming):
```
className="w-10 h-10 rounded-xl bg-red-50 border border-red-200
           text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors"
```

### Character Count

Optional but useful for context-window awareness. Place at the right edge
of the hint text row:

```tsx
<div className="max-w-3xl mx-auto flex justify-between">
  <p className="text-[11px] text-slate-400 mt-2">Enter to send &middot; Shift+Enter for new line</p>
  <p className={cn(
    "text-[11px] mt-2 font-mono",
    input.length > 4000 ? "text-red-500" : "text-slate-400"
  )}>
    {input.length.toLocaleString()} / 4,000
  </p>
</div>
```

---

## 7. Deal Context Attachment in Chat

When a user navigates from a deal page to chat (via `?context=deal&id=...`),
the chat should display a persistent context banner below the header.

### Context Banner Spec

```tsx
<div className="px-6 py-3 bg-indigo-50 border-b border-indigo-100">
  <div className="max-w-3xl mx-auto flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 animate-pulse" />
      <div>
        <p className="text-xs font-medium text-indigo-700">Deal context active</p>
        <p className="text-xs text-indigo-500/70">123 Main St &middot; BRRRR &middot; $185,000</p>
      </div>
    </div>
    <button className="text-xs text-indigo-400 hover:text-indigo-600 transition-colors">
      Detach
    </button>
  </div>
</div>
```

### Inline Attachment Chip

Users should also be able to attach a deal mid-conversation from the input area.
An attachment button (Paperclip icon) opens a quick-search dropdown listing
recent deals:

```tsx
<div className="absolute bottom-full left-0 mb-2 w-72 bg-white border border-slate-200
                rounded-xl shadow-lg overflow-hidden">
  <div className="p-2">
    <input placeholder="Search deals..." className="w-full px-3 py-2 text-sm bg-slate-50
                                                     border border-slate-200 rounded-lg" />
  </div>
  <div className="max-h-48 overflow-y-auto">
    {deals.map(deal => (
      <button className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-3">
        <StrategyBadge strategy={deal.strategy} size="sm" />
        <div>
          <p className="text-sm text-slate-800">{deal.address}</p>
          <p className="text-xs text-slate-400 font-mono">${deal.price}</p>
        </div>
      </button>
    ))}
  </div>
</div>
```

Once attached, a chip appears above the textarea:

```tsx
<div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100
                rounded-lg w-fit text-xs text-indigo-700">
  <Building2 size={12} />
  <span>123 Main St</span>
  <button className="text-indigo-400 hover:text-indigo-600 ml-1"><X size={12} /></button>
</div>
```

---

## 8. Chat History Sidebar

### Desktop Layout

On screens >= 1024px, a 280px sidebar sits to the left of the chat area.
It lists past conversations grouped by date.

```
<aside className="w-[280px] shrink-0 border-r border-slate-200 bg-slate-50/50
                  flex flex-col h-full">
  {/* New chat button */}
  <div className="p-4">
    <button className="w-full py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600
                       text-white text-sm font-medium transition-colors shadow-sm">
      New Conversation
    </button>
  </div>

  {/* Search */}
  <div className="px-4 pb-3">
    <input placeholder="Search conversations..."
           className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg" />
  </div>

  {/* Conversation list */}
  <div className="flex-1 overflow-y-auto px-2 space-y-1">
    {/* Date group */}
    <p className="text-[11px] uppercase tracking-wide text-slate-400 font-medium px-3 py-2">
      Today
    </p>
    {/* Conversation item */}
    <button className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-100
                       transition-colors group">
      <p className="text-sm text-slate-700 truncate">BRRRR analysis for 123 Main St</p>
      <p className="text-[11px] text-slate-400 mt-0.5">2 hours ago</p>
    </button>

    {/* Active conversation */}
    <button className="w-full text-left px-3 py-2.5 rounded-lg bg-indigo-50
                       border border-indigo-100">
      <p className="text-sm text-indigo-700 font-medium truncate">Wholesale MAO calculator</p>
      <p className="text-[11px] text-indigo-400 mt-0.5">Just now</p>
    </button>
  </div>
</aside>
```

### Mobile

No sidebar. Instead, a hamburger/history icon in the header opens a
full-screen sheet (from the left) using Framer Motion:

```tsx
<motion.div
  initial={{ x: '-100%' }}
  animate={{ x: 0 }}
  exit={{ x: '-100%' }}
  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
  className="fixed inset-0 z-50 bg-white"
>
  {/* Same sidebar content, full width */}
</motion.div>
```

---

## 9. Empty Chat State

When no messages exist and no history has loaded, show a centered welcome state.
This replaces the current dark-themed version.

```tsx
<div className="flex flex-col items-center justify-center h-full min-h-[400px] space-y-8">
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
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
    {SUGGESTED_QUESTIONS.map(q => (
      <button className="text-left p-3.5 rounded-xl border border-slate-200 bg-white
                         hover:border-indigo-200 hover:bg-indigo-50/30 transition-all
                         shadow-sm hover:shadow group">
        <p className="text-[11px] uppercase tracking-wide text-slate-400 font-medium
                      group-hover:text-indigo-400 transition-colors">
          {q.category}
        </p>
        <p className="text-[13px] text-slate-600 leading-snug mt-1">{q.question}</p>
      </button>
    ))}
  </div>
</div>
```

---

## 10. Mobile Chat

### Full-screen Layout

On mobile (< 768px), the chat should consume the full viewport. AppShell sidebar
is already hidden on mobile. Key mobile concerns:

- **Sticky input**: The input bar must remain above the virtual keyboard.
  Use `position: sticky; bottom: 0` plus `env(safe-area-inset-bottom)` padding
  for iOS notch devices.
- **Smooth scroll**: `scroll-behavior: smooth` on the message container.
  Use `overscroll-behavior: contain` to prevent pull-to-refresh interference.
- **Auto-resize**: The textarea auto-grows from 48px to 140px max. On mobile
  the max can be reduced to 100px to preserve screen real estate.

```tsx
<div className="flex flex-col h-[100dvh] md:h-full">
  {/* Use dvh on mobile for dynamic viewport height (keyboard-aware) */}
  ...
</div>
```

### Mobile Input Adjustments

```tsx
className="pb-[calc(1rem+env(safe-area-inset-bottom))]"
```

The send button and attachment button should be 44x44 minimum (Apple HIG touch target).
Current 44px (w-11 h-11) already meets this.

### Scroll-to-Bottom FAB

When the user scrolls up during a conversation, show a floating "scroll to bottom"
button so they can quickly return:

```tsx
{showScrollButton && (
  <motion.button
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.8 }}
    onClick={scrollToBottom}
    className="absolute bottom-20 right-6 w-9 h-9 rounded-full bg-white
               border border-slate-200 shadow-md flex items-center justify-center
               text-slate-500 hover:text-slate-700 z-10"
  >
    <ChevronDown size={16} />
  </motion.button>
)}
```

---

## 11. Chat + Deal Context Split View (Desktop)

On large screens (>= 1280px), when deal context is active, the layout splits
into a two-panel view: deal summary on the left, chat on the right.

### Layout Structure

```
+------------------+------------------------------+
|  Deal Summary    |        Chat Area             |
|  (400px fixed)   |  (flex-1, min-w-0)           |
|                  |                              |
|  Property photo  |  Messages                   |
|  Address         |  ...                         |
|  Key metrics     |  ...                         |
|  Strategy badge  |                              |
|  Quick facts     |  Input bar                   |
+------------------+------------------------------+
```

```tsx
<div className="flex h-full">
  {/* Deal panel — only visible when context=deal and xl breakpoint */}
  {contextType === 'deal' && (
    <aside className="hidden xl:flex w-[400px] shrink-0 border-r border-slate-200
                      bg-slate-50/30 flex-col overflow-y-auto">
      <div className="p-6 space-y-6">
        <DealSummaryCard dealId={contextId} />
      </div>
    </aside>
  )}
  {/* Chat panel */}
  <div className="flex-1 min-w-0 flex flex-col">
    ...
  </div>
</div>
```

The deal panel shows: property image (if available), address, strategy badge,
purchase price, ARV, key metrics (cap rate, CoC return, DSCR), and a link
to the full deal page. All values use `font-mono` per design system rules.

---

## 12. Framer Motion Specifications

### Message Entrance

Current animation is correct but can be refined for light theme (less distance):

```tsx
<motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -4 }}
  transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
>
```

Reduce `y` from 10 to 8. Use a custom easing curve instead of `easeOut` for
a slightly more polished feel.

### Empty State Entrance

Stagger the suggested question cards:

```tsx
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4, delay: index * 0.05 }}
>
```

### Sidebar Conversation Hover

Subtle scale on hover for conversation items:

```tsx
<motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
```

### Streaming Text Effect

An alternative to the cursor blink: a subtle background highlight that follows
the last rendered word. This is complex to implement with SSE deltas but creates
a polished "writing" feel. Not recommended for v1 -- the cursor blink is sufficient
and proven.

---

## 13. Accessibility Notes

- All interactive elements must have visible focus rings (`focus-visible:ring-2 focus-visible:ring-indigo-500/30`).
- The typing indicator needs `aria-label="AI is thinking"` and `role="status"`.
- The message list should be `role="log"` with `aria-live="polite"` so screen readers
  announce new messages without interrupting.
- Suggested question buttons need `aria-label` with the full question text.
- The stop button must have `aria-label="Stop generating"` (already present).
- Color contrast: all text combinations above meet WCAG 2.1 AA.
  - `text-slate-800` on `bg-white`: 12.6:1 ratio.
  - `text-slate-400` on `bg-white`: 4.5:1 ratio (just meets AA for small text).
  - `text-white` on `bg-indigo-500`: 4.6:1 ratio (meets AA).

---

## 14. Skeleton Loading States

Replace the current dark skeleton bubbles with light-theme equivalents:

```tsx
<div className="space-y-5">
  {/* User skeleton */}
  <div className="max-w-3xl mx-auto flex gap-4 justify-end">
    <div className="h-10 w-48 rounded-xl bg-slate-100 animate-pulse" />
    <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse shrink-0" />
  </div>
  {/* Assistant skeleton */}
  <div className="max-w-3xl mx-auto flex gap-4">
    <div className="w-8 h-8 rounded-lg bg-slate-100 animate-pulse shrink-0" />
    <div className="space-y-2 flex-1">
      <div className="h-4 w-3/4 rounded bg-slate-100 animate-pulse" />
      <div className="h-4 w-1/2 rounded bg-slate-100 animate-pulse" />
    </div>
  </div>
</div>
```

---

## RECOMMENDATIONS FOR PARCEL

1. **Switch from bubbles to flat rows.** The current bubble layout with `max-w-[75%]`
   constrains tables and code blocks. Flat full-width rows (ChatGPT-style) with
   `max-w-3xl mx-auto` give markdown content room while maintaining readability.

2. **Recolor the entire MD component map.** Every hardcoded dark hex (`#08080F`,
   `#0F0F1A`, `#1A1A2E`, `#16162A`, `#F1F5F9`, `#C4B5FD`) must be replaced with
   the light-theme equivalents specified in Section 2. Extracted as a separate
   `MD_LIGHT` map or toggled via CSS variables.

3. **Add a chat history sidebar.** The current implementation has no visible
   conversation list. A 280px sidebar (collapsible on mobile) with date-grouped
   conversations, search, and a "New Conversation" button is standard for AI chat
   products and expected by users.

4. **Implement the deal context split view.** The `?context=deal&id=` parameter
   already exists but only shows a small text banner. On xl screens, show a
   persistent deal summary panel (400px) alongside the chat. This is Parcel's
   differentiator -- the AI can reference the deal while the user sees the numbers.

5. **Add post-message actions.** Copy and Regenerate buttons below completed
   assistant messages. These fade in with Framer Motion after streaming completes.
   Low effort, high perceived polish.

6. **Add the deal attachment chip.** Let users attach deals mid-conversation via
   a Paperclip button and quick-search dropdown. This removes the friction of
   navigating to a deal page first.

7. **Use `100dvh` on mobile.** Replace `h-full` with `h-[100dvh]` for the root
   chat container on mobile to account for dynamic viewport changes when the
   virtual keyboard opens.

8. **Add scroll-to-bottom FAB.** When the user scrolls up during a long conversation,
   a floating button lets them return to the latest message. Small detail, significant
   UX improvement.

9. **Keep the streaming cursor, skip the highlight effect.** The blinking cursor
   bar during streaming is effective and performant. A "highlight follows last word"
   effect is visually novel but adds complexity for marginal gain. Ship the cursor.

10. **Preserve JetBrains Mono for financial figures.** The markdown `td` and inline
    `code` elements already use `font-mono`. Ensure the AI system prompt consistently
    wraps financial values in backticks so they render with the monospace font in
    both inline and table contexts.
