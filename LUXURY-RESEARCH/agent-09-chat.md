# Agent 09 — AI Chat Interface: Luxury Dark Treatment

Research document for redesigning Parcel's AI chat experience with a premium
dark aesthetic. Covers message layout, differentiation, markdown rendering,
streaming UX, input area, AI presence, code highlighting, sidebar, empty states,
and competitive analysis of ChatGPT, Claude.ai, and Perplexity dark modes.

**Design tokens:**
- Background: `#0C0B0A` (near-black warm)
- Text: `#F0EDE8` (cream)
- Accent: `#8B7AFF` (violet)
- Muted text: `#F0EDE8/50` (cream at 50% opacity)
- Surface elevated: `#161514` (lifted panels)
- Surface inset: `#0F0E0D` (recessed areas)
- Border: `#F0EDE8/8` (cream at 8% opacity, near-invisible)
- Border hover: `#F0EDE8/12`

---

## 1. Message Bubbles vs Full-Width Rows on Dark

### The Case Against Bubbles on Dark

Bubble-style layouts (iMessage, WhatsApp) introduce multiple color fields floating
on a dark canvas. Each bubble boundary becomes a visual event the eye must process.
On light themes, this works because the page background is neutral and bubbles are
subtle shifts. On dark backgrounds, colored bubbles become glowing blocks that
fragment the visual field and feel consumer-grade.

### Full-Width Rows: The Premium Standard

Every best-in-class AI dark interface -- ChatGPT, Claude.ai, Perplexity, Linear AI,
Raycast AI -- uses full-width rows. The reasons compound on dark:

1. **No floating color blocks.** Alternating row backgrounds are subtle tonal shifts
   (`#0C0B0A` vs `#0F0E0D`) instead of distinct shapes competing for attention.
2. **Markdown breathes.** Tables, code blocks, and lists span the full content width
   without hitting bubble walls. Real estate financial tables need this space.
3. **Dark luxury is about negative space.** Full-width rows with generous padding
   create the open, breathing layout that signals high-end design.
4. **Typography dominance.** Without bubble chrome, the typography becomes the primary
   visual element -- exactly what luxury design demands.

### Full-Width Row Spec for Dark

```tsx
{/* User row — base background, no tint */}
<div className="w-full py-6 px-6 border-b border-[#F0EDE8]/[0.04]">
  <div className="max-w-3xl mx-auto">
    {/* content */}
  </div>
</div>

{/* Assistant row — barely lifted surface */}
<div className="w-full py-6 px-6 bg-[#0F0E0D] border-b border-[#F0EDE8]/[0.04]">
  <div className="max-w-3xl mx-auto flex gap-4">
    {/* avatar + content */}
  </div>
</div>
```

The border between rows uses cream at 4% opacity -- enough to hint at separation
without drawing a visible line. Padding is 24px vertical (py-6) rather than the
light theme's 20px (py-5) because dark backgrounds need more whitespace to avoid
feeling dense.

---

## 2. User vs AI Message Differentiation

### The Problem with Color Blocks on Dark

Bright background blocks behind user messages (e.g., a violet-filled bubble) create
stark contrast against the dark canvas. This is visually loud and breaks the muted,
sophisticated palette. ChatGPT dark mode solved this by removing user bubbles entirely
-- user messages are just right-aligned text on the same dark background.

### Differentiation Strategy: Alignment + Typography + Subtle Tint

**User messages:**
- Right-aligned text (no bubble, no background change)
- Cream text at full opacity `text-[#F0EDE8]`
- Slightly larger line height for readability
- No avatar needed -- alignment alone differentiates

**AI messages:**
- Left-aligned with avatar column
- Text at 90% cream `text-[#F0EDE8]/90` (fractionally softer)
- Role label "Parcel AI" in muted violet `text-[#8B7AFF]/60`
- Subtle surface tint `bg-[#0F0E0D]` on the row

```tsx
{/* User message */}
<div className="max-w-3xl mx-auto flex justify-end">
  <div className="max-w-[85%]">
    <p className="text-[15px] text-[#F0EDE8] leading-relaxed whitespace-pre-wrap">
      {msg.content}
    </p>
  </div>
</div>

{/* AI message */}
<div className="max-w-3xl mx-auto flex gap-4">
  <div className="w-8 h-8 rounded-lg bg-[#8B7AFF]/10 border border-[#8B7AFF]/20
                  flex items-center justify-center shrink-0 mt-0.5">
    <Sparkles size={14} className="text-[#8B7AFF]" />
  </div>
  <div className="flex-1 min-w-0">
    <p className="text-xs font-medium text-[#8B7AFF]/60 mb-1.5">Parcel AI</p>
    <ReactMarkdown components={MD_DARK}>{msg.content}</ReactMarkdown>
  </div>
</div>
```

### Optional: Hover-Reveal Timestamp

On dark backgrounds, timestamps clutter. Show them on hover:

```tsx
<div className="group relative">
  <p className="...">{msg.content}</p>
  <span className="absolute -left-16 top-0 text-[11px] text-[#F0EDE8]/30
                   opacity-0 group-hover:opacity-100 transition-opacity duration-200">
    2:34 PM
  </span>
</div>
```

---

## 3. Markdown Rendering: Dark-Aware Styling

### Full Component Map

```tsx
const MD_DARK: ComponentProps<typeof ReactMarkdown>['components'] = {
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
  code: ({ inline, children }) =>
    inline ? (
      <code className="font-mono text-[13px] bg-[#8B7AFF]/10 text-[#8B7AFF]
                       px-1.5 py-0.5 rounded border border-[#8B7AFF]/10">
        {children}
      </code>
    ) : (
      <pre className="bg-[#0C0B0A] rounded-lg p-4 overflow-x-auto my-3
                      border border-[#F0EDE8]/[0.06]">
        <code className="font-mono text-[13px] text-[#F0EDE8]/80 leading-relaxed">
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

### Key Dark Rendering Principles

- **Text never full white.** Body text is `#F0EDE8` at 90%, creating a warm cream
  that reduces eye strain. Full-opacity cream is reserved for headings and strong.
- **Code blocks go darker than the row.** Using `bg-[#0C0B0A]` (the page background)
  inside an AI row that is `bg-[#0F0E0D]` creates an inset effect. The code block
  appears recessed, which feels natural for code.
- **Table borders are near-invisible.** At 4-6% opacity, they provide structure without
  creating a grid of white lines on the dark canvas.
- **Inline code uses violet tint.** The `bg-[#8B7AFF]/10` + `text-[#8B7AFF]` treatment
  makes inline code feel like a design element, not a markdown artifact. Financial
  figures wrapped in backticks get this treatment automatically.

---

## 4. Streaming Text Animation

### Three States on Dark

**State A: Thinking (no tokens yet)**

Three dots with violet glow, pulsing in sequence:

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

The `shadow` adds a subtle violet glow around each dot -- this works beautifully on
dark and would be invisible on light. It signals "active AI processing" in a way that
feels alive without being distracting.

**State B: Streaming (tokens arriving)**

Blinking cursor bar in violet:

```tsx
{msg.isStreaming && msg.content && (
  <span className="inline-block w-[2px] h-[18px] bg-[#8B7AFF]
                   animate-pulse ml-0.5 align-text-bottom rounded-full
                   shadow-[0_0_8px_rgba(139,122,255,0.3)]"
        aria-hidden="true" />
)}
```

The glow shadow (`shadow-[0_0_8px_rgba(139,122,255,0.3)]`) makes the cursor feel
like it emits light on the dark background -- a subtle premium detail.

**State C: Complete**

Cursor disappears. Action row fades in with staggered opacity:

```tsx
{!msg.isStreaming && msg.role === 'assistant' && msg.content && (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.3, duration: 0.4 }}
    className="flex items-center gap-3 mt-3 pt-3 border-t border-[#F0EDE8]/[0.06]"
  >
    <button className="flex items-center gap-1.5 text-xs text-[#F0EDE8]/30
                       hover:text-[#F0EDE8]/60 transition-colors">
      <Copy size={12} /> Copy
    </button>
    <button className="flex items-center gap-1.5 text-xs text-[#F0EDE8]/30
                       hover:text-[#F0EDE8]/60 transition-colors">
      <RotateCcw size={12} /> Regenerate
    </button>
  </motion.div>
)}
```

Action buttons start at 30% opacity and brighten on hover. At rest they are nearly
invisible, appearing only when the user's attention moves to them. This "reveal on
intent" pattern is a hallmark of luxury dark interfaces.

---

## 5. Chat Input Area

### Premium Dark Input Field

The input area should feel like a contained instrument panel -- slightly elevated
from the base surface, with a refined border treatment.

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
                         transition-all duration-200 shrink-0">
        <Paperclip size={16} />
      </button>

      {/* Textarea */}
      <textarea
        className={cn(
          "flex-1 resize-none rounded-xl",
          "bg-[#F0EDE8]/[0.04] border border-[#F0EDE8]/[0.08]",
          "px-4 py-3 text-[14px] text-[#F0EDE8] placeholder:text-[#F0EDE8]/25",
          "focus:outline-none focus:ring-1 focus:ring-[#8B7AFF]/30",
          "focus:border-[#8B7AFF]/40 transition-all duration-200",
          "min-h-[48px] max-h-[140px] leading-relaxed",
          isStreaming && "opacity-40 cursor-not-allowed"
        )}
        style={{ height: '48px' }}
      />

      {/* Send button — active state */}
      <button className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
        "transition-all duration-200",
        input.trim()
          ? "bg-[#8B7AFF] hover:bg-[#9D8FFF] text-white shadow-[0_0_20px_rgba(139,122,255,0.2)]"
          : "bg-[#F0EDE8]/[0.04] border border-[#F0EDE8]/[0.06] text-[#F0EDE8]/20 cursor-not-allowed"
      )}>
        <Send size={14} />
      </button>
    </div>
    <p className="text-[11px] text-[#F0EDE8]/25 mt-2">
      Enter to send &middot; Shift+Enter for new line
    </p>
  </div>
</div>
```

### Key Design Decisions

- **Input background: 4% cream, not solid gray.** Using opacity on the cream token
  means the input field is tinted warm rather than cool-gray, matching the overall
  palette temperature.
- **Focus ring is violet, not cream.** The `focus:ring-[#8B7AFF]/30` treatment makes
  the active input subtly glow violet, tying it to the AI accent.
- **Send button glow.** When active, the send button gets
  `shadow-[0_0_20px_rgba(139,122,255,0.2)]` -- a diffuse violet aura that signals
  "ready to send" without a harsh border change.
- **Placeholder at 25% opacity.** Dark interfaces need very faint placeholder text.
  Standard 50% is too prominent against near-black.

---

## 6. AI Avatar / Icon Presence

### Design Options Evaluated

| Approach | Pros | Cons |
|----------|------|------|
| Sparkles icon in tinted square | Clean, scalable, no asset dependency | Generic, many AI apps use sparkles |
| Custom logomark | Brand-specific, memorable | Requires design asset, may not scale to 8x8 |
| Gradient orb | Feels alive, premium | Hard to keep readable at small sizes |
| Lettermark "P" | Simple, brand-aligned | Could read as user initial |
| Animated ring | Signals "active AI" during streaming | Distracting when idle |

### Recommended: Sparkles in Frosted Violet Glass

```tsx
{/* AI avatar — idle */}
<div className="w-8 h-8 rounded-lg bg-[#8B7AFF]/10
                border border-[#8B7AFF]/15
                flex items-center justify-center shrink-0
                backdrop-blur-sm">
  <Sparkles size={14} className="text-[#8B7AFF]" />
</div>

{/* AI avatar — streaming (animated glow ring) */}
<div className="w-8 h-8 rounded-lg bg-[#8B7AFF]/10
                border border-[#8B7AFF]/20
                flex items-center justify-center shrink-0
                shadow-[0_0_12px_rgba(139,122,255,0.15)]
                animate-pulse">
  <Sparkles size={14} className="text-[#8B7AFF]" />
</div>
```

The "frosted glass" effect (`backdrop-blur-sm` + low-opacity background) makes the
avatar feel like it exists on a separate plane from the content. During streaming, the
avatar pulses with a violet glow to reinforce "the AI is working."

### User Avatar on Dark

```tsx
<div className="w-8 h-8 rounded-full bg-[#F0EDE8]/10
                flex items-center justify-center shrink-0">
  <span className="text-xs font-semibold text-[#F0EDE8]/70">IF</span>
</div>
```

User avatar is intentionally understated: 10% cream background, 70% text. The AI
avatar should be the more prominent presence in the conversation.

---

## 7. Code Syntax Highlighting on Dark

### Theme Comparison

| Theme | Aesthetic | Background | Parcel Fit |
|-------|-----------|------------|------------|
| One Dark Pro | Cool purple-blue tones | #282C34 | Good but slightly cool for warm palette |
| Dracula | Vivid purples, greens, pinks | #282A36 | Colors too saturated, fights the muted cream |
| GitHub Dark | Neutral, restrained | #0D1117 | Close match for warm-neutral but lacks warmth |
| Catppuccin Mocha | Warm pastels on dark | #1E1E2E | Best warmth match, sophisticated palette |
| Custom (recommended) | Tuned to Parcel tokens | #0C0B0A | Perfect integration |

### Recommended: Custom Theme Derived from Catppuccin Mocha

Catppuccin Mocha's warm pastel approach aligns with Parcel's cream-on-dark direction.
Adapt its hues to Parcel's token system:

```css
/* Custom syntax highlight tokens */
--code-bg: #0C0B0A;        /* page background — inset effect */
--code-text: #F0EDE8cc;    /* cream at 80% */
--code-keyword: #8B7AFF;   /* violet accent — if, const, return */
--code-string: #A6DA95;    /* soft green — string literals */
--code-number: #F5A97F;    /* warm amber — numeric values */
--code-comment: #F0EDE840; /* cream at 25% — comments */
--code-function: #8AADF4;  /* sky blue — function names */
--code-property: #F0C6C6;  /* soft pink — object properties */
--code-operator: #F0EDE860;/* cream at 37% — operators */
```

### Code Block Container

```tsx
<pre className="relative bg-[#0C0B0A] rounded-lg overflow-x-auto my-3
                border border-[#F0EDE8]/[0.06] group">
  {/* Language label + copy button — appear on hover */}
  <div className="flex items-center justify-between px-4 py-2
                  border-b border-[#F0EDE8]/[0.04]
                  opacity-0 group-hover:opacity-100 transition-opacity">
    <span className="text-[11px] text-[#F0EDE8]/25 uppercase tracking-wider">
      {language}
    </span>
    <button className="text-[11px] text-[#F0EDE8]/30 hover:text-[#F0EDE8]/60
                       transition-colors">
      Copy
    </button>
  </div>
  <code className="block p-4 font-mono text-[13px] leading-relaxed">
    {/* Highlighted tokens */}
  </code>
</pre>
```

The language label and copy button are hidden until hover -- "reveal on intent."

---

## 8. Conversation Sidebar on Dark

### Desktop Sidebar (280px)

```tsx
<aside className="w-[280px] shrink-0 border-r border-[#F0EDE8]/[0.06]
                  bg-[#0C0B0A] flex flex-col h-full">
  {/* New chat button */}
  <div className="p-4">
    <button className="w-full py-2.5 rounded-xl bg-[#8B7AFF]
                       hover:bg-[#9D8FFF] text-white text-sm font-medium
                       transition-all duration-200
                       shadow-[0_0_20px_rgba(139,122,255,0.15)]">
      New Conversation
    </button>
  </div>

  {/* Search */}
  <div className="px-4 pb-3">
    <input placeholder="Search..."
           className="w-full px-3 py-2 text-sm bg-[#F0EDE8]/[0.04]
                      border border-[#F0EDE8]/[0.06] rounded-lg
                      text-[#F0EDE8]/80 placeholder:text-[#F0EDE8]/20
                      focus:outline-none focus:border-[#8B7AFF]/30" />
  </div>

  {/* Conversation list */}
  <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
    {/* Date group label */}
    <p className="text-[11px] uppercase tracking-wider text-[#F0EDE8]/20
                  font-medium px-3 py-2 mt-2">
      Today
    </p>

    {/* Conversation item — default */}
    <button className="w-full text-left px-3 py-2.5 rounded-lg
                       hover:bg-[#F0EDE8]/[0.04] transition-colors group">
      <p className="text-sm text-[#F0EDE8]/70 truncate group-hover:text-[#F0EDE8]/90">
        BRRRR analysis for 123 Main St
      </p>
      <p className="text-[11px] text-[#F0EDE8]/20 mt-0.5">2 hours ago</p>
    </button>

    {/* Conversation item — active */}
    <button className="w-full text-left px-3 py-2.5 rounded-lg
                       bg-[#8B7AFF]/10 border border-[#8B7AFF]/15">
      <p className="text-sm text-[#8B7AFF] font-medium truncate">
        Wholesale MAO calculator
      </p>
      <p className="text-[11px] text-[#8B7AFF]/40 mt-0.5">Just now</p>
    </button>

    {/* Unread indicator — violet dot */}
    <button className="w-full text-left px-3 py-2.5 rounded-lg
                       hover:bg-[#F0EDE8]/[0.04] transition-colors relative">
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

### Design Notes for Sidebar on Dark

- **No background differentiation from main area.** Both use `#0C0B0A`. The sidebar
  is defined only by its right border. This creates a seamless dark expanse.
- **Timestamps at 20% opacity.** Barely visible until the user scans for them.
- **Active state uses violet tint, not a bright background.** `bg-[#8B7AFF]/10` is
  enough to mark the selected conversation without breaking the dark uniformity.
- **Unread dot: solid violet, no animation.** A tiny 6px dot is sufficient. Pulsing
  dots in a sidebar are distracting.

---

## 9. Empty Chat State: Suggested Prompts on Dark

```tsx
<motion.div
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
  className="flex flex-col items-center justify-center h-full
             min-h-[400px] space-y-10 px-6"
>
  {/* AI icon — large, glowing */}
  <div className="flex flex-col items-center gap-4">
    <div className="w-16 h-16 rounded-2xl bg-[#8B7AFF]/10
                    border border-[#8B7AFF]/15
                    flex items-center justify-center
                    shadow-[0_0_40px_rgba(139,122,255,0.08)]">
      <Sparkles size={28} className="text-[#8B7AFF]" />
    </div>
    <div className="text-center space-y-2">
      <h3 className="text-xl font-semibold text-[#F0EDE8]">Parcel AI</h3>
      <p className="text-sm text-[#F0EDE8]/40 max-w-sm leading-relaxed">
        Ask about deal analysis, financing structures, market comps,
        or any real estate investment question.
      </p>
    </div>
  </div>

  {/* Suggested prompt cards */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
    {SUGGESTED_QUESTIONS.map((q, i) => (
      <motion.button
        key={q.question}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 + i * 0.05 }}
        onClick={() => void handleSend(q.question)}
        className="text-left p-4 rounded-xl
                   bg-[#F0EDE8]/[0.03] border border-[#F0EDE8]/[0.06]
                   hover:bg-[#F0EDE8]/[0.06] hover:border-[#8B7AFF]/20
                   transition-all duration-200 group cursor-pointer"
      >
        <p className="text-[11px] uppercase tracking-wider text-[#F0EDE8]/25
                      font-medium group-hover:text-[#8B7AFF]/60 transition-colors">
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

### Design Notes

- **Diffuse violet glow** on the central icon (`shadow-[0_0_40px_...]` at 8% opacity)
  creates a halo effect that reads as "AI presence" without being garish.
- **Prompt cards use 3% cream background.** They exist as ghostly panels on the dark
  canvas. On hover, they brighten to 6% and the border shifts violet -- signaling
  interactivity without any jarring state change.
- **Category labels at 25% opacity.** Nearly invisible at rest, they brighten to violet
  on hover. This "progressive disclosure of chrome" is a luxury pattern.
- **Staggered animation** with 50ms delay per card creates a cascading reveal.

---

## 10. Competitive Analysis: Dark Chat Interfaces

### ChatGPT (Dark Mode)

**Background:** `#212121` main, `#2F2F2F` sidebar -- warm dark grays, not pure black.
**Messages:** Full-width rows, no bubbles. User messages have no background differentiation
at all -- just right-indented text. AI messages display inline with no row tint change.
**Input:** Rounded pill with dark gray fill, white text, green send button.
**Streaming:** Blinking cursor (thin vertical line), very fast token rendering.
**Code blocks:** Gray background (#1E1E1E) with syntax highlighting, language label and
copy button visible at all times.
**Strengths:** Extreme simplicity. No visual noise. Conversations feel like reading a
document.
**Weakness:** Sometimes hard to distinguish user from AI messages when scanning quickly.

### Claude.ai (Dark Mode)

**Background:** `#191918` (warm near-black), sidebar `#191918` same as main.
**Messages:** Full-width rows. AI messages have a barely-perceptible warm tint. User
messages are right-aligned text with a tan/cream-tinted bubble (subtle).
**Input:** Wide rounded rectangle with soft border, warm-toned placeholder text.
**AI avatar:** Orange circle with "C" -- distinct, brand-consistent.
**Streaming:** Progressive text render with a subtle cursor. Smooth and fast.
**Code blocks:** Dark background with muted syntax colors, copy button appears on hover.
**Strengths:** Warmest dark theme of the three. Feels organic and approachable despite
being dark. The warm undertone prevents the interface from feeling clinical.
**Weakness:** The user message bubble, while subtle, is slightly inconsistent with the
otherwise bubble-free AI messages.

### Perplexity (Dark Mode)

**Background:** `#1B1B1B` main, `#1B1B1B` sidebar with left nav icons.
**Messages:** Card-like AI responses with subtle borders. User messages are minimal text
above each card. Sources displayed as small favicon chips above the answer.
**Input:** Centered search-bar style with rounded corners, magnifying glass icon, subtle
border.
**Streaming:** Text progressively appears within the card boundary. Sources load first,
then the answer streams below them.
**Code blocks:** Dark background, syntax highlighting with copy and run buttons.
**Strengths:** The source-first, answer-second pattern is unique and builds trust. Card
treatment makes each answer feel self-contained and scannable.
**Weakness:** Card borders on dark can feel busy when multiple answers stack up.

### Synthesis: What Parcel Should Take

| Pattern | Source | Apply to Parcel |
|---------|--------|-----------------|
| No user message bubble | ChatGPT | Yes -- right-aligned plain text |
| Warm dark undertone | Claude.ai | Yes -- `#0C0B0A` is warm, not blue-black |
| Hover-reveal copy button on code | Claude.ai, Perplexity | Yes -- "reveal on intent" |
| AI avatar as brand mark | Claude.ai | Yes -- violet sparkles icon |
| Streaming cursor glow | None (novel) | Yes -- violet glow on dark is a differentiator |
| Progressive card animation | Perplexity | No -- overkill for a chat-focused UI |
| Source citations inline | Perplexity | Future -- when Parcel adds document RAG |

---

## RECOMMENDATIONS FOR PARCEL

1. **Use full-width rows, not bubbles.** On dark backgrounds, floating bubbles create
   visual noise. Full-width rows with `max-w-3xl mx-auto` and alternating surface
   tints (`#0C0B0A` / `#0F0E0D`) are the universal premium standard. This also solves
   table and code block width constraints.

2. **Differentiate user/AI by alignment and typography alone.** User messages:
   right-aligned, full cream opacity, no background. AI messages: left-aligned with
   violet avatar, 90% cream text, barely-there surface tint. No color blocks needed.

3. **Build a custom dark markdown component map (MD_DARK).** Every text element needs
   dark-specific opacity tuning. Body at 90%, muted at 40%, table cells at 70%.
   Inline code uses `bg-[#8B7AFF]/10 text-[#8B7AFF]` to make financial figures glow
   with the brand accent. Code blocks use the base background `#0C0B0A` for an inset
   effect.

4. **Add violet glow to streaming indicators.** The thinking dots and streaming cursor
   should include `shadow-[0_0_6-8px_rgba(139,122,255,0.3-0.4)]`. This is a zero-cost
   dark-mode premium detail that communicates "AI activity" with elegance. It would be
   invisible on light -- this is a dark-only advantage.

5. **Adopt a custom code syntax theme based on Catppuccin Mocha.** The warm pastel
   palette (soft green strings, amber numbers, violet keywords) matches Parcel's
   cream-on-dark direction. Dracula and One Dark are too saturated and cool-toned for
   this palette.

6. **Design input area with violet focus glow.** Replace lime focus rings with
   `focus:ring-[#8B7AFF]/30 focus:border-[#8B7AFF]/40`. The send button should emit
   a diffuse violet shadow when active: `shadow-[0_0_20px_rgba(139,122,255,0.2)]`.

7. **Style the conversation sidebar with minimal differentiation.** Same base background
   as the main area, separated only by a 6% cream border. Active conversation uses
   `bg-[#8B7AFF]/10`, unread indicator is a solid 6px violet dot. Timestamps at 20%
   opacity.

8. **Empty state: centered violet-glow icon + ghost prompt cards.** The welcome screen
   should feature a large sparkles icon with a 40px diffuse violet halo, descriptive
   text at 40% cream, and prompt cards at 3% cream fill that brighten to 6% on hover
   with a violet border shift. Stagger card entrance by 50ms.

9. **Embrace "reveal on intent" across all actions.** Copy buttons, regenerate buttons,
   timestamps, code block headers -- all should start at very low opacity (20-30%) and
   brighten on hover. This reduces visual clutter at rest while keeping everything
   accessible. It is the single most consistent pattern across ChatGPT, Claude.ai, and
   Perplexity dark modes.

10. **Use warm opacity tints instead of gray hex values.** Instead of picking specific
    gray hex codes for every surface, use `#F0EDE8` (cream) at varying opacities:
    3% for card fills, 6% for hover states, 8% for borders, 25% for muted text. This
    ensures every surface shares the same warm undertone and the palette stays cohesive
    automatically.
