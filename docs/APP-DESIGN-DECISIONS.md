# Tomodachi native app — design decisions (locked 2026-09-05)

Source: the lead's picks in the design catalog (artifact 4e6f6c13), reconciled with the
research brief (7 lenses + adversarial critique). This file is the **design contract** for
the native-app build. Change it only with the lead's explicit decision.

## Direction

**A · Washi Glass** — frosted navigation over warm paper (light) / urushi lacquer (dark).
Rule that governs everything: **glass lives only on the navigation layer that floats above
content** (dock, scrolled top bar, game HUD chip, sheet header). Content is always opaque.

Glass budget: Android ≤2 mounted `backdrop-filter`s, iOS ≤3. Blur 20px iOS / 12px Android;
fill washi .74 / urushi .72 (.82/.84 on Android); no sheen on Android; static tiled grain (never a
live SVG filter). Fallback ladder: `@supports` → in-app "Reduce glass" (auto-on when
`deviceMemory ≤ 4` or first-frame benchmark < 50 fps) → 96% opaque tint + hairline.

## Component picks

| # | Element | Pick | Lead's note → resolution |
|---|---|---|---|
| 1 | Bottom nav | **A** floating glass dock, one element, conditional shelf inside | — |
| 2 | Tab set | **B** 5 tabs | Concern: Learn vs Practice ambiguity → **rename to Home · Course · Practice · Friends · Me** (AR: الرئيسية · المسار · تدريب · الأصدقاء · حسابي). "Course" = the ordered path; "Practice" = SRS review + Zen/Survival. |
| 3 | Top of screen | **A** large editorial title, collapses on scroll | "Top/bottom spacing is critical" → safe-area insets from Capacitor vars; a spacing token sheet; verified on notch + gesture-bar phones before anything else. |
| 4 | Home | **A** hero + tiles (disciplined bento, 1 hero + 4 tiles) | Remove streak/XP from under the greeting (they live in their tiles only); **every tile gets a Lucide icon**; **online friends as a horizontal scroll strip of avatar cards** (chess.com pattern); course path behind Today \| Course switch. |
| 5 | Teach card | **A** centered paper card | — |
| 6 | Quiz | **A** 2×2 tiles + feedback sheet (lessons/review); inline flash in timed games | "Paddings, dimensions, animation are what top apps master" → build from the researched numbers (tile ≥64px, 4px press edge, 200ms sheet, 300ms progress, 140ms press) as a **motion + spacing token sheet**, applied from batch 1. |
| 7 | Progress | **B** rings per track + study heatmap | "Tap a track to see its lessons" → **yes**: tapping a ring opens the lesson browser filtered to that track (the browser screen already exists). |
| 8 | Buttons | **A** soft-elevated crimson with top highlight | — |
| 9 | Cards | **A** elevated white on paper / tonal hairline in dark | "Numbers on cards is a science" → rule set: one hero number per card (Space Grotesk tabular, 28–40px, ink color), eyebrow label 11px caps muted, one secondary line muted; **no colored numbers except semantic** (rose = attention); at most one accent per card. |
| 10 | Celebrations | **A** tiered: stagger + tickers; confetti only on perfect; milestones bespoke | — |
| 11 | Sheets | **A** detent bottom sheet (dialogs only for destructive) | — |
| 12 | Typography | **B** IBM Plex Sans Arabic (UI/body AR) + Cairo 800 display AR; Fraunces + Inter (EN); Zen Maru (kana) + Noto Sans JP | — |
| 13 | Themes | **A** light + dark following the phone, manual override; OLED extra (picked in extras) | — |
| 14 | Icons | **A** outline 1.8 → filled when active | Duotone allowed as a **pressed/selected** treatment on content icons. |
| 15 | Motion | **A** Apple-style ease-out + small spring | — |
| 16 | First launch | **A** try-first (lesson 1 before sign-up) | Add a small **"Create account" / "I have an account"** link on the first screen for people who want an account first. |
| 17 | Empty & loading | **A** Tomo + one CTA **and B** skeletons for loading (both) | Skeletons are mandatory for slow connections. |
| 18 | Friends | **A** presence list + one-tap Duel/Co-op | Reference: chess.com friends/vs flows; research better references for the vs-match screen. |
| 19 | Me | **A** profile hero + grouped rows | — |
| 20 | Game HUD | **A** one glass chip + solid answer area | — |
| 21 | Review tab | **A** due count + 7-day forecast + session caps + summary | — |
| 22 | Status | **A** top chip for events; bottom toast only for undo/errors | — |
| 23 | Direction | **A** Washi Glass | (test note ignored) |

## Extras (opted in)
glass dock with chrome-shrink · conditional shelf · progressive blur (iOS only) · springs ·
view transitions · detent sheets · haptic vocabulary · bento (1+4) · scarf-ribbon + paper grain
(the "aurora" key = brand texture; **no drifting gradients**) · status chip · skeletons · tickers ·
scroll-driven header · sliding-pill segmented · OLED theme · adaptive/tinted icons · in-app text
size · optimistic UI · digits setting (٠١٢/012) · reduce-glass toggle · shareable milestone cards ·
mercy streaks · script toggle · smart notifications (≤2/day) · confusable-kana drills ·
dictionary sheet · pull-to-refresh (leaderboard/friends) · OTA updates · home-screen widget (later).

Not chosen: shape morphing, sound design (revisit), Rive mascot (later), Live Activities (later).

## New requirement from the lead
**Introduction lesson**: explain what a "row" is, the three scripts, and the learning path the
learner will follow. → The existing orientation + reading-rules meta screens cover part of this;
extend orientation with "how the course is organised (rows → scripts → words → kanji)" and make it
re-openable from Me › Help.

## Standards the lead set
- Hide or eliminate the cons of every chosen option the way top apps do (e.g. glass legibility
  via scrims + Reduce-glass; bento creep via the 1+4 cap; try-first via anonymous→account
  migration).
- **No rushing.** Strong, organised code structure and UI/UX; every batch reviewed before it
  ships; every push is a prod deploy, so UI work lands behind a flag or on the staging preview.

## Arabic-first rules (binding)
See the catalog Part I; key ones: logical CSS properties only; mirror only directional glyphs
(allowlist); every JP/romaji token isolated (`<bdi lang="ja">`); body 16–17/1.75, zero
letter-spacing; digits = setting with locale default, never mixed; no CSS opacity on Arabic text
on glass; dock labels ≥13px/600 in Arabic; bundle the Arabic font.

## Build path (from the research)
Capacitor 8.5.x; project-local `package.json`; native bridge bundled by esbuild only; the static
site copied to `www/`; env override for native builds (do **not** let `localhost` map to dev);
Android debug APK first; iOS via Codemagic (Xcode 26); TestFlight through the friend's account
(App Manager invite + bundle ID + cert/profile + ASC API key).
