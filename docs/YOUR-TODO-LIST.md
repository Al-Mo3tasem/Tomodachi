# Your to-do list — everything that needs YOU

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

## 🟡 Still open — two things, BOTH doable today

### A. D4 — pick the mastery/progress display (reply with one word: A, B, or C)

The dashboard progress stat must change before real users see the course.
Pick a style:

**Option A — Per-track rows (my recommendation, premium/Duolingo-style):**
```
Course           ▓▓▓░░░░░░░  Lesson 41 of 151
Hiragana         ▓▓▓▓▓▓▓▓▓▓  104/104 ✓
Katakana         ▓▓▓░░░░░░░   30/104
Words            ▓░░░░░░░░░   45/680
Kanji            ▓░░░░░░░░░    6/103
```
Richest, motivating, matches your premium-UX preference. ~Half a day to build.

**Option B — Course bar only (simplest, honest):**
```
Your course      ▓▓▓░░░░░░░  Lesson 41 of 151 · 27%
```
One number, always true, ~an hour to build.

**Option C — Keep today's single "mastery %" but scoped to kana only.**
Least change, least informative.

**Your step:** reply "D4: A" (or B / C). I build it same day.

### B. D6 prep — two console tasks, safe to do NOW (invisible to users)

Both are preparation only; nothing changes for prod users until we
deliberately flip the flag later.

**B1. Publish the read-rule on PROD (3 minutes):**
1. Open https://console.firebase.google.com/project/tomodachi-prod/firestore/rules
   (make sure the project selector says **tomodachi-prod**).
2. In the rules editor, find the block:
   `match /content_sets/{setId} { … }`
3. Directly AFTER its closing `}`, paste:
```
    match /content_sets/{contentType}/items/{itemKey} {
      allow read: if request.auth != null;
      allow write: if false;
    }
```
4. Click **Publish**. (Additive read-permission on data that does not exist
   on prod yet — zero user impact.)

**B2. Generate the prod admin key (3 minutes):**
1. Open https://console.firebase.google.com/project/tomodachi-prod/settings/serviceaccounts/adminsdk
2. Click **Generate new private key** → confirm → a JSON file downloads.
3. Move/rename that file to EXACTLY:
   `D:MO3 LAPMyProjectsTomodachiscriptssecretsservice-account.prod.json`
   (the secrets folder is gitignored — it can never be committed).
4. Do NOT open/paste its contents anywhere — just place the file.

**Your step after both:** reply "prod prep done". I then verify the key
works read-only, seed the verified content dev→prod (still invisible), and
we schedule the actual flag-flip together.

---

*Everything else is mine and in motion. — Claude*