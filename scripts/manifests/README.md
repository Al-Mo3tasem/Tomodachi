# Content authoring manifests

Manifests are curriculum-scope files. Each lists which content items exist to
author, in what order, with optional hints (Japanese form, expected EN
meaning, etc.) for Codex drafting.

Manifests are **tracked** — they're project specification, equivalent to a
syllabus. Progress files (which items have been authored) are gitignored and
live at [`scripts/progress/`](../progress/) per environment.

## Format

```json
{
  "type": "vocab",
  "jlpt": "n5",
  "description": "Free-form description of this manifest's scope.",
  "items": [
    {
      "key": "n5_v_001_eat",
      "ordinal": 1,
      "japanese_hint": "食べる",
      "expected_meaning_en": "to eat",
      "category": "verbs",
      "jlpt": "n5"
    }
  ]
}
```

### Fields

| Field | Required | Notes |
|---|---|---|
| `type` | yes | One of: `hiragana`, `katakana`, `vocab`, `kanji`, `grammar`, `listening`, `radicals` |
| `jlpt` | recommended | Top-level JLPT scope label (informational; per-item `jlpt` still wins) |
| `description` | recommended | Human-readable scope statement |
| `items[].key` | yes | The Firestore doc ID; must match the key regex in `js/validators/content.js` |
| `items[].ordinal` | recommended | Manifest ordering (also written to the doc when relevant) |
| `items[].japanese_hint` | optional | Hint passed into the Codex prompt template |
| `items[].expected_meaning_en` | optional | Hint passed into the Codex prompt template |
| `items[].category` | optional (vocab) | Hint shown in the CLI header (does not auto-fill — use `seed` for that) |
| `items[].seed` | optional | Object of pre-filled item fields (e.g., `{glyph, romaji, row}` for kana). Appears as the default in the form walk; Enter accepts. |
| Any extra hint fields | optional | Surfaced in the CLI header for the author |

### Hints vs seed — which to use?

- **Hint fields** (`japanese_hint`, `expected_meaning_en`, `topic_hint`): purely informational. The CLI shows them in the per-item header and the Codex prompt template uses them for context. **Never written to Firestore.**
- **`seed`**: real item-field values. Merged into the item draft before the form walks. The user can override per field by typing a new value. **Written to Firestore as-is** (after the user accepts).

## Naming convention

| Status | Filename pattern | Example |
|---|---|---|
| Sample / test | `_sample_*.json` | `_sample_vocab.json` |
| Real curriculum | `<jlpt>_<type>[_<bucket>].json` | `n5_vocab.json`, `n5_kanji.json` |

The leading underscore marks samples so they're easy to spot and ignore in
real authoring sessions.

## What about lessons?

Lesson container manifests (the `content_sets/lessons/{lessonKey}` docs from
Master Plan §4.2) are a separate concern — they reference item keys after the
underlying items are authored. The CLI supports `--type=lesson` for those,
but they're authored *after* their member items, so they get their own
manifest pattern at L2.13.
