// scripts/lib/codex.js
// Codex paste-in helpers for the L2.04 authoring CLI.
//
// Decision (L2.04 plan #1B): the CLI does NOT call any LLM API directly.
// Instead, when --use-codex is passed, it prints a per-item, per-content-type
// prompt template that the project lead copies into their existing Codex
// session (matching the established Codex workflow from L1.03/L1.04). Codex
// returns JSON, the lead pastes it back, the CLI parses and pre-fills the
// draft.
//
// Style rules baked into every template (per CONTENT_GUIDELINES.md):
//   - EN voice §3, AR voice §4 (common-tech register, NOT strict فصحى per
//     feedback-ar-voice-common-tech-not-strict-msa)
//   - AR dialect rules §5 (no Egyptian markers from the validators' forbidden list)
//   - Parallel authoring §2.1 (AR authored in Arabic, NOT translated from EN)
//   - Numbers Western digits §13
//   - Brand name «تومودَاتشي» in AR

const STYLE_HEADER = `STYLE REQUIREMENTS (contractual, not preferences):

EN voice (CONTENT_GUIDELINES.md §3):
- Calm, capable, culturally respectful. Confident not bossy. Specific not vague.
- Words to AVOID: "easy", "simple", "just", "click" (use "tap"), "awesome",
  "amazing", "leverage", "elevate", "unlock your potential".
- Oxford commas. Em dash (—), not double-hyphen. Sentence case.

AR voice (CONTENT_GUIDELINES.md §4 + §5):
- Natural conversational MSA register — the level used by Careem, Anghami,
  modern Arabic web/app UI — NOT strict encyclopedic فصحى.
- FORBIDDEN markers (Egyptian/colloquial): دلوقتي, ازاي, فين, بصّ, شوف,
  عايز, عاوز, يلّا, خلّاص, كده, بقى, أوي.
- Arabic comma (،), Arabic question mark (؟). Western digits (1, 2, 3).
- Brand name in AR: «تومودَاتشي».
- AUTHORED in Arabic, NOT translated from EN. The two versions may differ
  in length and framing — that is correct, not a bug.`;

const ACCEPTANCE_FOOTER = `ACCEPTANCE CRITERIA (self-check before returning):
- [ ] Output is valid JSON parseable by JSON.parse (no trailing commas).
- [ ] All required fields present.
- [ ] AR contains ZERO Egyptian markers from the forbidden list.
- [ ] AR reads as if authored in Arabic (different framing OK if it lands cleaner).
- [ ] EN contains NO filler words from the avoid list.
- [ ] Punctuation correct per language (Arabic ،؟ vs Latin ,?).
- [ ] No emoji inside lesson body content.`;

// Per-content-type prompt templates. Each takes the manifest hint object
// and returns a full prompt to paste into Codex.

function vocabTemplate(hint) {
  return `You are drafting ONE vocabulary card for Tomodachi (Arabic-first Japanese
language-learning app, MENA audience, pre-launch). The Arabic quality of
every string is the brand's primary moat — sloppy AR damages the product.

ITEM TO DRAFT:
- key:      ${hint.key}
- japanese: ${hint.japanese_hint || '(you choose the canonical form)'}
- jlpt:     ${hint.jlpt || 'n5'}
- category: ${hint.category || '(pick from: verbs, nouns, adjectives, adverbs, expressions, counters, time, days, family, food, places, body, feelings, weather, nature)'}
- hint:     ${hint.expected_meaning_en || '(none)'}

${STYLE_HEADER}

OUTPUT — pure JSON, no prose, no code fences:

{
  "key": "${hint.key}",
  "jlpt": "${hint.jlpt || 'n5'}",
  "category": "...",
  "japanese": "...",
  "reading": "...",
  "romaji": "...",
  "en": { "primary": "...", "notes": "..." },
  "ar": { "primary": "...", "notes": "..." },
  "example_ja": "...",
  "example_en": "...",
  "example_ar": "...",
  "example_audio_key": "examples/${hint.key}",
  "audio_key": "vocab/${hint.key}",
  "difficulty": 1
}

NOTES:
- en.notes / ar.notes: 1-2 sentences max capturing the ONE thing that
  would otherwise confuse the learner (per §9.2). Skip the obvious.
- example sentence: ≤ 10 Japanese words, real-life context, uses only
  kana + kanji the learner has seen.
- difficulty: 1-5 integer.

${ACCEPTANCE_FOOTER}`;
}

function kanaTemplate(hint, kanaType) {
  return `You are drafting ONE ${kanaType} character entry for Tomodachi.

ITEM:
- key:    ${hint.key}
- glyph:  ${hint.glyph || '(you choose)'}
- romaji: ${hint.romaji || hint.key}
- row:    ${hint.row || '(pick: a, ka, sa, ta, na, ha, ma, ya, ra, wa, n, gojuon, dakuten, handakuten, yoon)'}

${STYLE_HEADER}

OUTPUT — pure JSON, no prose, no code fences:

{
  "key": "${hint.key}",
  "glyph": "...",
  "romaji": "...",
  "row": "...",
  "mnemonic_en": "...",
  "mnemonic_ar": "...",
  "audio_key": "${kanaType}/${hint.key}",
  "jlpt": "pre-n5",
  "difficulty": 1
}

NOTES (CONTENT_GUIDELINES §8.2):
- Mnemonics anchor to a memorable visual shape (a face, an animal, a familiar letter).
- One sentence each. EN and AR use DIFFERENT imagery — the AR mnemonic is
  authored in Arabic, with Arabic-portable cultural anchors. Not a translation.

${ACCEPTANCE_FOOTER}`;
}

function kanjiTemplate(hint) {
  return `You are drafting ONE kanji card for Tomodachi. Each card carries TWO short
mnemonics (meaning + reading), WaniKani-inspired but parallel-authored EN/AR.

ITEM:
- key:    ${hint.key}
- kanji:  ${hint.kanji || '(you choose)'}
- jlpt:   ${hint.jlpt || 'n5'}
- ordinal: ${hint.ordinal || 1}
- hint:   ${hint.expected_meaning_en || '(none)'}

${STYLE_HEADER}

OUTPUT — pure JSON, no prose, no code fences:

{
  "key": "${hint.key}",
  "jlpt": "${hint.jlpt || 'n5'}",
  "ordinal": ${hint.ordinal || 1},
  "kanji": "...",
  "onyomi": ["ジン"],
  "kunyomi": ["ひと"],
  "en_meanings": ["person", "people"],
  "ar_meanings": ["شخص", "إنسان"],
  "mnemonic": {
    "en": {
      "meaning_story": "...",
      "reading_story": "..."
    },
    "ar": {
      "meaning_story": "...",
      "reading_story": "..."
    }
  },
  "radicals": ["k_rad_person"],
  "stroke_count": 2,
  "example_vocab_keys": []
}

NOTES (CONTENT_GUIDELINES §10):
- meaning_story: anchor to the kanji's visible SHAPE or its radical components.
  One vivid 1-2 sentence scene. Specific concrete imagery.
- reading_story: anchor the meaning to the primary on'yomi sound. EN uses an
  English phonetic hook; AR uses an Arabic-native one (e.g., «جِنّ» for jin).
  AR reading story is NEVER a translation of the EN one (§10.5).
- At least one of onyomi/kunyomi must be non-empty.
- en_meanings + ar_meanings: ordered by primacy, 1-3 entries.
- radicals: keys into content_sets/radicals/items/.

${ACCEPTANCE_FOOTER}`;
}

function grammarTemplate(hint) {
  return `You are drafting ONE grammar lesson card for Tomodachi.

ITEM:
- key:     ${hint.key}
- jlpt:    ${hint.jlpt || 'n5'}
- ordinal: ${hint.ordinal || 1}
- topic:   ${hint.topic_hint || '(you choose)'}

${STYLE_HEADER}

OUTPUT — pure JSON, no prose, no code fences:

{
  "key": "${hint.key}",
  "jlpt": "${hint.jlpt || 'n5'}",
  "ordinal": ${hint.ordinal || 1},
  "title_en": "...",
  "title_ar": "...",
  "body_en": "...",
  "body_ar": "...",
  "examples": [
    { "ja": "...", "romaji": "...", "en": "...", "ar": "...", "breakdown": "..." },
    { "ja": "...", "romaji": "...", "en": "...", "ar": "...", "breakdown": "..." }
  ],
  "difficulty": 1,
  "estimated_minutes": 5,
  "related_grammar": [],
  "introduces_vocab": []
}

NOTES (CONTENT_GUIDELINES §11):
- body_en and body_ar are markdown. PARALLEL-AUTHORED, not translated.
  Per §2.4, lengths may differ — that's correct.
- examples: 2-4 entries. Each must include all five fields.
- breakdown: a one-line decomposition (e.g., "私 (I) + は (topic) + 学生 (student) + です (be-polite)").
- estimated_minutes: 1-30 integer, realistic study time for one pass.

${ACCEPTANCE_FOOTER}`;
}

function listeningTemplate(hint) {
  return `You are drafting ONE listening drill for Tomodachi.

ITEM:
- key:     ${hint.key}
- jlpt:    ${hint.jlpt || 'n5'}
- ordinal: ${hint.ordinal || 1}
- topic:   ${hint.topic_hint || '(you choose — a short everyday phrase)'}

${STYLE_HEADER}

OUTPUT — pure JSON, no prose, no code fences:

{
  "key": "${hint.key}",
  "jlpt": "${hint.jlpt || 'n5'}",
  "ordinal": ${hint.ordinal || 1},
  "audio_key": "listening/${hint.key}",
  "ja_transcript": "...",
  "romaji": "...",
  "en": { "primary": "...", "notes": "" },
  "ar": { "primary": "...", "notes": "" },
  "distractors_en": ["...", "...", "..."],
  "distractors_ar": ["...", "...", "..."],
  "related_vocab": [],
  "related_grammar": [],
  "difficulty": 1,
  "audio_duration_ms": 2000
}

NOTES:
- ja_transcript: single short utterance (≤ 12 syllables).
- distractors: exactly 3 plausible-but-wrong answers per language. Should
  share theme or sound with the correct answer (not random).
- audio_duration_ms: a realistic estimate (typical ja short phrase 1500-3500ms).

${ACCEPTANCE_FOOTER}`;
}

function radicalTemplate(hint) {
  return `You are drafting ONE radical entry for Tomodachi.

ITEM:
- key:   ${hint.key}
- glyph: ${hint.glyph || '(you choose)'}

${STYLE_HEADER}

OUTPUT — pure JSON, no prose, no code fences:

{
  "key": "${hint.key}",
  "glyph": "...",
  "en_meanings": ["..."],
  "ar_meanings": ["..."],
  "meaning_story_en": "...",
  "meaning_story_ar": "...",
  "stroke_count": 2
}

NOTES (CONTENT_GUIDELINES §10.7):
- Radicals don't have readings — only a meaning story.
- meaning_story_en + meaning_story_ar: 1-2 sentences each. Anchor to the
  visual shape. AR authored independently.

${ACCEPTANCE_FOOTER}`;
}

export function promptFor(contentType, hint) {
  switch (contentType) {
    case 'hiragana': return kanaTemplate(hint, 'hiragana');
    case 'katakana': return kanaTemplate(hint, 'katakana');
    case 'vocab':    return vocabTemplate(hint);
    case 'kanji':    return kanjiTemplate(hint);
    case 'grammar':  return grammarTemplate(hint);
    case 'listening': return listeningTemplate(hint);
    case 'radicals': return radicalTemplate(hint);
    default:
      throw new Error(`no Codex template for content type "${contentType}"`);
  }
}

// Parse a Codex JSON paste. Tolerates surrounding ``` fences and extra
// whitespace. Throws SyntaxError with a helpful message on bad JSON.
export function parsePaste(raw) {
  let s = (raw || '').trim();
  // Strip code fences if present
  s = s.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  if (!s) {
    throw new SyntaxError('paste was empty');
  }
  try {
    return JSON.parse(s);
  } catch (e) {
    throw new SyntaxError(`paste is not valid JSON: ${e.message}`);
  }
}
