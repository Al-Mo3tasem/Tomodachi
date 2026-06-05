# Codex spec — Full Arabic revision pass (L1 polish)

**Date:** 2026-06-05
**Output target:** `js/i18n/locales/ar.json` (write in place)
**Estimated effort:** 1-2 hours of focused work

---

## Your role

You are a native-speaker Arabic copy editor and content director for **Tomodachi**, a bilingual EN+AR Japanese language-learning web app currently in pre-launch waitlist phase. The audience is MENA-first — Egypt, Gulf, Levant, Maghreb. The Arabic quality across every visible string is **the brand's primary moat**. Most Japanese-learning apps in this market are English-first and treat Arabic as a translation layer. Tomodachi's promise is the opposite: Arabic authored natively, by people thinking in Arabic.

**The bar:** every AR string must read as if a native MSA speaker wrote it from scratch — not as a translation of the English. If even one string in the user-facing surface feels "auto-translated," the moat is broken.

This isn't a "polish pass." This is the difference between a product that resonates in the MENA market and one that signals "made for someone else, then translated."

---

## What triggered this revision

The project lead showed the live landing page to 5 native-Arabic-speaking friends on 2026-06-05. Their consensus:

1. The Arabic feels auto-translated and needs a full accurate revision. (EN side is fine; only AR was flagged.)
2. The footer tagline «تعلّم اليابانية معًا» is weak — «معًا» alone reads cold. «مع أصدقائك» would land better.
3. The waitlist CTA «انضمّ للقائمة» is unclear — *what* list, *for what*? Something like «احجز مقعدك» (reserve your seat) reads better, feels invitational.

These three are failure-mode *signals*. Your job is to apply the same level of scrutiny to every other AR string, not just to patch these three.

---

## Tools available — use them

**You may and should use web search.** This is not optional. Use it for:

- **Native MSA landing-page phrasings.** Search what successful Arabic-speaking landing pages use for "join the waitlist," "get notified," "reserve your spot," "you're on the list." Real examples: Careem, Anghami, Tabby, Rasayel, Sary, Rain. Steal what works; reject what reads as translated from English.
- **Japanese-learning vocabulary in Arabic.** The standard Arabic words for "kana" (الكانا), "kanji" (الكانجي), "hiragana" (الهيراغانا), "JLPT," "vocabulary" (مفردات), "memorization techniques" (تقنيات التذكّر), "grammar" (قواعد). Published Arabic-language Japanese textbooks and academic glossaries are your reference.
- **AoT cultural references.** The brand identity (logo + palette) is built around Mikasa's red scarf from *Attack on Titan* (هجوم العمالقة). The Arabic-speaking AoT fandom uses specific phrasings about that scarf — if any can subtly inform a brand line, fine. Don't force it.
- **Arabic privacy/terms phrasings.** For the policy pages, search Egyptian, Saudi, or UAE consumer-tech privacy policies in Arabic to ground the legal voice. Don't invent legalese.
- **Idiomatic register checks.** When you're unsure whether a phrase reads naturally, search it as a quoted string to see if real Arabic websites use it the same way.

Use search to inform your authoring, not to copy. You're writing, not paraphrasing.

---

## Files

**Revise (write back in place):**
- `js/i18n/locales/ar.json`

**Read for context (do not modify):**
- `js/i18n/locales/en.json` — the English source-of-truth. Read each EN string to understand what each key *means*, then author the AR independently.
- `index.html` — see how the keys are used in context (look for `data-i18n` attributes). Useful for understanding the surrounding UI.
- `docs/CONTENT_GUIDELINES.md` — the project's content style guide. Read this before you start; it codifies AR voice rules.

**Preserve exactly:**
- The JSON shape — every key must stay at the same nesting level. The keys are referenced from HTML via `data-i18n` attributes; changing or renaming a key breaks rendering.
- Every interpolation token: `{{count}}`, `{{name}}`, `{{score}}`, `{{percent}}`, `{{message}}`, `{{code}}`, `{{multiplier}}`, `{{year}}`, `{{version}}`. Do NOT translate these tokens — they get filled at runtime by i18next.
- The intentionally-English placeholder values inside `auth.placeholder.*` (e.g., `"almo3tasem"`, `"Al Mo3tasem"`, `"you@example.com"`, `"••••••"`).

---

## Style rules — contractual, not preferences

### Modern Standard Arabic (فصحى) only

- **No dialect markers.** Forbidden Egyptian: «دلوقتي»، «ازاي»، «إيه»، «فين»، «بصّ»، «شوف»، «عايز»، «عاوز»، «يلّا»، «خلّاص»، «كده»، «بقى»، «أوي»، «ما...ش» negation. Also forbidden: Levantine, Gulf, Maghrebi markers. If you're unsure whether a word is MSA or dialect, search it.
- **Conversational MSA, not encyclopedic MSA.** Drop the «الذي»/«التي» avalanche. Drop «إذ»/«حيث» as filler transitions. Drop reflexive passive voice unless it's the natural choice. Read like a confident bilingual writer talking to a peer over coffee — not like a UN treaty.

### Parallel-author, don't translate

- Read the English meaning, then put the EN file away and write the Arabic from scratch.
- Sentence structure can and should differ. Length can and should differ.
- If an English idiom doesn't map (e.g., "guilt loops," "soft streaks," "miss a day"), invent an Arabic parallel that lands the same emotional beat — not the same words.
- One AR string can be 30% shorter or 30% longer than its EN parallel. That's fine. What matters is whether it reads natively.

### Punctuation

- Arabic comma «،» — not Latin ",".
- Arabic semicolon «؛» — not Latin ";".
- Arabic question mark «؟» — not Latin "?".
- Em-dash «—» (U+2014) is fine in Arabic; use it for the same parenthetical-pause function as in EN.
- Numbers: **Western digits** (1, 2, 3) throughout — not Eastern digits (١, ٢, ٣). MENA tech audiences read Western digits more fluently.

### Brand name

- In Arabic: «تومودَاتشي» — with fatha on the second alif. Be consistent across every occurrence.
- In English-mixed contexts (URLs, code identifiers, "Google Analytics 4," "Firebase"): keep the original English.

### Voice + register

- Confident, not bossy. Specific, not vague. Direct, not euphemistic.
- Avoid AR equivalents of EN marketing filler: no «بكل سهولة» (= "easy"), no «ببساطة» (= "simply"), no «اكتشف» (when used as "discover" marketing-ese), no «اِنطلق» (= "unleash"), no «أطلق العنان» (= "unleash your potential").
- Inviting, not commanding. Arabic imperatives can sound harsh in copy — soften with «يمكنك»، «انضمّ»، «احجز»، «اطّلع» where appropriate. The CTA should read like a warm invitation, not an order.

---

## Concrete calibration — what "bad" looks like, with the fix-direction

These are categories of fix, not the exact strings you should use. Author your own.

| Surface | Current (auto-translated feel) | Direction for the fix |
|---|---|---|
| Footer tagline | «تعلّم اليابانية معًا» | The hero tagline already uses «تعلّم اليابانية مع أصدقائك» — author a *distinct* shorter brand-line for the footer that doesn't repeat the hero. Candidates to riff from: «اليابانية مع رفاقك»، «صداقة وتقدّم»، «اليابانية على مهلك». Pick what feels right. |
| Hero waitlist CTA | «انضمّ للقائمة» | Make it inviting and concrete. Candidates: «احجز مقعدك»، «احجز موقعك»، «سجّل بريدك للأخبار»، «انضمّ إلى أوائل المتعلّمين». Pick one that fits the surrounding voice. |
| Counter line | «{{count}}+ على القائمة بالفعل» | Warmer, works at n=12 *and* n=850. Candidates: «انضمّ إلى {{count}}+ ينتظرون الإطلاق»، «{{count}}+ شخصًا ينتظرون معك». |
| Success card title | «أنت الآن على القائمة» | Warmer. Candidates: «وصلك الدور»، «تمّ — سنوافيك بأخبار الإطلاق»، «بريدك معنا». |
| Privacy policy intro | «تطبيق لتعلّم اليابانية، وهو حالياً في مرحلة قائمة الانتظار. تشرح هذه السياسة...» | Read it aloud. Does it sound like a person explaining, or a translated EULA? Tighten until it sounds spoken. |
| Error toasts | «تعذّر تحميل ملفك الشخصي» | Fine as fragments, but check that the surrounding `{{message}}` interpolation produces a natural Arabic sentence when combined. |

The "coming soon" string «قريبًا» is fine — keep it.

---

## Brand and product context

- **Tomodachi (تومودَاتشي)** — Japanese for *friend* (友 in kanji). Brand built around the **red scarf** Mikasa gives Eren in *Attack on Titan* — a symbol of friendship that carries you through hard things. Brand color is scarf-crimson (`#B91C1C`).
- **Audience** — Adult learners across MENA. Educated, mobile-first, bilingual EN+AR. Reads Western digits without friction. Curious about Japanese culture (anime, manga, language, JLPT).
- **Pedagogy** — Bilingual EN+AR Japanese learning, starting at JLPT N5 (kana, ~800 vocab, ~100 kanji, basic grammar). N4 next. AR-side explanations are authored in Arabic, *not* translated. This is the whole point of the product.
- **Pace** — Calm, not Duolingo-style guilt loops. "Soft streaks" — you don't lose your progress if you miss a day. Adult, respectful, no nagging.
- **Multiplayer** — Live duels (مبارزة) and co-op sessions (المباراة المتزامنة) with friends. The social moat.
- **Pricing** — Free during beta. Pro tier after launch with regional pricing (~$2/mo Egypt, ~$4/mo Gulf countries).
- **Stage** — Pre-launch waitlist. The landing page captures emails into Brevo and shows a live counter.

---

## Coverage scope — what to revise

**Every AR string** in `js/i18n/locales/ar.json`. Don't skip anything.

Priority order (highest leverage first — these are what the waitlist visitor sees):

1. `hero.*` — marquee of the entire landing page
2. `features.*` — the three feature cards under the hero (Arabic-from-start, Multiplayer, Calm Pace)
3. `screenshots.*` — section heading + subtitle
4. `seo.*` — Arabic page title + meta description (visible in search results)
5. `footer.*` — the footer tagline that triggered this revision
6. `faq.*` — 7 Q&A pairs (one was removed today, `faq.dialect` is gone)
7. `consent.*` — cookie consent banner copy
8. `policy.privacy.*`, `policy.terms.*`, `policy.cookies.*` — the three policy pages
9. `auth.*` — sign-in / create-account screen
10. `nav.*`, `dashboard.*`, `modes.*`, `select.*`, `leaderboard.*`, `settings.*`, `game.*`, `lobby.*`, `duel.*`, `coop.*`, `invite.*` — in-app surfaces (lower priority since waitlist visitors don't reach these, but the bar applies everywhere)
11. `error.*` — error toasts and form-validation messages
12. `toast.*` — welcome/sign-in toasts
13. `common.*` — generic actions
14. `locale.*` — leave as is (`"EN"`, `"العربية"`)

---

## Output

1. **Open** `js/i18n/locales/ar.json` and `js/i18n/locales/en.json` side by side.
2. For each AR string: read the EN parallel, then author the AR revision until it passes the self-review checklist below.
3. **Write the revised JSON back to `js/i18n/locales/ar.json`** — preserve the exact key structure, preserve all `{{token}}` interpolations verbatim, output valid JSON parseable by `JSON.parse`.
4. After writing the file, **produce a summary report** as a separate markdown output containing:
   - **Marquee strings table:** before/after for the 6 highest-impact strings — hero tagline, hero promise, CTA label, counter line, footer tagline, success card title.
   - **Per-namespace summary:** one line per top-level namespace (`hero`, `features`, `faq`, ...) describing what changed.
   - **Judgment calls:** any decisions where you deviated meaningfully from a literal translation and why.
   - **Open questions:** anything you weren't confident about and want the project lead to weigh in on.

---

## Self-review checklist — every string must pass before you finalize

1. Read it aloud (or imagine it spoken). Does it sound like a person, or like a translation?
2. Scan for forbidden dialect markers (Egyptian, Levantine, Gulf, Maghrebi). None should appear.
3. Scan for encyclopedic register («الذي»/«التي» chains, reflexive passive). Tighten if present.
4. Punctuation: «،»، «؛»، «؟» not Latin equivalents. Western digits 1-9 not ١-٩.
5. Brand name «تومودَاتشي» consistent throughout.
6. Interpolation tokens (`{{count}}`, `{{name}}`, etc.) preserved verbatim and positioned to produce natural Arabic word order when filled.
7. JSON is valid — no trailing commas, balanced braces, escaped inner quotes where needed.
8. **The bar:** would a native MSA speaker at a Cairo, Riyadh, Beirut, or Casablanca café read this and think *"this app was made for me"*, or *"this is a translated English app"*?

If even one string fails check 8, revise it again before submitting.

---

## What success looks like

When the project lead pastes your revised `ar.json` into the live site and reshares with the same 5 friends, the response should be: *"this reads native now."* No specific phrase callouts, no "this part still feels off." That's the bar.
