# Your to-do list — everything that needs YOU

## 🟠 Native app phase (updated 2026-09-06) — open items

1. **API-key referrers (blocks sign-in inside the app).** Google Cloud →
   Credentials → the *Browser key (auto created by Firebase)* of
   `tomodachi-prod` and `tomodachi-staging` → Websites → add
   `capacitor://localhost/*`, `http://localhost/*`, `https://localhost/*`.
   Step-by-step in `docs/NATIVE-BUILD.md` ("Lead checklist"). Tell me when done
   so I can retest sign-in on the emulator.
2. **Send `docs/IOS-APPLE-ACCOUNT-CHECKLIST.md` to your friend** (the Apple
   developer account owner). iOS/TestFlight cannot start until those items land.
3. **Arabic copy check (30 s):** the game-setup duration chips now read
   `1 د · 3 د · 5 د · 7 د · 10 د` in Arabic (were `1m … 10m`). If you would
   rather see `دقيقة` spelled out, or a different short form, say so.
4. **Later, not now:** first-click naming test for the tabs (Learn vs
   Course/Practice) once the Course/Practice screens exist (batch 9).

Everything below is history from the go-live run-up (all closed).

---

**Updated 2026-08-01 (evening).** Five of the original six items are closed.
Nothing here blocks my work — I continue regardless.

---

## ✅ Closed (2026-08-01)

1. ~~**Push the vocab tail (D5)**~~ — DONE. 328 items pushed through validator +
   dialect + collision gates; `content_sets/vocab/items` = **680** on dev.
2. ~~**Native-speaker Arabic check**~~ — DONE. Verdict: 34/40 clean, 0 rewrites,
   9/10 hidden "keeps" confirmed → **the AI quality pass is human-validated.**
   All 6 fixes applied (+ two generalized catches: the ←-arrow bidi hazard in
   katakana:12, and the "halfway" fact in katakana:07). Copy is now v4.
3. ~~**Gender question**~~ — CLOSED. Target-market women confirmed the masculine
   default reads fine. Ships as-is; `introCopy_ar_f` stays as free future-proofing.
4. ~~**Azure keys**~~ — CLOSED. All Azure resources were deleted ~30 days ago,
   which kills their keys (stronger than rotation). Only residual: if the pasted
   `.env` ever contained a NON-Azure secret, reset that one at its provider.
   Habit going forward: never paste `.env` contents into any chat.
6. ~~**Held-back files**~~ — RESOLVED. og-card compressed (80KB jpg in the share
   tags, 507KB png fallback); machine-local Claude permissions migrated to the
   gitignored `settings.local.json` (nothing private committed); pipeline deps
   committed. **Working tree is fully clean.**

---

## 🟡 Still open — ONE thing: schedule the go-live

Everything else is done (2026-08-02):
- ✅ D4: you picked **A** → per-track progress rows are LIVE on dev
  (Course + Hiragana/Katakana/Words/Kanji bars; legacy mastery bar retired
  in v2 environments).
- ✅ D6-B1: prod read-rule published (your console action).
- ✅ D6-B2: prod admin key placed + verified (locked to tomodachi-prod).
- ✅ Prod SEEDED: 1,302 content docs copied dev→prod, all counts verified.
  Invisible to users — the flag is still off.

### The only remaining step: flip the switch together
When you say **"go live"**, I will:
1. Change the flag so prod loads the v2 content + course
   (one-line change + deploy).
2. E2E on the live site with a test account (picker, lesson 1, progress).
3. Watch the first sessions with you.
Pick a moment when you have ~30 minutes to watch it land.

---

*— Claude*