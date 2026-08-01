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

## 🟡 Still open — only two things, both for later

### A. D4 — mastery display decision (needed just before prod)
The dashboard "mastery %" must change before real users see the full course
(today it would divide by ~900 items). When we near launch I'll bring you a
per-track mockup ("Hiragana 104/104 · Katakana 12/104 · …") — you pick a style.
**Nothing to do now.**

### B. D6 — prod go-live sequence (when we agree the course is ready)
1. Publish the items read-rule on **prod**:
   https://console.firebase.google.com/project/tomodachi-prod/firestore/rules —
   add next to the existing `content_sets/{setId}` block:
   ```
   match /content_sets/{contentType}/items/{itemKey} {
     allow read: if request.auth != null;
     allow write: if false;
   }
   ```
   → Publish.
2. Generate a prod admin key: Firebase console → tomodachi-prod → Project
   settings → Service accounts → **Generate new private key** → save the file as
   `scripts/secrets/service-account.prod.json` (gitignored folder).
3. Tell me **"seed prod content"** — I copy the verified corpus dev→prod,
   decide D4 with you, flip the flag env-by-env, and e2e on prod.

---

*Everything else is mine and in motion. — Claude*
