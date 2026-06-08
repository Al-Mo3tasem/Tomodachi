# Tomodachi authoring scripts

Local Node scripts for content authoring + maintenance. Separate `npm`
package from `/functions` — these run on your machine, not in Cloud
Functions.

| Script | Purpose | Status |
|---|---|---|
| `author_content.js` | Interactive content authoring CLI (L2.04) | ✅ shipped |
| `generate_audio.js` | Azure TTS audio generation (L2.11) | ⏳ planned |
| `migrate_v1_to_v2.js` | One-shot schema migration (L2.13 deploy) | ⏳ planned |

---

## 1. One-time setup

Follow these steps once per machine. They produce credentials the CLI needs
to talk to Firebase.

### 1.1 Install Node dependencies

```bash
cd scripts
npm install
```

This creates `scripts/node_modules/` (gitignored). The only direct dep is
`firebase-admin@^13`.

### 1.2 Generate a service account for each env you'll write to

Service accounts let the CLI write to Firestore on your behalf. **You need
one JSON key file per env you intend to author against.** Most sessions
only need `dev`; `staging` and `prod` are needed for the final cutover.

Follow these steps for **each** environment (`dev`, `staging`, `prod`):

1. Open the Firebase service-accounts page for the project:
   - dev:     <https://console.firebase.google.com/project/tomodachi-dev/settings/serviceaccounts/adminsdk>
   - staging: <https://console.firebase.google.com/project/tomodachi-staging/settings/serviceaccounts/adminsdk>
   - prod:    <https://console.firebase.google.com/project/tomodachi-prod/settings/serviceaccounts/adminsdk>
2. Click **Generate new private key**.
3. In the confirmation dialog, click **Generate key**. A JSON file downloads.
4. Move the downloaded file to:
   ```
   scripts/secrets/service-account.<env>.json
   ```
   Example for dev:
   ```
   scripts/secrets/service-account.dev.json
   ```
5. Verify the file lives in the right place — the CLI prints a precise error
   if it doesn't.

**Security notes**

- `scripts/secrets/` is gitignored. The CLI never prints the key contents
  to stdout.
- Do not paste the contents of these JSON files into chat, screenshots, or
  any shared channel. They grant full Firestore + Auth admin powers on the
  target project.
- If a key leaks, rotate immediately via the same console page (delete the
  compromised key, generate a new one).
- Alternatively, set `GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json` to
  point at a key file outside the repo (e.g., kept in a password manager
  attachment or `~/.config/tomodachi/`).

### 1.3 Optional: pick your $EDITOR

Long-form fields (mnemonics, grammar bodies, AR stories) open in `$EDITOR`
for comfortable multi-line typing. Defaults:

| Platform | Default |
|---|---|
| Linux / macOS | `nano` |
| Windows | `notepad` |

To use VS Code:

```bash
# bash / zsh
export EDITOR='code --wait'
# PowerShell
$env:EDITOR = 'code --wait'
```

The `--wait` flag is required — without it, VS Code returns immediately and
the CLI thinks you saved an empty file.

---

## 2. Daily authoring usage

### 2.1 Author from a manifest (the normal flow)

```bash
# From repo root:
node scripts/author_content.js --env=dev --manifest=scripts/manifests/_sample_vocab.json
```

The CLI:

1. Loads the manifest + progress JSON for `--env=dev`
2. Lists pending items (not yet authored, not skipped)
3. Walks each item:
   - Optionally pastes a Codex draft (with `--use-codex`)
   - Asks for each field in order, with smart defaults
   - Shows the draft + validation
   - Lets you re-edit any field, edit the whole as JSON, or accept
4. On accept: writes to `content_sets/<type>/items/<key>` and appends a
   progress entry
5. On Ctrl-C: saves progress and exits cleanly

### 2.2 Author a single ad-hoc item

```bash
node scripts/author_content.js --env=dev --type=vocab --key=n5_v_042_river
```

No manifest needed; the CLI walks the form for one item then exits.

### 2.3 Codex-assisted drafting

There are **two ways** to use Codex. The recommended L2.05+ flow is batch
prefill — Codex authors all items in one run, you review the JSON file,
then the CLI walks the file. The legacy per-item paste flow exists too.

#### 2.3a Batch prefill via `--prefill=<path>` (recommended)

```bash
node scripts/author_content.js --env=dev \
  --manifest=scripts/manifests/n5_hiragana.json \
  --prefill=scripts/output/codex-l2-05-hiragana.json
```

How it works:

1. Claude writes a Codex spec at `docs/codex-spec-l2-05-<topic>-<date>.md`
   that frames the brand-moat stakes, invites web research, and tells
   Codex to write the result to `scripts/output/codex-l2-05-<topic>.json`.
2. You run Codex against the spec. Codex produces the file.
3. Claude reviews the output for quality (translationese, dialect,
   cultural fit) before you start authoring.
4. You run the CLI with `--prefill=<path>` — each manifest item gets its
   Codex draft pre-loaded, skipping the per-item paste prompt.
5. Per item you see the draft, validate it, tweak any field, accept and
   write to Firestore.

Expected prefill file shape:

```json
{
  "type": "hiragana",
  "source": "codex-l2-05-hiragana-2026-06-06",
  "items": {
    "a": { "mnemonic_en": "...", "mnemonic_ar": "..." },
    "i": { "mnemonic_en": "...", "mnemonic_ar": "..." }
  }
}
```

The CLI also accepts a flat top-level object (no `items` wrapper) and an
array of items each with a `key` field.

#### 2.3b Per-item paste-in via `--use-codex` (legacy)

```bash
node scripts/author_content.js --env=dev --manifest=… --use-codex
```

For each item the CLI prints a per-content-type Codex prompt. You paste
into Codex, paste the JSON response back, enter `END`. Useful for ad-hoc
single-item drafting; impractical for 100-item batches.

### 2.4 Bulk auto-commit via `--auto-accept`

For post-review batches where multi-agent QA has already happened
(Claude + Codex + Gemini reviews complete) and you want to commit
hundreds of items without per-item prompts:

```bash
node scripts/author_content.js --env=dev \
  --manifest=scripts/manifests/n5_hiragana.json \
  --prefill=scripts/output/codex-l2-05-hiragana.json \
  --auto-accept
```

What `--auto-accept` does:
- Validators still gate every write — items that fail are skipped + logged, never silently dropped
- Existing Firestore docs are overwritten silently (you've accepted that contract)
- Output is one compact line per item: `[042/104] ✓ a → content_sets/hiragana/items/a`
- Total elapsed time shown at the end

What `--auto-accept` does NOT allow:
- Without `--prefill` — blocked (can't auto-accept fields you didn't author)
- With `--env=prod` — blocked (prod writes require per-item confirmation; use the L2.13 migration script for prod cutover)

Final per-item human review happens in the live app (admin UI) after
bulk-commit, not in the CLI.

### 2.4 Dry-run

```bash
node scripts/author_content.js --env=dev --manifest=… --dry-run
```

Validates + prints the would-be Firestore writes without contacting Firebase.
Useful for spot-checking a manifest before committing.

### 2.5 Production writes

```bash
node scripts/author_content.js --env=prod --manifest=…
```

Every prod write requires an explicit `y` confirmation per item
(in addition to the `[a]ccept` keystroke). This is intentional friction —
prod is the user-facing surface.

---

## 3. Where things live

```
scripts/
├── author_content.js           # main CLI entry
├── lib/
│   ├── admin.js                # Firebase Admin SDK init + env routing
│   ├── prompts.js              # readline + $EDITOR + per-type form definitions
│   ├── codex.js                # Codex paste-in prompt templates
│   └── manifest.js             # manifest loader + progress tracking
├── manifests/                  # TRACKED — curriculum-scope files
│   ├── README.md
│   └── _sample_vocab.json
├── progress/                   # GITIGNORED — per-env progress JSON
│   └── author_progress.<env>.json
├── secrets/                    # GITIGNORED — service account keys
│   └── service-account.<env>.json
├── tmp/                        # GITIGNORED — $EDITOR scratch files
├── output/                     # GITIGNORED — Codex/L1 output drafts (legacy)
├── prompts/                    # GITIGNORED — Codex spec drafts (legacy)
└── package.json
```

---

## 4. Validation rules

The CLI uses [`js/validators/content.js`](../js/validators/content.js) — the
same pure-JS validators shipped in L2.03. Errors are blocking; AR dialect
markers (Egyptian etc. per CONTENT_GUIDELINES §5) are non-blocking warnings
the lead can override deliberately.

The same module is importable from the browser if we ever want defensive
client-side validation of received content.

---

## 5. Resume after interruption

Press Ctrl-C any time. The CLI:

1. Catches SIGINT
2. Saves the progress JSON for this env
3. Exits with code 130

Next run with the same `--manifest` + `--env` picks up exactly where you
left off — items already in progress as `authored` or `skipped` are filtered
out of the pending queue. The in-progress item itself is **not** auto-saved
(no half-drafts in Firestore) — you re-walk it on resume.
