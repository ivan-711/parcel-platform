# Agent 07 — AI Chat Interface: Luxury Dark Design Spec

Design specification for Parcel's AI chat experience, translated from
the current light-theme implementation (`ChatPage.tsx`) into the luxury
warm-dark system. Every class is production Tailwind; copy-paste ready.

**Locked tokens referenced throughout:**

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#0C0B0A` | Page / base background |
| `--surface-elevated` | `#161514` | Lifted panels, header bar |
| `--surface-inset` | `#0F0E0D` | Recessed areas, AI message rows |
| `--text` | `#F0EDE8` | Primary text (cream) |
| `--text-muted` | `#F0EDE8/50` | Secondary / helper text |
| `--border` | `#F0EDE8/8` | Default border (near-invisible) |
| `--border-hover` | `#F0EDE8/12` | Hover-state border lift |
| `--accent` | `#8B7AFF` | Violet accent — AI identity |

---

## 1. Message Layout — Full-Width Alternating Rows

No bubbles. Every message is a full-width row. User rows sit on the base
background; AI rows get the inset surface tint. A hairline border at 4%
opacity separates rows without drawing visible lines.

```tsx
{/* User message row */}
<motion.div
  className="w-full py-6 px-6 border-b border-[#F0EDE8]/[0.04] bg-[#0C0B0A]"
>
  <div className="max-w-3xl mx-auto flex gap-4">
    {/* content — right-aligned, see Section 2 */}
  </div>
</motion.div>

{/* AI message row */}
<motion.div
  className="w-full py-6 px-6 border-b border-[#F0EDE8]/[0.04] bg-[#0F0E0D]"
>
  <div className="max-w-3xl mx-auto flex gap-4">
    {/* avatar + content — left-aligned, see Section 2 */}
  </div>
</motion.div>
```

**Key decisions:**
- `py-6` (24px) instead of the light theme's `py-5` — dark surfaces need
  more breathing room to avoid density.
- `border-[#F0EDE8]/[0.04]` — 4% cream, barely there. Structure without
  grid lines.
- Max content width `max-w-3xl` (48rem / 768px) keeps lines scannable and
  gives markdown tables room to breathe.
- Row entrance animation via `motion.div`: `initial={{ opacity: 0, y: 8 }}`
  / `animate={{ opacity: 1, y: 0 }}` / `transition={{ duration: 0.2 }}`.

---

## 2. User vs AI — Alignment & Typography Differentiation

### User Messages — Right-Aligned, No Background

```tsx
<div className="flex-1 min-w-0 flex justify-end">
  <div className="max-w-[85%]">
    <p className="text-[15px] text-[#F0EDE8] leading-relaxed whitespace-pre-wrap">
      {msg.content}
    </p>
  </div>
</div>
```

- Full cream opacity (`text-[#F0EDE8]`) — user words are the most
  prominent text in the conversation.
- No avatar on the right. Alignment alone differentiates the speaker.
- `max-w-[85%]` prevents user text from spanning the full row, creating
  a natural right-weighted block.

### AI Messages — Left-Aligned, Avatar Column + Role Label

```tsx
<div className="max-w-3xl mx-auto flex gap-4">
  {/* Avatar — see Section 6 for streaming variant */}
  <div className="w-8 h-8 rounded-lg bg-[#8B7AFF]/10
                  border border-[#8B7AFF]/15
                  flex items-center justify-center shrink-0 mt-0.5
                  backdrop-blur-sm">
    <Sparkles size={14} className="text-[#8B7AFF]" />
  </div>

  <div className="flex-1 min-w-0">
    <p className="text-xs font-medium text-[#8B7AFF]/60 mb-1.5 tracking-wide">
      Parcel AI
    </p>
    <ReactMarkdown components={MD_DARK}>{msg.content}</ReactMarkdown>
  </div>
</div>
```

- AI body text at 90% cream (`text-[#F0EDE8]/90`) — fractionally softer
  than user text, establishing hierarchy.
- Role label `"Parcel AI"` in muted violet `text-[#8B7AFF]/60` —
  reinforces brand without shouting.
- Sparkles avatar in frosted violet glass (see Section 6).

### Hover-Reveal Timestamps

Timestamps clutter dark UIs. Show on hover only:

```tsx
<div className="group relative">
  <p className="...">{msg.content}</p>
  <span className="absolute -left-16 top-0 text-[11px] text-[#F0EDE8]/20
                   opacity-0 group-hover:opacity-100 transition-opacity duration-200
                   tabular-nums">
    2:34 PM
  </span>
</div>
```

---

## 3. Markdown Rendering — Dark-Aware Component Map (MD_DARK)

Every element tuned for warm-dark. Body text at 90%, strong at 100%,
muted elements use violet or cream at low opacity.

```tsx
const MD_DARK: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  p: ({ children }) => (
    <p className="text-[14px] text-[#F0EDE8]/90 leading-[1.7] mb-3 last:mb-0">
      {children}
    </p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-[#F0EDE8]">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-[#F0EDE8]/70">{children}</em>
  ),
  // @ts-expect-error react-markdown passes inline prop not in types
  code: ({ inline, children }) =>
    inline ? (
      <code className="font-mono text-[13px] bg-[#8B7AFF]/10 text-[#8B7AFF]
                       px-1.5 py-0.5 rounded border border-[#8B7AFF]/10">
        {children}
      </code>
    ) : (
      <pre className="relative bg-[#0C0B0A] rounded-lg p-4 overflow-x-auto my-3
                      border border-[#F0EDE8]/[0.06] group">
        <div className="flex items-center justify-between px-4 py-2
                        border-b border-[#F0EDE8]/[0.04]
                        opacity-0 group-hover:opacity-100 transition-opacity duration-200
                        absolute top-0 inset-x-0">
          <span className="text-[11px] text-[#F0EDE8]/25 uppercase tracking-wider">
            {/* language label injected by rehype */}
          </span>
          <button className="text-[11px] text-[#F0EDE8]/30 hover:text-[#F0EDE8]/60
                             transition-colors cursor-pointer">
            Copy
          </button>
        </div>
        <code className="block font-mono text-[13px] text-[#F0EDE8]/80 leading-relaxed">
          {children}
        </code>
      </pre>
    ),
  ul: ({ children }) => (
    <ul className="space-y-1.5 my-2 pl-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="space-y-1.5 my-2 pl-1 list-decimal list-inside
                   marker:text-[#8B7AFF]/50">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-[14px] text-[#F0EDE8]/90 flex items-start gap-2">
      <span className="text-[#8B7AFF]/60 mt-0.5 shrink-0">&#9656;</span>
      <span className="leading-[1.7]">{children}</span>
    </li>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-4 rounded-lg border border-[#F0EDE8]/[0.06]">
      <table className="w-full">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-[#F0EDE8]/[0.03]">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2.5 text-[11px] uppercase tracking-wider
                   text-[#F0EDE8]/40 text-left font-medium
                   border-b border-[#F0EDE8]/[0.06]">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2.5 font-mono text-[13px] text-[#F0EDE8]/70
                   border-t border-[#F0EDE8]/[0.04]">
      {children}
    </td>
  ),
  h3: ({ children }) => (
    <h3 className="text-[15px] font-semibold text-[#F0EDE8] mt-5 mb-2">
      {children}
    </h3>
  ),
  a: ({ children, href }) => (
    <a href={href}
       className="text-[#8B7AFF] hover:text-[#9D8FFF] underline
                  underline-offset-2 decoration-[#8B7AFF]/30
                  hover:decoration-[#8B7AFF]/60 transition-colors"
       target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-[#8B7AFF]/30 pl-4 my-3
                           text-[#F0EDE8]/60 italic">
      {children}
    </blockquote>
  ),
  hr: () => (
    <hr className="border-[#F0EDE8]/[0.06] my-6" />
  ),
}
```

**Rendering principles:**
- Inline code uses `bg-[#8B7AFF]/10 text-[#8B7AFF]` — financial figures
  in backticks glow violet, becoming design elements.
- Code blocks use `bg-[#0C0B0A]` (the base bg) inside AI rows at
  `bg-[#0F0E0D]` — the block appears recessed, physically inset.
- Table borders at 4-6% opacity provide structure without white gridlines.
- Links are violet with 30% underline that intensifies to 60% on hover.
- List bullets are violet triangles at 60% — subtle brand reinforcement.

---

## 4. Streaming Animation — Three States

### State A: Thinking (No Tokens Yet)

Three dots with violet glow, pulsing in staggered sequence:

```tsx
{msg.isStreaming && !msg.content && (
  <span className="inline-flex items-center gap-1.5 py-1"
        role="status" aria-label="AI is thinking">
    <span className="w-1.5 h-1.5 rounded-full bg-[#8B7AFF]
                     animate-[typing_1.4s_ease-in-out_infinite]
                     shadow-[0_0_6px_rgba(139,122,255,0.4)]" />
    <span className="w-1.5 h-1.5 rounded-full bg-[#8B7AFF]
                     animate-[typing_1.4s_ease-in-out_0.2s_infinite]
                     shadow-[0_0_6px_rgba(139,122,255,0.4)]" />
    <span className="w-1.5 h-1.5 rounded-full bg-[#8B7AFF]
                     animate-[typing_1.4s_ease-in-out_0.4s_infinite]
                     shadow-[0_0_6px_rgba(139,122,255,0.4)]" />
  </span>
)}
```

The `shadow-[0_0_6px_rgba(139,122,255,0.4)]` gives each dot a soft violet
glow halo — a dark-mode-only detail that reads as "AI is alive." The glow
would be invisible on light backgrounds; here it is a differentiator.

**Keyframe definition (add to tailwind.config.ts):**
```ts
typing: {
  '0%, 80%, 100%': { opacity: '0.3', transform: 'scale(0.8)' },
  '40%': { opacity: '1', transform: 'scale(1)' },
}
```

### State B: Streaming (Tokens Arriving)

Blinking violet cursor with light emission:

```tsx
{msg.isStreaming && msg.content && (
  <span className="inline-block w-[2px] h-[18px] bg-[#8B7AFF]
                   animate-pulse ml-0.5 align-text-bottom rounded-full
                   shadow-[0_0_8px_rgba(139,122,255,0.3)]"
        aria-hidden="true" />
)}
```

The cursor emits a soft 8px violet glow — it feels like a point of light
tracing across the dark canvas.

### State C: Complete (Actions Fade In)

Cursor disappears. Action row fades in with a 300ms delay:

```tsx
{!msg.isStreaming && msg.role === 'assistant' && msg.content && (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.3, duration: 0.4 }}
    className="flex items-center gap-3 mt-3 pt-3 border-t border-[#F0EDE8]/[0.06]"
  >
    <button
      onClick={() => handleCopy(msg.id, msg.content)}
      className="flex items-center gap-1.5 text-xs text-[#F0EDE8]/30
                 hover:text-[#F0EDE8]/60 transition-colors cursor-pointer"
    >
      <Copy size={12} /> {copiedId === msg.id ? 'Copied!' : 'Copy'}
    </button>
    <button
      onClick={() => handleRegenerate(msg.id)}
      className="flex items-center gap-1.5 text-xs text-[#F0EDE8]/30
                 hover:text-[#F0EDE8]/60 transition-colors cursor-pointer"
    >
      <RotateCcw size={12} /> Regenerate
    </button>
  </motion.div>
)}
```

Action buttons rest at 30% cream and brighten to 60% on hover. At idle
they are near-invisible — "reveal on intent" pattern.

---

## 5. Chat Input — Recessed Field with Violet Focus

The input bar sits at the bottom with a top border, matching the base
background. The textarea uses 4% cream fill (warm, not cool-gray).

```tsx
<div className="shrink-0 px-6 py-4 border-t border-[#F0EDE8]/[0.06]
                bg-[#0C0B0A]
                pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
  <div className="max-w-3xl mx-auto">
    <div className="flex gap-3 items-end">
      {/* Attachment button */}
      <button className="w-10 h-10 rounded-xl bg-[#F0EDE8]/[0.04]
                         border border-[#F0EDE8]/[0.06]
                         flex items-center justify-center
                         text-[#F0EDE8]/30 hover:text-[#F0EDE8]/60
                         hover:bg-[#F0EDE8]/[0.06] hover:border-[#F0EDE8]/10
                         transition-all duration-200 shrink-0 cursor-pointer">
        <Paperclip size={16} />
      </button>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={input}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder="Ask about deals, strategies, or financing..."
        aria-label="Type your message"
        disabled={isStreaming}
        rows={1}
        className={cn(
          "flex-1 resize-none rounded-xl",
          "bg-[#F0EDE8]/[0.04] border border-[#F0EDE8]/[0.08]",
          "px-4 py-3 text-[14px] text-[#F0EDE8] placeholder:text-[#F0EDE8]/25",
          "focus:outline-none focus:ring-1 focus:ring-[#8B7AFF]/30",
          "focus:border-[#8B7AFF]/40 transition-all duration-200",
          "min-h-[48px] max-h-[140px] leading-relaxed",
          isStreaming && "opacity-40 cursor-not-allowed"
        )}
        style={{ height: '48px', overflowY: 'auto' }}
      />

      {/* Send button — contextual */}
      {isStreaming ? (
        <button
          onClick={handleStop}
          className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20
                     flex items-center justify-center text-red-400
                     hover:bg-red-500/15 hover:border-red-500/30
                     transition-all duration-200 shrink-0 cursor-pointer"
          aria-label="Stop generating"
        >
          <Square size={14} fill="currentColor" />
        </button>
      ) : (
        <button
          onClick={() => void handleSend(input)}
          disabled={!input.trim()}
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
            "transition-all duration-200",
            input.trim()
              ? "bg-[#8B7AFF] hover:bg-[#9D8FFF] text-white shadow-[0_0_20px_rgba(139,122,255,0.2)]"
              : "bg-[#F0EDE8]/[0.04] border border-[#F0EDE8]/[0.06] text-[#F0EDE8]/20 cursor-not-allowed"
          )}
          aria-label="Send message"
        >
          <Send size={14} />
        </button>
      )}
    </div>
    <div className="flex justify-between items-center mt-2">
      <p className="text-[11px] text-[#F0EDE8]/25">
        Enter to send &middot; Shift+Enter for new line
      </p>
    </div>
    <p className="text-[11px] text-[#F0EDE8]/20 mt-1 italic">
      AI responses are for informational purposes only. Not financial advice.
    </p>
  </div>
</div>
```

**Design decisions:**
- **4% cream fill** (`bg-[#F0EDE8]/[0.04]`) — warm, not the cool-gray of
  a hex-picked surface. Every shade inherits the cream undertone.
- **Violet focus ring** (`focus:ring-[#8B7AFF]/30 focus:border-[#8B7AFF]/40`)
  — replaces the light theme's lime ring. Subtle glow, not a hard outline.
- **Send button glow** — when active, `shadow-[0_0_20px_rgba(139,122,255,0.2)]`
  emits a diffuse violet aura. "Ready to send" communicated through light.
- **Placeholder at 25%** — dark backgrounds demand fainter placeholder text.
  Standard 50% is too prominent against near-black.
- **Stop button** — muted red at 10% fill with 20% border. Never solid red;
  that would break the palette.
- **Disclaimer at 20%** — nearly invisible but present for compliance.

---

## 6. AI Avatar — Frosted Violet Glass with Streaming Pulse

### Idle State

```tsx
<div className="w-8 h-8 rounded-lg bg-[#8B7AFF]/10
                border border-[#8B7AFF]/15
                flex items-center justify-center shrink-0 mt-0.5
                backdrop-blur-sm">
  <Sparkles size={14} className="text-[#8B7AFF]" />
</div>
```

The `backdrop-blur-sm` + low-opacity violet background creates a frosted
glass plane. The sparkles icon sits at full violet against this translucent
surface — the AI's visual identity.

### Streaming State (Pulse + Glow)

```tsx
<div className="w-8 h-8 rounded-lg bg-[#8B7AFF]/10
                border border-[#8B7AFF]/20
                flex items-center justify-center shrink-0 mt-0.5
                shadow-[0_0_12px_rgba(139,122,255,0.15)]
                animate-pulse
                backdrop-blur-sm">
  <Sparkles size={14} className="text-[#8B7AFF]" />
</div>
```

During streaming: border opacity lifts from 15% to 20%, a 12px violet glow
radiates outward, and the entire avatar pulses. This signals "the AI is
actively working" without being distracting. The glow is subtle enough to
be perceived subconsciously.

### Conditional Rendering

```tsx
const AiAvatar = ({ isStreaming }: { isStreaming: boolean }) => (
  <div className={cn(
    "w-8 h-8 rounded-lg bg-[#8B7AFF]/10 flex items-center justify-center shrink-0 mt-0.5 backdrop-blur-sm",
    isStreaming
      ? "border border-[#8B7AFF]/20 shadow-[0_0_12px_rgba(139,122,255,0.15)] animate-pulse"
      : "border border-[#8B7AFF]/15"
  )}>
    <Sparkles size={14} className="text-[#8B7AFF]" />
  </div>
)
```

---

## 7. Code Syntax Highlighting — Custom Warm Theme

A custom theme derived from Catppuccin Mocha, tuned to Parcel's warm
tokens. Catppuccin's warm pastels align naturally with the cream-on-dark
palette; Dracula and One Dark are too saturated and cool-toned.

### Token Color Map

```css
/* Custom syntax theme — add to global CSS or rehype-prism config */
.code-dark .token.keyword       { color: #8B7AFF; }  /* violet — if, const, return  */
.code-dark .token.string        { color: #A6DA95; }  /* soft green — string literals */
.code-dark .token.number        { color: #F5A97F; }  /* warm amber — numeric values  */
.code-dark .token.comment       { color: #F0EDE840; font-style: italic; } /* cream 25% */
.code-dark .token.function      { color: #8AADF4; }  /* sky blue — function names    */
.code-dark .token.property      { color: #F0C6C6; }  /* soft pink — object props     */
.code-dark .token.operator      { color: #F0EDE860; } /* cream 37% — operators       */
.code-dark .token.punctuation   { color: #F0EDE850; } /* cream 31% — brackets, etc   */
.code-dark .token.class-name    { color: #EED49F; }  /* warm gold — class names      */
.code-dark .token.boolean       { color: #F5A97F; }  /* amber, same as numbers       */
.code-dark .token.variable      { color: #F0EDE8cc; } /* cream 80% — variables       */
.code-dark .token.template-string { color: #A6DA95; } /* green, same as strings      */
```

### CSS Variables (Alternative Integration)

```css
:root {
  --code-bg:          #0C0B0A;
  --code-text:        #F0EDE8cc;
  --code-keyword:     #8B7AFF;
  --code-string:      #A6DA95;
  --code-number:      #F5A97F;
  --code-comment:     #F0EDE840;
  --code-function:    #8AADF4;
  --code-property:    #F0C6C6;
  --code-operator:    #F0EDE860;
  --code-class:       #EED49F;
}
```

### Code Block Container (Full Spec)

```tsx
<pre className="relative bg-[#0C0B0A] rounded-lg overflow-x-auto my-3
                border border-[#F0EDE8]/[0.06] group">
  {/* Header — language label + copy — hover-reveal */}
  <div className="flex items-center justify-between px-4 py-2
                  border-b border-[#F0EDE8]/[0.04]
                  opacity-0 group-hover:opacity-100 transition-opacity duration-200">
    <span className="text-[11px] text-[#F0EDE8]/25 uppercase tracking-wider font-medium">
      {language}
    </span>
    <button className="text-[11px] text-[#F0EDE8]/30 hover:text-[#F0EDE8]/60
                       transition-colors cursor-pointer">
      Copy
    </button>
  </div>
  <code className="block p-4 font-mono text-[13px] leading-relaxed code-dark">
    {/* Syntax-highlighted tokens */}
  </code>
</pre>
```

**Design notes:**
- Keywords are violet (`#8B7AFF`) — the brand accent appears naturally in
  code, tying syntax highlighting to the overall identity.
- Strings are soft green (`#A6DA95`) — warm-toned, not the neon green of
  terminal aesthetics.
- Comments are cream at 25% — barely visible, receding into the background
  as comments should.
- The header row (language label + copy) is hover-reveal — "reveal on
  intent" matches ChatGPT and Claude.ai dark patterns.

---

## 8. Conversation Sidebar — Minimal, Same Base Background

The sidebar shares `bg-[#0C0B0A]` with the main area. Only a right border
defines it. No background differentiation creates a seamless dark expanse.

```tsx
<aside className="w-[280px] shrink-0 border-r border-[#F0EDE8]/[0.06]
                  bg-[#0C0B0A] flex flex-col h-full
                  hidden lg:flex">

  {/* New chat button */}
  <div className="p-4">
    <button className="w-full py-2.5 rounded-xl bg-[#8B7AFF]
                       hover:bg-[#9D8FFF] text-white text-sm font-medium
                       transition-all duration-200 cursor-pointer
                       shadow-[0_0_20px_rgba(139,122,255,0.15)]">
      New Conversation
    </button>
  </div>

  {/* Search */}
  <div className="px-4 pb-3">
    <input
      placeholder="Search conversations..."
      className="w-full px-3 py-2 text-sm bg-[#F0EDE8]/[0.04]
                 border border-[#F0EDE8]/[0.06] rounded-lg
                 text-[#F0EDE8]/80 placeholder:text-[#F0EDE8]/20
                 focus:outline-none focus:border-[#8B7AFF]/30
                 transition-colors duration-200"
    />
  </div>

  {/* Conversation list */}
  <div className="flex-1 overflow-y-auto px-2 space-y-0.5
                  scrollbar-thin scrollbar-thumb-[#F0EDE8]/[0.06]
                  scrollbar-track-transparent">

    {/* Date group header */}
    <p className="text-[11px] uppercase tracking-wider text-[#F0EDE8]/20
                  font-medium px-3 py-2 mt-2">
      Today
    </p>

    {/* Conversation — default */}
    <button className="w-full text-left px-3 py-2.5 rounded-lg
                       hover:bg-[#F0EDE8]/[0.04] transition-colors
                       duration-150 group cursor-pointer">
      <p className="text-sm text-[#F0EDE8]/70 truncate
                    group-hover:text-[#F0EDE8]/90 transition-colors">
        BRRRR analysis for 123 Main St
      </p>
      <p className="text-[11px] text-[#F0EDE8]/20 mt-0.5">2 hours ago</p>
    </button>

    {/* Conversation — active */}
    <button className="w-full text-left px-3 py-2.5 rounded-lg
                       bg-[#8B7AFF]/10 border border-[#8B7AFF]/15
                       cursor-pointer">
      <p className="text-sm text-[#8B7AFF] font-medium truncate">
        Wholesale MAO calculator
      </p>
      <p className="text-[11px] text-[#8B7AFF]/40 mt-0.5">Just now</p>
    </button>

    {/* Conversation — unread */}
    <button className="w-full text-left px-3 py-2.5 rounded-lg
                       hover:bg-[#F0EDE8]/[0.04] transition-colors
                       duration-150 relative cursor-pointer">
      <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5
                      rounded-full bg-[#8B7AFF]" />
      <p className="text-sm text-[#F0EDE8]/80 truncate pl-1">
        Creative finance options
      </p>
      <p className="text-[11px] text-[#F0EDE8]/20 mt-0.5 pl-1">Yesterday</p>
    </button>
  </div>
</aside>
```

**Design decisions:**
- Active conversation: `bg-[#8B7AFF]/10` with `border-[#8B7AFF]/15` —
  violet tint marks selection without breaking the dark uniformity.
- Timestamps at 20% opacity — barely visible until the user scans for them.
- Date headers at 20% cream, uppercase, wide tracking — recede completely.
- Unread indicator: solid 6px violet dot, no animation. Pulsing dots in a
  sidebar are distracting.
- New Conversation button gets the same violet glow treatment as the send
  button — `shadow-[0_0_20px_rgba(139,122,255,0.15)]`.
- Hidden below `lg` breakpoint (`hidden lg:flex`). Mobile uses the
  conversation list as a separate route, not a sidebar.

---

## 9. Empty State — Violet Halo Icon + Ghost Prompt Cards

When there are no messages, the chat shows a centered welcome with the AI
icon at large scale, a violet halo glow, descriptive text, and ghost-style
suggested prompt cards with staggered entrance.

```tsx
<motion.div
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
  className="flex flex-col items-center justify-center h-full
             min-h-[400px] space-y-10 px-6"
>
  {/* AI icon — large with violet halo */}
  <div className="flex flex-col items-center gap-4">
    <div className="w-16 h-16 rounded-2xl bg-[#8B7AFF]/10
                    border border-[#8B7AFF]/15
                    flex items-center justify-center
                    shadow-[0_0_40px_rgba(139,122,255,0.08)]">
      <Sparkles size={28} className="text-[#8B7AFF]" />
    </div>
    <div className="text-center space-y-2">
      <h3 className="text-xl font-semibold text-[#F0EDE8] tracking-tight">
        Parcel AI
      </h3>
      <p className="text-sm text-[#F0EDE8]/40 max-w-sm leading-relaxed">
        Ask about deal analysis, financing structures, market comps,
        or any real estate investment question.
      </p>
    </div>
  </div>

  {/* Suggested prompt cards — ghost glass */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
    {SUGGESTED_QUESTIONS.map((q, i) => (
      <motion.button
        key={q.question}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 + i * 0.05 }}
        onClick={() => void handleSend(q.question)}
        className="text-left p-4 rounded-xl
                   bg-[#F0EDE8]/[0.03] border border-[#F0EDE8]/[0.06]
                   hover:bg-[#F0EDE8]/[0.06] hover:border-[#8B7AFF]/20
                   transition-all duration-200 group cursor-pointer"
        aria-label={q.question}
      >
        <p className="text-[11px] uppercase tracking-wider text-[#F0EDE8]/25
                      font-medium group-hover:text-[#8B7AFF]/60
                      transition-colors">
          {q.category}
        </p>
        <p className="text-[13px] text-[#F0EDE8]/60 leading-snug mt-1.5
                      group-hover:text-[#F0EDE8]/80 transition-colors">
          {q.question}
        </p>
      </motion.button>
    ))}
  </div>
</motion.div>
```

**Design details:**
- Icon halo: `shadow-[0_0_40px_rgba(139,122,255,0.08)]` — a 40px diffuse
  violet glow at 8% opacity. Perceptible but ethereal.
- Description text at 40% cream — intentionally dim. The prompts below are
  the real call to action.
- Stagger: 150ms base delay + 50ms per card (`0.15 + i * 0.05`) creates a
  cascading waterfall entrance from top-left to bottom-right.
- Card fill: 3% cream (`bg-[#F0EDE8]/[0.03]`). Barely distinguishable
  from the background — ghost panels.
- Hover: fill brightens to 6%, border shifts to `border-[#8B7AFF]/20`
  (violet hint), category label becomes violet at 60%.

---

## 10. Suggested Prompts — Glass Cards with Hover Brightening

The six suggested questions from `SUGGESTED_QUESTIONS` render as a 2-column
grid of glass-morphism cards. Each card has two text layers: a category
label (uppercase, tracking-wider, 25% cream) and a question (13px, 60%
cream).

### Card Anatomy

```
+---------------------------------------+
| WHOLESALE               ← 11px, 25%  |
| How do I calculate MAO  ← 13px, 60%  |
| for a wholesale deal?                 |
+---------------------------------------+
  bg: cream 3%  border: cream 6%
```

### Interaction States

| State | Background | Border | Category | Question |
|-------|-----------|--------|----------|----------|
| Rest | `bg-[#F0EDE8]/[0.03]` | `border-[#F0EDE8]/[0.06]` | `text-[#F0EDE8]/25` | `text-[#F0EDE8]/60` |
| Hover | `bg-[#F0EDE8]/[0.06]` | `border-[#8B7AFF]/20` | `text-[#8B7AFF]/60` | `text-[#F0EDE8]/80` |
| Focus-visible | same as hover | `ring-1 ring-[#8B7AFF]/30` | same as hover | same as hover |

### Keyboard Accessibility

```tsx
<motion.button
  // ... existing props
  className="... focus-visible:ring-1 focus-visible:ring-[#8B7AFF]/30
             focus-visible:bg-[#F0EDE8]/[0.06]
             focus-visible:border-[#8B7AFF]/20
             focus:outline-none"
>
```

Focus-visible uses the same violet treatment as hover, ensuring keyboard
navigation is visually identical to pointer interaction.

---

## Chat Header — Dark Treatment

```tsx
<div className="shrink-0 px-6 py-4 border-b border-[#F0EDE8]/[0.06]
                bg-[#161514]">
  <div className="max-w-3xl mx-auto flex items-center gap-3">
    <div className="w-8 h-8 rounded-lg bg-[#8B7AFF]/10
                    border border-[#8B7AFF]/15
                    flex items-center justify-center backdrop-blur-sm">
      <Sparkles size={15} className="text-[#8B7AFF]" />
    </div>
    <div>
      <h2 className="text-sm font-semibold text-[#F0EDE8]">AI Specialist</h2>
      <p className="text-[11px] text-[#F0EDE8]/40">
        Real estate investment advisor
      </p>
    </div>
  </div>
  {contextType !== 'general' && contextId && (
    <div className="max-w-3xl mx-auto mt-3 flex items-center gap-2
                    text-[12px] text-[#F0EDE8]/40">
      <span className="w-1.5 h-1.5 rounded-full bg-[#8B7AFF] shrink-0
                       animate-pulse shadow-[0_0_4px_rgba(139,122,255,0.3)]" />
      {contextType === 'deal'
        ? 'Deal context active — AI knows the details of this deal'
        : 'Document context active — AI has read this document'}
    </div>
  )}
</div>
```

The header uses `bg-[#161514]` (surface-elevated) — slightly lifted from
the base to create a shelf effect. The context indicator dot is violet with
a micro-glow rather than the light theme's lime green.

---

## Loading Skeleton — Dark

```tsx
<div className="space-y-0">
  <div className="w-full py-6 px-6 bg-[#0C0B0A] border-b border-[#F0EDE8]/[0.04]">
    <div className="max-w-3xl mx-auto flex justify-end">
      <div className="h-5 w-48 rounded bg-[#F0EDE8]/[0.06] animate-pulse" />
    </div>
  </div>
  <div className="w-full py-6 px-6 bg-[#0F0E0D] border-b border-[#F0EDE8]/[0.04]">
    <div className="max-w-3xl mx-auto flex gap-4">
      <div className="w-8 h-8 rounded-lg bg-[#F0EDE8]/[0.06] animate-pulse shrink-0" />
      <div className="space-y-2 flex-1">
        <div className="h-4 w-24 rounded bg-[#F0EDE8]/[0.06] animate-pulse" />
        <div className="h-4 w-64 rounded bg-[#F0EDE8]/[0.04] animate-pulse" />
        <div className="h-4 w-40 rounded bg-[#F0EDE8]/[0.04] animate-pulse" />
      </div>
    </div>
  </div>
  <div className="w-full py-6 px-6 bg-[#0C0B0A] border-b border-[#F0EDE8]/[0.04]">
    <div className="max-w-3xl mx-auto flex justify-end">
      <div className="h-5 w-40 rounded bg-[#F0EDE8]/[0.06] animate-pulse" />
    </div>
  </div>
</div>
```

Skeleton bars use 4-6% cream — matching the warm tone, not a separate gray.

---

## CRITICAL DECISIONS

1. **Full-width rows, not bubbles.** Bubbles create floating color blocks on
   dark that feel consumer-grade. Every premium AI interface (ChatGPT,
   Claude.ai, Perplexity, Linear AI) uses full-width rows on dark. The
   alternating `#0C0B0A` / `#0F0E0D` tint creates separation without
   introducing shapes.

2. **No user avatar.** The current light theme shows a lime circle with "U"
   on the right. On dark, this becomes a floating element that competes with
   the AI avatar. Right-alignment alone is sufficient differentiation — this
   matches ChatGPT dark's approach. The AI avatar should be the sole visual
   anchor.

3. **Violet streaming glow is a dark-only differentiator.** The
   `shadow-[0_0_Npx_rgba(139,122,255,0.3)]` on thinking dots, cursor, and
   avatar pulse would be invisible on light. This is a feature specifically
   enabled by the dark canvas — lean into it.

4. **Custom syntax theme over off-the-shelf.** Catppuccin Mocha is the
   closest existing theme, but its blue-purple background (`#1E1E2E`) clashes
   with Parcel's warm `#0C0B0A`. A custom derivative using the actual token
   palette ensures code blocks feel integrated, not bolted on.

5. **Sidebar shares base bg, not elevated.** Giving the sidebar its own
   surface color (e.g., `#161514`) would create a visible column that
   competes for attention. Using the same `#0C0B0A` with only a border makes
   the sidebar feel like part of the canvas. This is how Claude.ai dark
   handles its sidebar.

6. **Reveal-on-intent is the dominant interaction pattern.** Copy buttons,
   regenerate actions, code block headers, timestamps — all start at 20-30%
   opacity and brighten on hover. This is the single most consistent pattern
   across every premium dark AI interface. It reduces visual noise at rest
   while keeping features discoverable.

7. **4% cream fill, not hex-picked grays.** Using `#F0EDE8` at low opacities
   (`[0.03]`, `[0.04]`, `[0.06]`) for all surface tints guarantees warm
   undertone consistency. Hand-picking gray hex values (`#1A1A1A`, `#222`)
   risks cool-tone drift. The opacity approach makes the warm palette
   self-maintaining.

8. **Accessibility preserved.** All interactive elements retain
   `focus-visible` rings (violet at 30%), `aria-label` attributes, and
   `role="status"` / `aria-live="polite"` for streaming indicators. The WCAG
   contrast ratio for `#F0EDE8` on `#0C0B0A` is approximately 15.5:1 — well
   above AAA requirements. Body text at 90% still exceeds 13:1.

9. **Stop button uses muted red, never solid.** On dark backgrounds, a solid
   red button (`bg-red-500`) would be a visual explosion. Using
   `bg-red-500/10 border-red-500/20 text-red-400` keeps the stop action
   identifiable without breaking the palette.

10. **Header elevated, input flush.** The chat header uses `bg-[#161514]`
    (surface-elevated) to create a shelf. The input area uses `bg-[#0C0B0A]`
    (base) — flush with the message area so the user's eye flows naturally
    from the last message to the input field. This asymmetry (top elevated,
    bottom flush) creates a natural top-down hierarchy.
