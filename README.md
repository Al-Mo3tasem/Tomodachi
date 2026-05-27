# Tomodachi

A bilingual Japanese-learning app for English and Arabic speakers, built around real-time multiplayer practice with friends.

> Currently in active development. Production deploy: https://al-mo3tasem.github.io/tomodachi/

## What is Tomodachi?

Tomodachi (友達 — "friend") is a Japanese-learning app with two distinguishing features:

- **Arabic-first pedagogy** — every lesson, hint, and mnemonic is independently authored in English and Modern Standard Arabic, never machine-translated.
- **Real-time multiplayer** — duel a friend live in head-to-head practice, or team up in cooperative Sync Match.

Content scope: full JLPT N5 + N4 (hiragana, katakana, ~1,500 vocab, ~300 kanji, grammar, listening drills).

## Tech stack

- **Frontend:** Vanilla JavaScript ES modules, no framework
- **Hosting:** GitHub Pages (production) + Cloudflare Pages (staging) + local laptop (dev)
- **Backend:** Firebase (Auth + Firestore + Cloud Functions) — Spark free tier
- **Audio:** Azure Cognitive Services TTS (sponsorship credits), served from Firebase Storage
- **Email:** Resend (transactional) + Brevo (engagement)
- **Analytics:** Google Analytics 4 with Consent Mode v2
- **Errors:** Sentry
- **i18n:** i18next (English + Arabic with full RTL support)

## Project structure

```
.
├── index.html              # Single-page app entry
├── css/style.css           # Global styles
├── favicon.svg             # Brand mark
├── js/
│   ├── app.js              # Application orchestrator (entry point)
│   ├── config/             # Firebase config per environment
│   ├── core/               # Shared state + UI helpers + utilities
│   ├── data/               # Firestore + Auth I/O modules
│   ├── games/              # Game modes: engine + zen + survival + duel + coop
│   ├── audio/              # TTS + WebAudio sound effects
│   └── ...                 # (i18n, ui, validators, analytics — added per phase)
└── docs/                   # Planning + governance docs (see below)
```

Full folder convention is in [docs/PROJECT_RULES.md](docs/PROJECT_RULES.md) §7.

## Documentation

| Doc | Purpose |
|---|---|
| [docs/PROJECT_RULES.md](docs/PROJECT_RULES.md) | Technical conventions, file/folder rules, Codex/Claude task split, release checklist |
| [docs/CONTENT_GUIDELINES.md](docs/CONTENT_GUIDELINES.md) | Bilingual writing standards (English + MSA Arabic), kanji mnemonic format, dialect policy |
| [docs/Phases_and_Tasks.md](docs/Phases_and_Tasks.md) | Current phase + granular task list with dependencies |
| [docs/Tomodachi_Progress_Log.md](docs/Tomodachi_Progress_Log.md) | Implementation history per task |
| [docs/Learning_Log.md](docs/Learning_Log.md) | Technologies and decisions catalogued for skill growth |
| [docs/Firestore_Rules.md](docs/Firestore_Rules.md) | Security rules and how to apply them via Firebase Console |

## Status

**Phase R1** (brand rename HiraQuest → Tomodachi + folder reorg) is complete. Currently between R1 and R2. See [docs/Phases_and_Tasks.md](docs/Phases_and_Tasks.md) for the full roadmap (R1 rename → R2 backend migration → R3 custom domain → L1 landing/waitlist → L2 closed beta → L3 public free → L4 Pro launch).

## License

Private project. Content and code © Al Moutasem Hamdi. All rights reserved.

Curated content (vocabulary lists, kanji mnemonics, grammar explanations, original example sentences) and product design are proprietary. The codebase is publicly visible on GitHub for transparency and tooling reasons but is not licensed for reuse.
