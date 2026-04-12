# Video Research Deep Dive: Web Design, Landing Pages & Scroll-Driven Animations

**Date:** 2026-04-09  
**Purpose:** Synthesize findings from 11 YouTube videos to inform the Parcel platform landing page redesign  
**Videos Analyzed:** 11 (7 Sam Crawford, 1 AI Chris Lee, 1 Nate Herk, 1 Jay E / RoboNuggets, 1 Squarespace tutorial)

---

## Table of Contents

1. [Per-Video Summaries](#1-per-video-summaries)
2. [Master Findings](#2-master-findings)
3. [Parcel Landing Page Recommendations](#3-parcel-landing-page-recommendations)
4. [Updated Hero Implementation Spec](#4-updated-hero-implementation-spec)

---

## 1. Per-Video Summaries

### Video 1: "I Studied 1,000 Websites, Here's What Works in 2026" — Sam Crawford

**Screenshots:** `SAD/video-screenshots/vid_01_studied_1000/`

**Key Takeaways:**
- Clarity is the single most important quality. Every page must answer three questions in the first scroll: *What is this? Who is it for? What do I do next?*
- A single CTA path, repeated consistently throughout the page, outperforms multi-CTA strategies every time.
- Social proof and testimonials deliver more conversion lift than beautiful design alone.
- Heavy motion is overrated. Luxury brands use restraint, negative space, and silence to communicate value.
- Micro details — custom badges, hover states, contextual form elements — separate good sites from exceptional ones.
- Core principle: *"If everything is loud, you end up hearing nothing."*

**Parcel Relevance:** Our hero section must achieve immediate clarity. The primary CTA should be singular ("Get Started Free") and repeated at every natural decision point. Restraint in animation is a feature, not a compromise.

---

### Video 2: "The NEW WAY of Web Design in 2026" — Sam Crawford

**Screenshots:** `SAD/video-screenshots/vid_02_new_way/`

**Key Takeaways:**
- Strategy must precede design. Three questions to answer before opening a design tool: Who lands here? What do they already know? What should they do?
- Site maps and wireframes before visual design. Structure is the foundation.
- Typography has more impact than almost anything else — more than color, more than layout, more than imagery.
- Color discipline: 2-3 main colors used with intention. Restraint in palette creates cohesion.
- White space is not wasted space — it is active design.
- Single CTA repeated throughout (reinforcing Video 1).
- Client autonomy in CMS matters for long-term maintenance.

**Parcel Relevance:** Our section order should follow visitor psychology (awareness, interest, desire, action). Typography — Satoshi 300 — is already a strength and should be leaned into as a primary differentiator.

---

### Video 3: "Why Do Some Websites Just Look So Good?" — Sam Crawford

**Screenshots:** `SAD/video-screenshots/vid_03_look_good/`

**Key Takeaways:**
- Three principles that separate premium from mediocre:
  1. **Hierarchy & Action** — One dominant focal point per section. Nothing should compete for attention.
  2. **Taste = Intentional Restraint** — What you leave out is louder than what you include. Every addition must earn its place.
  3. **Micro Details** — Consistent spacing, thoughtful hover states, custom elements. These signal care and precision.
- Linear and Stripe cited as exemplars of all three principles working in concert.
- White space instills confidence — it communicates that there is nothing to hide.
- AI-generated sites all share the same gradients, structure, and generic aesthetic. Taste is the differentiator that AI cannot replicate.
- Warning: *"A restrained site with sloppy details still feels cheap."*

**Parcel Relevance:** Each section of our landing page needs ONE dominant focal point — no competing elements. Our existing design system (Satoshi + warm grays + violet #8B7AFF) already has taste. The risk is diluting it by adding too much, not too little.

---

### Video 4: "You're Not Ready for The Next Phase of Web Design" — Sam Crawford

**Screenshots:** `SAD/video-screenshots/vid_04_next_phase/`

**Key Takeaways:**
- Five paradigm shifts in web design:
  1. Death of the gatekeeper model — anyone can build, but few can build well.
  2. AI commoditizes the bottom 30% of web design work.
  3. The moat is thinking, not code — strategy and taste cannot be automated.
  4. AI as workflow accelerator, not replacement.
  5. The designer role evolves into strategist.
- The defensible moat is strategy, taste, and business understanding. AI can generate layout but cannot have a point of view.

**Parcel Relevance:** Our landing page must demonstrate strategic thinking, not just technical capability. The page itself is our "taste moat" — it communicates the quality of thinking behind the product.

---

### Video 5: "2026 Web Design Trends You Need to Know" — Sam Crawford

**Screenshots:** `SAD/video-screenshots/vid_05_trends/`

**Key Takeaways:**
- 10 trends for 2026:
  1. **Human-made design** — Anti-AI aesthetic. Deliberate imperfection and craft signals.
  2. **Strategic design thinking** — Design serves business goals, not ego.
  3. **Organic layouts / anti-grid** — Breaking rigid grid systems for visual interest.
  4. **Motion narrative** — Intentional movement that tells a story, not decoration.
  5. **Glassmorphism 2.0** — Subtle, tactile glass effects (not the heavy 2021 version).
  6. **Archival index aesthetic** — Structured, editorial design language.
  7. **Micro-interactions with purpose** — Every interaction serves understanding.
  8. **Accessibility first** — Inclusive design as a baseline, not an afterthought.
  9. **AI as creative partner** — Using AI to accelerate, not replace, human design decisions.
  10. **Performance-first creativity** — Beautiful and fast are not mutually exclusive.

**Parcel Relevance:** Motion narrative is directly applicable — our scroll animation should TELL A STORY (a building assembling = a deal analysis assembling). Glassmorphism 2.0 aligns with our existing `.glass` utility. Performance-first creativity demands optimized frame loading and lazy resource strategies.

---

### Video 6: "The Psychology of Premium Websites" — Sam Crawford

**Screenshots:** `SAD/video-screenshots/vid_06_psychology/`

**Key Takeaways:**
- Three psychological principles that make sites feel premium:
  1. **Halo Effect** — The first 50ms of visual impression colors ALL subsequent judgment. The hero section is the most important real estate on the entire site.
  2. **Cognitive Load / Processing Fluency** — Easy to process = perceived as trustworthy. White space, clear hierarchy, simple navigation reduce cognitive load. The easier something is to understand, the more it feels premium.
  3. **Peak-End Rule** — People remember the peak emotional moment and the final moment. Micro-interactions create peaks of positive emotion throughout the experience.
- Exemplars: Apple (stunning product shot + single headline), Hermes (extreme white space = exclusivity).
- Framework: Engineer the first impression. Declare war on cognitive load. Hunt for micro-interaction opportunities.

**Parcel Relevance:** Our hero section MUST be flawless — it sets the halo for the entire site and product. Every section should be evaluated for cognitive load reduction. Specific micro-interaction peaks to implement: typing animation in the AI narrative demo, animated tab switches in feature sections, count-up animations on statistics.

---

### Video 7: "How To Build a Website SO Premium They Beg You To Buy" — Sam Crawford

**Screenshots:** `SAD/video-screenshots/vid_07_premium/`

**Key Takeaways:**
- Bespoke assets (not generic stock icons) create depth and authenticity. Custom illustration and photography communicate investment in the brand.
- Brand guidelines are foundational — logo, color palette, fonts must be established before page design. A cohesive palette creates mood.
- Subtle animation (fade-in on scroll, button hover responses) reduces "rage clicks" and communicates interactivity.
- Site architecture: every page has a purpose, leads somewhere, creates a clear journey. No dead ends.
- CTAs must be obvious, easy to find, and easy to take. Friction kills conversion.
- The formula: SEO + UX + CTAs = ROI.

**Parcel Relevance:** Our custom graphics (browser chrome mockups, strategy badges, deal analysis visualizations) ARE bespoke assets — lean into them. Animation should guide the eye and confirm interaction, not overwhelm. Every section should lead naturally toward the CTA.

---

### Video 8: "How to Link Buttons to Sections in Squarespace" — Sam Crawford

**Screenshots:** `SAD/video-screenshots/vid_08_squarespace/`

**Key Takeaways:**
- Squarespace anchor link tutorial. Step-by-step walkthrough of section ID assignment and button linking.

**Parcel Relevance:** Minimal. Not applicable to our React/Vite stack. Included for catalog completeness only.

---

### Video 9: "Everyone Builds 3D Websites with Claude Code. I Sell Them for $10K." — AI Chris Lee

**Screenshots:** `SAD/video-screenshots/vid_09_3d_websites/`

**Key Takeaways:**
- **THE FRAME SEQUENCE TECHNIQUE** explained in full detail:
  1. Create two images: assembled state and exploded/deconstructed state.
  2. Generate a transition video using Kling 3.0 (assembled to exploded, or reverse).
  3. Extract individual frames from the video using ffmpeg.
  4. Map scroll position to frame index — video plays forward on scroll down, reverses on scroll up.
- Implementation prompt pattern: *"Build a scroll-driven frame animation website. Video plays forward as user scrolls down, reverses on scroll up."*
- Three.js was mentioned but the actual technique is simpler: HTML canvas element + frame image swapping based on scroll position.
- Critical iteration insight: the first version is NEVER perfect. Iterate on scroll speed, element positioning, and background color.
- **Background color must match the video/frame background color** so the animation looks seamless — no visible boundary between frame content and page.
- Recommended layout: product/animation right-aligned, headline and copy center-left.

**Parcel Relevance:** DIRECTLY applicable to our hero implementation. Our frame extraction pipeline (121 frames from hero-assembly.mp4) follows this exact technique. Background color #0C0B0A matching the frame background is already correctly implemented. Product right / text left layout is already in place. This video validates our approach entirely.

---

### Video 10: "The NEW Nano Banana 2 + Claude Code = $10k Websites" — Nate Herk

**Screenshots:** `SAD/video-screenshots/vid_10_nano_banana/`

**Key Takeaways:**
- Detailed walkthrough of the SKILL.md workflow approach for building frame-sequence sites.
- Technical pipeline confirmed: video source -> ffmpeg frame extraction -> WebP frame conversion -> scroll position maps to frame index.
- Key quote: *"It basically takes that video, pulls out like 120 frames, and then associates each frame with a scroll position."*
- Workflow: Plan mode first, then build. Start frame + end frame -> AI video generation -> frame extraction -> scroll-driven website assembly.
- Deployment pipeline: GitHub -> Vercel. Critical gotcha: **.gitignore excluding frame images** is a common deployment failure. Frames MUST be included in the deployed build — they are runtime assets, not build artifacts.
- Mobile optimization is explicitly a separate step. Desktop-first, then adapt.
- Layout: *"Product video right-aligned on the right two-thirds of the page, text left-aligned."*

**Parcel Relevance:** Confirms our frame-sequence architecture is correct and industry-standard. The Vercel deployment gotcha is critical — we must verify our frames are included in the production build (check Vite's public directory handling). Right 2/3 for animation, left 1/3 for text matches our current layout spec. Plan-then-build workflow aligns with our sprint methodology.

---

### Video 11: "This AI Agent Builds $15K Cinematic Websites on Autopilot" — Jay E / RoboNuggets

**Screenshots:** `SAD/video-screenshots/vid_11_cinematic/`

**Key Takeaways:**
- Four-step agent pipeline for cinematic website creation:
  1. **Brand analysis** — understand the brand's visual language, values, and audience.
  2. **Scene generation** — create cinematic video/image assets matching the brand.
  3. **Website build** — assemble the site using cinematic modules.
  4. **Deploy** — ship to production.
- **"Cinematic modules"** — a library of 30+ modular, animation-driven components:
  - Accordion sliders, reveal text, kinetic text, typewriter effect
  - SVG draw animations, flip cards, image trails
  - Glitch effects, parallax layers, scroll-triggered reveals
- The scroll-driven video technique restated: *"Extract individual frames of video and map to scrolling action."*
- Brand card staging step for approval before building — ensures alignment before development cost.
- WaveSpeed API for programmatic access to Kling 3.0 video generation.
- Key architectural patterns codified in a SKILL.md reference file.

**Parcel Relevance:** The "cinematic modules" concept maps directly to our section components. Our existing AINarrativeDemo typing effect IS a "typewriter cinematic module." The brand analysis step corresponds to our already-established design system (Satoshi, violet #8B7AFF, warm grays, dual-theme). Future enhancement candidates from the cinematic module library: reveal text animations, SVG draw animations for the deal analysis flow, and scroll-triggered section reveals.

---

## 2. Master Findings

### 2.1 Hero Techniques

| Finding | Source(s) | Confidence |
|---------|-----------|------------|
| Frame sequence (video -> frame extraction -> scroll-mapped playback) is the standard technique for scroll-driven product animation | Videos 9, 10, 11 | Very High |
| Background color MUST match frame background for seamless integration | Videos 9, 10 | Very High |
| Layout: animation/product occupies right 2/3, text/CTA occupies left 1/3 | Videos 9, 10 | High |
| Hero section has 50ms to establish the Halo Effect — it is the most important section | Video 6 | Very High |
| Single dominant focal point, no competing elements | Videos 1, 3, 6 | Very High |
| Answer "What is this? Who is it for? What do I do next?" in the first scroll | Video 1 | Very High |
| First version is never perfect — plan for iteration on scroll speed and positioning | Video 9 | High |

**Synthesis:** The hero section is simultaneously the highest-impact area (Halo Effect) and the most technically complex (frame sequence animation). The three technical videos (9, 10, 11) converge on the identical approach: extract ~120 frames from a short video, render them on a canvas element, and map scroll position to frame index. Our current implementation (121 JPG frames, canvas rendering, Framer Motion useScroll) is validated by all three sources. The layout consensus (product right, text left) matches our current spec. The one universal rule: background color must match the frames.

---

### 2.2 Animation Patterns

| Pattern | Description | Source(s) |
|---------|-------------|-----------|
| Motion narrative | Animation tells a story — sequence has meaning, not just aesthetics | Video 5 |
| Scroll-driven frame sequence | Map scroll position to pre-extracted video frames for cinematic playback | Videos 9, 10, 11 |
| Purposeful micro-interactions | Hover states, button responses, toggle animations that confirm user action | Videos 1, 3, 5, 7 |
| Subtle fade-in on scroll | Sections reveal as they enter viewport — not dramatic, just present | Video 7 |
| Typing/typewriter effect | Character-by-character text reveal for AI-generated content | Video 11 |
| SVG draw animations | Paths animate to completion, suggesting building/creation | Video 11 |
| Count-up statistics | Numbers animate from 0 to target value when entering viewport | Video 6 |
| Restraint over excess | *Less animation, more impact.* Heavy motion is overrated. | Videos 1, 3, 5, 6 |

**Synthesis:** The consensus across all videos is that animation must serve narrative or interaction — never decoration. Sam Crawford repeatedly emphasizes restraint: the most premium sites use LESS motion, not more. When animation IS used, it should do one of three things: (1) tell a story, (2) confirm an interaction, or (3) guide attention. The frame sequence technique is inherently narrative (something assembles/transforms) and should be the primary animation investment. All other animations should be subtle and purposeful.

**The Restraint Principle:** If we budget 100 "animation units" for the entire page, 60 should go to the hero frame sequence, 25 to micro-interactions (hovers, toggles, typing effect), and 15 to section entry animations. This allocation ensures one dominant motion element (the hero) with supporting details that don't compete.

---

### 2.3 Design Principles

| Principle | Evidence | Application |
|-----------|----------|-------------|
| **Clarity over cleverness** | Video 1 (1000 sites studied): clarity is #1 | Every section earns its place by answering a visitor question |
| **Restraint is luxury** | Videos 1, 3, 5, 6: white space, fewer elements, intentional minimalism | Remove before adding. Each element must justify its existence |
| **Single CTA path** | Videos 1, 2, 7: one action, repeated | "Get Started Free" is the singular CTA, present in hero, mid-page, and footer |
| **Typography as differentiator** | Video 2: more impact than almost anything else | Satoshi 300 is our strongest visual asset — give it space to breathe |
| **Halo Effect engineering** | Video 6: first 50ms colors all judgment | Invest disproportionately in hero section quality |
| **Cognitive load reduction** | Video 6: easy to process = trustworthy | White space, clear hierarchy, one focal point per section |
| **Peak-End Rule** | Video 6: people remember peaks and endings | Engineer 2-3 micro-interaction peaks + a strong closing section |
| **Bespoke assets** | Videos 3, 7: custom elements signal investment | Browser chrome mockups, custom badges, deal visualization graphics |
| **Taste as moat** | Videos 3, 4: AI generates layout but not point of view | Our design system IS our taste — don't dilute with trendy additions |
| **Anti-AI aesthetic** | Videos 3, 5: same gradients/structure = "template look" | Avoid the generic gradient-mesh + glassmorphism + dark-mode cliches |

**Synthesis:** The overarching message across Sam Crawford's seven videos is a single thesis: **premium web design is the art of intentional restraint combined with obsessive micro-detail.** You achieve luxury not by adding impressive features, but by removing everything unnecessary and then perfecting what remains. This directly maps to our design system — Satoshi 300, warm grays, violet #8B7AFF, generous white space — which is already a restrained palette. The risk is not that we'll build something ugly. The risk is that we'll add so many "cool" things that we dilute the existing taste.

---

### 2.4 Section Structure & Copy

**Recommended section order based on visitor psychology (Videos 1, 2, 6, 7):**

| Order | Section | Visitor Question Answered | Primary Element |
|-------|---------|---------------------------|-----------------|
| 1 | Hero | "What is this? Is it for me?" | Frame sequence animation + single headline + CTA |
| 2 | Social Proof Bar | "Do others trust this?" | Logo bar or stat counters |
| 3 | Problem/Pain | "Do they understand my problem?" | Copy-driven section, minimal graphics |
| 4 | Solution Demo | "How does it actually work?" | Interactive demo / AI narrative typing effect |
| 5 | Features | "What specifically does it do?" | Feature grid with one focal point per card |
| 6 | Testimonials | "What do real users say?" | Direct quotes with names and context |
| 7 | Pricing | "What does it cost?" | Three tiers (Steel/Carbon/Titanium) |
| 8 | Final CTA | "I'm convinced — what's next?" | Strong closing CTA, same as hero |

**Copy principles from the research:**
- Headlines: short, declarative, benefit-oriented. No jargon.
- Subheads: one sentence expanding the headline. Conversational tone.
- Body: scannable. Bullet points over paragraphs.
- CTA text: action-oriented, low commitment ("Get Started Free" not "Sign Up Now").

---

### 2.5 Performance & Mobile

| Concern | Finding | Source(s) | Mitigation |
|---------|---------|-----------|------------|
| Frame loading weight | 121 frames at JPG quality creates significant payload | Videos 9, 10 | Preload first 10 frames eagerly, lazy-load remainder. Consider WebP conversion. |
| Mobile is a separate pass | Desktop-first, then adapt for mobile | Video 10 | Mobile may need fewer frames, simpler animation, or static fallback |
| Performance-first creativity | Beautiful AND fast are not mutually exclusive | Video 5 | Lighthouse audit after each animation addition |
| Deployment frame inclusion | .gitignore or build config can exclude frames from deploy | Video 10 | Verify frames in Vite `public/` directory are included in production build |
| Background color match | Mismatch creates visible seam around animation | Videos 9, 10 | Page background #0C0B0A must exactly match frame background |
| Scroll jank | Frame swapping on scroll can cause jank if not optimized | Video 9 | requestAnimationFrame throttling, canvas rendering (not img src swapping) |

**Mobile Strategy:**
- The frame sequence is primarily a desktop experience.
- Mobile options (in order of preference):
  1. Reduced frame count (every 3rd frame = ~40 frames) for smaller payload
  2. Static hero image (assembled state) with CSS animation fallback
  3. Auto-playing compressed video (removes scroll interactivity but preserves visual)
- All videos agree: mobile optimization is a distinct, dedicated effort — not an afterthought bolted onto desktop.

---

### 2.6 Mistakes to Avoid

| Mistake | Why It Hurts | Source(s) |
|---------|-------------|-----------|
| **Over-animating** | If everything moves, nothing stands out. Cognitive overload kills premium feeling. | Videos 1, 3, 5 |
| **Multiple CTAs competing** | Decision paralysis. Visitor doesn't know what to do. | Videos 1, 2, 7 |
| **Generic AI aesthetic** | Gradient meshes + glassmorphism + dark mode = "I used a template." The new "template look." | Videos 3, 5 |
| **Ignoring first-scroll clarity** | If a visitor can't answer "what is this" in 3 seconds, they leave. | Video 1 |
| **Sloppy micro details** | Inconsistent spacing, missing hover states, generic icons. Restraint + sloppy = cheap. | Videos 3, 7 |
| **Frames not deploying** | .gitignore or build config excluding frame images from production. Blank hero in production. | Video 10 |
| **Background color mismatch** | Animation canvas has a visible rectangular boundary against the page. Instantly breaks immersion. | Videos 9, 10 |
| **Skipping wireframe/strategy** | Jumping to visual design before establishing structure leads to rework. | Video 2 |
| **Mobile as afterthought** | Frame-heavy scroll animations can be unusable on mobile. Must be a separate design pass. | Video 10 |
| **No social proof** | Testimonials and trust signals convert more than beautiful design. Omitting them is leaving money on the table. | Video 1 |

---

## 3. Parcel Landing Page Recommendations

### 3.1 Immediate Actions (Pre-Build)

1. **Lock the CTA.** One CTA: "Get Started Free." It appears in the hero, after the demo section, and in the closing section. No competing secondary CTAs.

2. **Audit the hero for clarity.** The hero must answer: "Parcel analyzes real estate deals using AI so investors can make faster, more confident decisions. Start free." If our hero copy doesn't communicate this in one glance, rewrite before building.

3. **Verify frame deployment.** Confirm that all 121 frames in `public/images/hero-frames/` will be included in the Vite production build. Run `npx vite build` and check the output `dist/` directory for frame inclusion. This is the #1 deployment risk identified across the technical videos.

### 3.2 Design System Reinforcement

4. **Lean into Satoshi 300.** Typography is our strongest differentiator (Video 2). Give headlines generous size (clamp-based fluid type), generous letter-spacing, and generous surrounding white space. Let the typeface do the work.

5. **Enforce one focal point per section.** Audit each section for competing visual elements. If a section has a demo AND a headline AND an icon AND a badge all fighting for attention, something needs to go.

6. **Maintain restraint.** Our palette (violet #8B7AFF, warm grays, #0C0B0A dark background) is already tasteful and restrained. Resist the urge to add gradient meshes, extra accent colors, or decorative elements. The anti-AI-aesthetic trend (Video 5) rewards exactly the kind of intentional minimalism we already have.

### 3.3 Animation Budget

7. **Allocate animation deliberately.**
   - **Hero frame sequence:** Primary animation investment. 121 frames, scroll-driven, canvas-rendered. This is the "wow" moment.
   - **AI Narrative typing effect:** Secondary peak. Character-by-character reveal communicates the AI capability in an engaging way.
   - **Section entrances:** Subtle fade-up on viewport entry. Framer Motion `whileInView` with modest Y offset (20px, not 50px). Stagger children by 100ms.
   - **Micro-interactions:** Button hover scale (1.02), CTA hover glow, tab switch transitions, count-up statistics.
   - **Everything else:** Static. If it doesn't serve narrative, confirmation, or guidance, it doesn't animate.

### 3.4 Section-Specific Notes

8. **Hero section:** Frame sequence animation right 2/3, headline + subhead + CTA left 1/3. Background #0C0B0A matching frames. Preload first 10 frames eagerly. This section alone determines the Halo Effect for the entire site.

9. **Social proof bar:** Immediately after the hero. Logo bar of recognizable institutions or count-up statistics (deals analyzed, properties evaluated, time saved). This answers "do others trust this?" at exactly the moment the visitor is evaluating.

10. **Demo section:** The AINarrativeDemo typing effect is already a "cinematic module" (Video 11). Ensure it has a single focal point — the typing animation — with supporting context that doesn't compete.

11. **Pricing section:** Steel/Carbon/Titanium tiers. Clean cards, clear hierarchy, one recommended tier highlighted. Cognitive load must be minimal here — decision fatigue kills conversion at pricing.

12. **Closing CTA:** Mirror the hero CTA. Same copy, same button, simpler context. Peak-End Rule (Video 6) means this is the second most important section after the hero.

### 3.5 Performance & Deployment

13. **Frame optimization.** Current: 121 JPG frames. Consider batch-converting to WebP for 30-50% size reduction. ffmpeg may not have supported this during extraction, but ImageMagick or sharp can convert post-extraction.

14. **Mobile strategy.** Implement a reduced experience on mobile: static assembled-state image as hero, CSS-animated subtle effects (e.g., soft glow or fade-in), full copy hierarchy preserved. Do not attempt to run 121 frames on mobile.

15. **Performance budget.** After all animations are implemented, run Lighthouse. Target: 90+ performance score. Each animation addition should be followed by a performance check. "Performance-first creativity" (Video 5) means we cut animations before we accept a slow page.

---

## 4. Updated Hero Implementation Spec

### 4.1 Architecture (Validated)

Our current hero implementation is validated by all three technical videos (9, 10, 11). The architecture:

```
Source: hero-assembly.mp4
    |
    v
ffmpeg frame extraction (121 frames)
    |
    v
JPG frames in public/images/hero-frames/
    |
    v
Canvas element renders frames based on scroll position
    |
    v
Framer Motion useScroll() -> useTransform() maps scrollYProgress to frame index [0, 120]
```

**Layout:**
```
+------------------------------------------------------------------+
|  #0C0B0A background (matches frame background)                   |
|                                                                   |
|  [Headline]              [Canvas: Frame Sequence Animation]       |
|  [Subheadline]           [  occupies right ~2/3 of viewport  ]   |
|  [CTA Button]            [  121 frames, scroll-driven         ]   |
|                           [  assembled -> exploded -> assembled]   |
|                                                                   |
+------------------------------------------------------------------+
```

### 4.2 Frame Loading Strategy

| Priority | Frames | Strategy | Rationale |
|----------|--------|----------|-----------|
| Eager | 0-9 | Preloaded immediately on page load | First visible frames must be instant. No blank canvas. |
| High | 10-30 | Loaded during idle time after initial render | Covers first ~25% of scroll range. Smooth early scroll. |
| Normal | 31-120 | Lazy-loaded as scroll approaches | Bulk of frames loaded on demand. Reduces initial payload. |

**Already implemented.** Current code preloads first 10 frames eagerly and lazy-loads the rest. This matches the recommended approach from all three technical videos.

### 4.3 Improvements to Consider

| Improvement | Effort | Impact | Decision |
|-------------|--------|--------|----------|
| Convert JPG frames to WebP | Low | Medium (30-50% smaller files) | **Recommended.** Post-process with sharp or ImageMagick. ffmpeg extraction produced JPG; conversion is a separate step. |
| Reduce total frame count for faster load | Low | Medium | **Not recommended.** 121 frames already provides smooth playback. Reducing creates visible stuttering in scroll. |
| Add loading indicator for slow connections | Low | Low | **Nice to have.** Show subtle skeleton/blur of first frame while remaining frames load. |
| Verify production build includes frames | Critical | Critical | **MUST DO.** Nate Herk explicitly flagged this as a common deployment failure. Run build and verify `dist/` contents. |
| Mobile fallback to static image | Medium | High | **Recommended.** Use assembled-state frame as static hero on viewports below 768px. |
| Scroll speed tuning | Low | Medium | **Do during QA.** Chris Lee: "First version is never perfect — iterate on scroll speed." Test with real users. |

### 4.4 Technical Validation Summary

| Aspect | Our Implementation | Video Consensus | Status |
|--------|-------------------|-----------------|--------|
| Frame count | 121 | ~120 (all three videos) | Aligned |
| Extraction tool | ffmpeg | ffmpeg | Aligned |
| Rendering method | HTML Canvas | HTML Canvas | Aligned |
| Scroll mapping | Framer Motion useScroll/useTransform | Scroll event -> frame index | Aligned (FM is a higher-level abstraction of the same pattern) |
| Layout | Text left, animation right | Text left, product right 2/3 | Aligned |
| Background color | #0C0B0A | "Must match frame background" | Aligned |
| Preload strategy | First 10 eager, rest lazy | Preload visible frames, lazy-load rest | Aligned |
| Mobile approach | TBD | Separate optimization pass | Action needed |

### 4.5 Deployment Checklist

- [ ] All 121 frames present in `public/images/hero-frames/`
- [ ] `npx vite build` produces `dist/` with all frame images included
- [ ] Background color `#0C0B0A` applied to hero section container, `<html>`, and `<body>`
- [ ] Canvas element sized correctly relative to viewport
- [ ] First 10 frames preloaded (verify no blank canvas on initial render)
- [ ] Scroll speed feels natural (not too fast, not too slow — test with 3+ people)
- [ ] Mobile breakpoint (< 768px) serves static fallback, not frame sequence
- [ ] Lighthouse performance score >= 90 with all frames loading
- [ ] No .gitignore rule excluding `public/images/` from version control or build

---

## Appendix: Cross-Reference Index

| Topic | Relevant Videos |
|-------|-----------------|
| Hero section importance | 1, 3, 6, 9, 10 |
| Frame sequence technique | 9, 10, 11 |
| Animation restraint | 1, 3, 5, 6 |
| Single CTA strategy | 1, 2, 7 |
| Typography as differentiator | 2, 3 |
| Micro-interactions / micro-details | 1, 3, 5, 6, 7 |
| Cognitive load / processing fluency | 6, 7 |
| Social proof importance | 1, 7 |
| Mobile optimization | 5, 10 |
| Performance-first design | 5, 7, 10 |
| AI aesthetic (what to avoid) | 3, 5 |
| Design strategy before visual design | 2, 4, 7 |
| Glassmorphism 2.0 | 5 |
| Cinematic modules concept | 11 |
| Deployment gotchas | 10 |
| Bespoke assets vs. generic | 3, 7 |
| Peak-End Rule | 6 |
| Halo Effect | 6 |
