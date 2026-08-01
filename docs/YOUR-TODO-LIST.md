# Your to-do list — everything that needs YOU (2026-08-01)

Ordered by impact. Each item says exactly what to do, step by step, and what to
tell me afterwards. Nothing here blocks my work — I continue regardless.

---

## 1. ⚡ Say the word: push the vocab tail (D5) — 30 seconds

**What:** 328 additional vocab words, fully judged by the Fable fleet (all 7
batches "minor fixes", **all 103 fixes already applied** to the local files).
Pushing puts the full 681-word vocabulary on dev — practice sets get richer and
future lesson clusters stop being thin.

**Steps:** just reply **"push the tail"**. I run the push, verify counts, and
regenerate anything affected. Dev only — prod untouched.

---

## 2. 🧑‍🏫 Send the Arabic sample to ONE native speaker — 5 minutes of your time

**What:** the last quality layer no AI can give — a decorrelated human check.

**Steps:**
1. Open `docs/review-brief-ARABIC-native-sample.md` (it shows the CURRENT,
   post-fix Arabic — 40 shuffled unlabeled cards, instructions in Arabic at top).
2. Send the whole file (or paste its text) to a native-Arabic friend — ideally
   someone who reads a lot; no Japanese knowledge needed.
3. Paste their reply back to me, in any format. I score it against the hidden
   answer key and tell you whether the AI pass held up or the copy needs a
   human editor.

---

## 3. 📱 Ask about the masculine address (the gender question) — whenever natural

**What:** the lesson copy addresses the learner as masculine singular (أتقِن،
تعلّمتَ). The `introCopy_ar_f` feminine field exists, empty, ready to fill.

**Steps (per the agreed plan):**
1. Ask ~5 women in your target market (friends/family count) one question:
   *"هذا تطبيق يقول لك: أتقِن ترتيبها جيدًا — هل تشعرين أنه يخاطبك؟"*
   ("Does this masculine phrasing feel like it's addressing you, or excluding you?")
2. Ask your native reviewer (item 2) the same question at the end.
3. Tell me the verdict. If it registers as excluding → I fill the feminine
   field for the 52 script lessons first and we measure. If not → we ship as-is
   and save the work.

---

## 4. 🔑 Rotate the Azure keys — 10 minutes, security hygiene (OLD, still open)

**What:** the Azure keys you pasted into our chat weeks ago are still live and
exposed in the conversation transcript. Nothing bad has happened, but they
should be rotated on principle.

**Steps:**
1. Go to https://portal.azure.com → **Azure AI services** (or "Cognitive
   Services") → open each resource you used (Speech/TTS + the image one).
2. Left menu → **Keys and Endpoint** → click **Regenerate Key 1**. Repeat per
   resource.
3. Paste the new keys into `scripts/secrets/.env` (or wherever the TTS pipeline
   reads them — NOT into chat this time 🙂). The audio pipeline is idle, so
   nothing breaks meanwhile.

---

## 5. 🚀 When you're ready to go live with the course (D6 — prod promotion)

Not yet — but here is the exact sequence so you know what it takes. Do NOT do
these until we've agreed the course is ready:

1. **Publish the items read-rule on PROD** (same one you published on dev):
   - https://console.firebase.google.com/project/tomodachi-prod/firestore/rules
   - Add, next to the existing `content_sets/{setId}` block:
     ```
     match /content_sets/{contentType}/items/{itemKey} {
       allow read: if request.auth != null;
       allow write: if false;
     }
     ```
   - Click **Publish**.
2. **Tell me "seed prod content"** — I copy the verified content (items +
   lessons) from dev to prod with the admin pipeline (needs a prod service
   account key: Firebase console → tomodachi-prod → Project settings →
   Service accounts → Generate new private key → save as
   `scripts/secrets/service-account.prod.json`).
3. **Decide D4 (mastery display)** — I'll bring you a concrete per-track
   design (e.g. "Hiragana 104/104 · Katakana 12/104") with a mockup; one
   choice from you.
4. I flip the flag env-by-env, e2e on prod, and we watch.

---

## 6. 🧹 Small housekeeping decisions (1 minute, low stakes)

Four files have sat modified-but-uncommitted since July (I deliberately hold
them back every push):
- `assets/brand/og-card.png` — the 2.4 MB social-share image (heavy; want me to
  compress it to <300 KB and commit?)
- `.claude/settings.json` — local tool permissions (commit or keep local?)
- `scripts/package.json` + lock — pipeline deps for the audio/image scripts
  (commit is harmless; keeps the pipeline reproducible)

**Steps:** reply with any of: "compress og + commit all", "commit deps only",
or "leave them".

---

*Everything else is mine and in motion. — Claude*
