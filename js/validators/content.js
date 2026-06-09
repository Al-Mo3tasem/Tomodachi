// Tomodachi — content validators (L2.03)
// Pure-JS validators for content_sets/* item shapes. No deps.
// Used by:
//   - L2.04 content authoring CLI (gates writes to Firestore before commit)
//   - Optionally by client code for defensive validation of received data
//
// Reference docs:
//   - docs/Tomodachi_Master_Plan.md §4 v2.0 (L2.03 schema set)
//   - docs/CONTENT_GUIDELINES.md §8-12 (per-item field specs)
//
// Each validator returns { valid: boolean, errors: Array<{field, message}> }.
// Pure functions — no Firestore calls, no I/O.

// ============================================================
// Constants
// ============================================================

const JLPT_LEVELS = ['pre-n5', 'n5', 'n4', 'n3'];

const KANA_ROWS = [
  'a', 'ka', 'sa', 'ta', 'na', 'ha', 'ma', 'ya', 'ra', 'wa', 'n',
  'gojuon', 'dakuten', 'handakuten', 'yoon'
];

const VOCAB_CATEGORIES = [
  'verbs', 'nouns', 'people', 'adjectives', 'adverbs', 'expressions',
  'counters', 'time', 'days', 'family', 'food', 'places',
  'body', 'feelings', 'weather', 'nature'
];

const CONTENT_TYPES = [
  'hiragana', 'katakana', 'vocab', 'kanji', 'grammar', 'listening', 'radicals'
];

const LISTENING_ERROR_CATEGORIES = [
  'translation_wrong', 'audio_mismatch', 'typo', 'other'
];

// Key-format regexes (per CONTENT_GUIDELINES + Master Plan §4).
// Slug suffixes allow [a-z0-9_]+ so legitimate slugs like `number_1` work.
const KEY_PATTERNS = {
  // Kana keys: short Latin slug (e.g., 'a', 'ka', 'gi', 'kya', 'n')
  kana:      /^[a-z]{1,4}$/,
  // Vocab: n5_v_NNN_{en_root}  e.g., 'n5_v_001_eat', 'n5_v_061_number_1'
  vocab:     /^n[3-5]_v_\d{3}_[a-z0-9_]+$/,
  // Kanji: k_n5_NNN_{en_concept}  e.g., 'k_n5_001_person'
  kanji:     /^k_n[3-5]_\d{3}_[a-z0-9_]+$/,
  // Grammar: g_n5_NNN_{en_handle}  e.g., 'g_n5_001_wa_topic'
  grammar:   /^g_n[3-5]_\d{3}_[a-z0-9_]+$/,
  // Listening: n5_l_NNN_{en_handle}  e.g., 'n5_l_001_greeting'
  listening: /^n[3-5]_l_\d{3}_[a-z0-9_]+$/,
  // Radicals: k_rad_{en_concept}  e.g., 'k_rad_person'
  radical:   /^k_rad_[a-z0-9_]+$/,
  // Lessons: track-prefixed track-position  e.g., 'hiragana:01', 'vocab:greetings:1'
  lesson:    /^[a-z]+(:[a-z0-9_]+)+$/
};

// ============================================================
// Helpers
// ============================================================

function err(field, message) {
  return { field, message };
}

function ok() {
  return { valid: true, errors: [] };
}

function fail(...errors) {
  return { valid: false, errors };
}

function combine(...results) {
  const errors = results.flatMap(r => r.errors || []);
  return { valid: errors.length === 0, errors };
}

function isPresent(field, val) {
  if (val === undefined || val === null) {
    return fail(err(field, 'is required'));
  }
  return ok();
}

function isNonEmptyString(field, val) {
  if (typeof val !== 'string' || val.length === 0) {
    return fail(err(field, 'must be a non-empty string'));
  }
  return ok();
}

function isOptionalString(field, val) {
  if (val === undefined || val === null) return ok();
  if (typeof val !== 'string') {
    return fail(err(field, 'must be a string if present'));
  }
  return ok();
}

function isInteger(field, val, min, max) {
  if (!Number.isInteger(val)) {
    return fail(err(field, 'must be an integer'));
  }
  if (typeof min === 'number' && val < min) {
    return fail(err(field, `must be >= ${min}`));
  }
  if (typeof max === 'number' && val > max) {
    return fail(err(field, `must be <= ${max}`));
  }
  return ok();
}

function isStringEnum(field, val, allowed) {
  if (!allowed.includes(val)) {
    return fail(err(field, `must be one of: ${allowed.join(', ')}`));
  }
  return ok();
}

function matchesPattern(field, val, pattern) {
  if (typeof val !== 'string' || !pattern.test(val)) {
    return fail(err(field, `must match ${pattern}`));
  }
  return ok();
}

function isArrayOfStrings(field, val, opts = {}) {
  if (!Array.isArray(val)) return fail(err(field, 'must be an array'));
  if (opts.min != null && val.length < opts.min) {
    return fail(err(field, `must have at least ${opts.min} entries (got ${val.length})`));
  }
  if (opts.max != null && val.length > opts.max) {
    return fail(err(field, `must have at most ${opts.max} entries (got ${val.length})`));
  }
  const errors = [];
  for (let i = 0; i < val.length; i++) {
    if (typeof val[i] !== 'string' || val[i].length === 0) {
      errors.push(err(`${field}[${i}]`, 'must be a non-empty string'));
    }
  }
  return { valid: errors.length === 0, errors };
}

function isBilingualField(field, val) {
  if (!val || typeof val !== 'object') {
    return fail(err(field, 'must be a bilingual object { primary, notes? }'));
  }
  const errors = [];
  if (typeof val.primary !== 'string' || val.primary.length === 0) {
    errors.push(err(`${field}.primary`, 'must be a non-empty string'));
  }
  if (val.notes !== undefined && typeof val.notes !== 'string') {
    errors.push(err(`${field}.notes`, 'must be a string if present'));
  }
  return { valid: errors.length === 0, errors };
}

// Detects strict-MSA dialect violations in AR strings (per CONTENT_GUIDELINES §5).
// Returns errors for forbidden dialect markers — used as a warning layer, not a blocker
// (project lead may accept some flagged strings deliberately for tone).
function detectArabicDialectMarkers(field, val) {
  if (typeof val !== 'string') return ok();
  const FORBIDDEN = [
    'دلوقتي', 'ازاي', 'فين', 'بصّ', 'بصش', 'شوف', 'عايز', 'عاوز',
    'يلّا', 'خلّاص', 'كده', 'بقى', 'أوي'
  ];
  const hits = FORBIDDEN.filter(m => val.includes(m));
  if (hits.length > 0) {
    return fail(err(field, `dialect markers detected (review): ${hits.join(', ')}`));
  }
  return ok();
}

// ============================================================
// Kana validator (CONTENT_GUIDELINES §8)
// Applies to both hiragana and katakana — same field shape.
// ============================================================

function validateKana(item) {
  if (!item || typeof item !== 'object') {
    return fail(err('item', 'must be an object'));
  }
  return combine(
    isPresent('key', item.key),
    matchesPattern('key', item.key, KEY_PATTERNS.kana),
    isNonEmptyString('glyph', item.glyph),
    isNonEmptyString('romaji', item.romaji),
    isStringEnum('row', item.row, KANA_ROWS),
    isNonEmptyString('mnemonic_en', item.mnemonic_en),
    isNonEmptyString('mnemonic_ar', item.mnemonic_ar),
    detectArabicDialectMarkers('mnemonic_ar', item.mnemonic_ar),
    isNonEmptyString('audio_key', item.audio_key),
    isStringEnum('jlpt', item.jlpt, JLPT_LEVELS),
    isInteger('difficulty', item.difficulty, 1, 5)
  );
}

// ============================================================
// Vocab validator (CONTENT_GUIDELINES §9)
// ============================================================

function validateVocab(item) {
  if (!item || typeof item !== 'object') {
    return fail(err('item', 'must be an object'));
  }
  const baseResults = combine(
    isPresent('key', item.key),
    matchesPattern('key', item.key, KEY_PATTERNS.vocab),
    isStringEnum('jlpt', item.jlpt, JLPT_LEVELS),
    isStringEnum('category', item.category, VOCAB_CATEGORIES),
    isNonEmptyString('japanese', item.japanese),
    isNonEmptyString('reading', item.reading),
    isNonEmptyString('romaji', item.romaji),
    isBilingualField('en', item.en),
    isBilingualField('ar', item.ar),
    item.ar ? detectArabicDialectMarkers('ar.primary', item.ar.primary) : ok(),
    item.ar && item.ar.notes ? detectArabicDialectMarkers('ar.notes', item.ar.notes) : ok(),
    isNonEmptyString('example_ja', item.example_ja),
    isNonEmptyString('example_en', item.example_en),
    isNonEmptyString('example_ar', item.example_ar),
    detectArabicDialectMarkers('example_ar', item.example_ar),
    isNonEmptyString('example_audio_key', item.example_audio_key),
    isNonEmptyString('audio_key', item.audio_key),
    isInteger('difficulty', item.difficulty, 1, 5)
  );
  // Optional fields
  const relatedResults = item.related === undefined
    ? ok()
    : isArrayOfStrings('related', item.related, { max: 5 });
  return combine(baseResults, relatedResults);
}

// ============================================================
// Kanji validator (CONTENT_GUIDELINES §10)
// ============================================================

function validateKanji(item) {
  if (!item || typeof item !== 'object') {
    return fail(err('item', 'must be an object'));
  }
  const baseResults = combine(
    isPresent('key', item.key),
    matchesPattern('key', item.key, KEY_PATTERNS.kanji),
    isStringEnum('jlpt', item.jlpt, JLPT_LEVELS),
    isInteger('ordinal', item.ordinal, 1, 9999),
    isNonEmptyString('kanji', item.kanji),
    isArrayOfStrings('onyomi', item.onyomi, { min: 0 }),
    isArrayOfStrings('kunyomi', item.kunyomi, { min: 0 }),
    isArrayOfStrings('en_meanings', item.en_meanings, { min: 1 }),
    isArrayOfStrings('ar_meanings', item.ar_meanings, { min: 1 }),
    isInteger('stroke_count', item.stroke_count, 1, 30),
    isArrayOfStrings('radicals', item.radicals, { min: 1 }),
    item.example_vocab_keys === undefined
      ? ok()
      : isArrayOfStrings('example_vocab_keys', item.example_vocab_keys, { min: 0 })
  );

  // Both kanji must have at least one reading (on or kun)
  const hasReadings = (Array.isArray(item.onyomi) && item.onyomi.length > 0)
                   || (Array.isArray(item.kunyomi) && item.kunyomi.length > 0);
  const readingCheck = hasReadings
    ? ok()
    : fail(err('onyomi/kunyomi', 'must have at least one reading (onyomi or kunyomi)'));

  // Mnemonic structure (the WaniKani-inspired two-story shape)
  const mnemonicCheck = validateKanjiMnemonic(item.mnemonic);

  // Detect AR dialect in stories
  const arDialectCheck = item.mnemonic && item.mnemonic.ar
    ? combine(
        detectArabicDialectMarkers('mnemonic.ar.meaning_story', item.mnemonic.ar.meaning_story),
        detectArabicDialectMarkers('mnemonic.ar.reading_story', item.mnemonic.ar.reading_story)
      )
    : ok();

  // Each AR meaning checked for dialect
  const arMeaningsCheck = Array.isArray(item.ar_meanings)
    ? combine(...item.ar_meanings.map((m, i) =>
        detectArabicDialectMarkers(`ar_meanings[${i}]`, m)))
    : ok();

  return combine(baseResults, readingCheck, mnemonicCheck, arDialectCheck, arMeaningsCheck);
}

function validateKanjiMnemonic(mnemonic) {
  if (!mnemonic || typeof mnemonic !== 'object') {
    return fail(err('mnemonic', 'must be an object { en: {...}, ar: {...} }'));
  }
  const errors = [];
  for (const locale of ['en', 'ar']) {
    if (!mnemonic[locale] || typeof mnemonic[locale] !== 'object') {
      errors.push(err(`mnemonic.${locale}`, 'must be an object { meaning_story, reading_story }'));
      continue;
    }
    if (typeof mnemonic[locale].meaning_story !== 'string' || mnemonic[locale].meaning_story.length === 0) {
      errors.push(err(`mnemonic.${locale}.meaning_story`, 'must be a non-empty string'));
    }
    if (typeof mnemonic[locale].reading_story !== 'string' || mnemonic[locale].reading_story.length === 0) {
      errors.push(err(`mnemonic.${locale}.reading_story`, 'must be a non-empty string'));
    }
  }
  return { valid: errors.length === 0, errors };
}

// ============================================================
// Grammar validator (CONTENT_GUIDELINES §11)
// ============================================================

function validateGrammar(item) {
  if (!item || typeof item !== 'object') {
    return fail(err('item', 'must be an object'));
  }
  const baseResults = combine(
    isPresent('key', item.key),
    matchesPattern('key', item.key, KEY_PATTERNS.grammar),
    isStringEnum('jlpt', item.jlpt, JLPT_LEVELS),
    isInteger('ordinal', item.ordinal, 1, 9999),
    isNonEmptyString('title_en', item.title_en),
    isNonEmptyString('title_ar', item.title_ar),
    isNonEmptyString('body_en', item.body_en),
    isNonEmptyString('body_ar', item.body_ar),
    detectArabicDialectMarkers('title_ar', item.title_ar),
    detectArabicDialectMarkers('body_ar', item.body_ar),
    isInteger('difficulty', item.difficulty, 1, 5),
    isInteger('estimated_minutes', item.estimated_minutes, 1, 30)
  );

  // Examples array
  if (!Array.isArray(item.examples)) {
    return combine(baseResults, fail(err('examples', 'must be an array')));
  }
  if (item.examples.length < 2 || item.examples.length > 4) {
    return combine(baseResults, fail(err('examples', `must have 2-4 entries (got ${item.examples.length})`)));
  }

  const exampleErrors = [];
  item.examples.forEach((ex, i) => {
    const prefix = `examples[${i}]`;
    if (!ex || typeof ex !== 'object') {
      exampleErrors.push(err(prefix, 'must be an object'));
      return;
    }
    if (typeof ex.ja !== 'string' || ex.ja.length === 0) exampleErrors.push(err(`${prefix}.ja`, 'required, non-empty string'));
    if (typeof ex.romaji !== 'string' || ex.romaji.length === 0) exampleErrors.push(err(`${prefix}.romaji`, 'required, non-empty string'));
    if (typeof ex.en !== 'string' || ex.en.length === 0) exampleErrors.push(err(`${prefix}.en`, 'required, non-empty string'));
    if (typeof ex.ar !== 'string' || ex.ar.length === 0) exampleErrors.push(err(`${prefix}.ar`, 'required, non-empty string'));
    if (typeof ex.breakdown !== 'string' || ex.breakdown.length === 0) exampleErrors.push(err(`${prefix}.breakdown`, 'required, non-empty string'));
    // AR dialect check on the example
    if (typeof ex.ar === 'string') {
      const dialectCheck = detectArabicDialectMarkers(`${prefix}.ar`, ex.ar);
      exampleErrors.push(...dialectCheck.errors);
    }
  });

  // Optional cross-refs
  const relatedGrammarResult = item.related_grammar === undefined
    ? ok()
    : isArrayOfStrings('related_grammar', item.related_grammar);
  const introducesVocabResult = item.introduces_vocab === undefined
    ? ok()
    : isArrayOfStrings('introduces_vocab', item.introduces_vocab);

  return combine(
    baseResults,
    { valid: exampleErrors.length === 0, errors: exampleErrors },
    relatedGrammarResult,
    introducesVocabResult
  );
}

// ============================================================
// Listening drill validator (Master Plan §4.1.1 — new in v2.0)
// ============================================================

function validateListening(item) {
  if (!item || typeof item !== 'object') {
    return fail(err('item', 'must be an object'));
  }
  return combine(
    isPresent('key', item.key),
    matchesPattern('key', item.key, KEY_PATTERNS.listening),
    isStringEnum('jlpt', item.jlpt, JLPT_LEVELS),
    isInteger('ordinal', item.ordinal, 1, 9999),
    isNonEmptyString('audio_key', item.audio_key),
    isNonEmptyString('ja_transcript', item.ja_transcript),
    isNonEmptyString('romaji', item.romaji),
    isBilingualField('en', item.en),
    isBilingualField('ar', item.ar),
    item.ar ? detectArabicDialectMarkers('ar.primary', item.ar.primary) : ok(),
    isArrayOfStrings('distractors_en', item.distractors_en, { min: 3, max: 3 }),
    isArrayOfStrings('distractors_ar', item.distractors_ar, { min: 3, max: 3 }),
    item.related_vocab === undefined ? ok() : isArrayOfStrings('related_vocab', item.related_vocab),
    item.related_grammar === undefined ? ok() : isArrayOfStrings('related_grammar', item.related_grammar),
    isInteger('difficulty', item.difficulty, 1, 5),
    isInteger('audio_duration_ms', item.audio_duration_ms, 200, 30000)
  );
}

// ============================================================
// Radical validator (CONTENT_GUIDELINES §10.7)
// ============================================================

function validateRadical(item) {
  if (!item || typeof item !== 'object') {
    return fail(err('item', 'must be an object'));
  }
  return combine(
    isPresent('key', item.key),
    matchesPattern('key', item.key, KEY_PATTERNS.radical),
    isNonEmptyString('glyph', item.glyph),
    isArrayOfStrings('en_meanings', item.en_meanings, { min: 1 }),
    isArrayOfStrings('ar_meanings', item.ar_meanings, { min: 1 }),
    isNonEmptyString('meaning_story_en', item.meaning_story_en),
    isNonEmptyString('meaning_story_ar', item.meaning_story_ar),
    detectArabicDialectMarkers('meaning_story_ar', item.meaning_story_ar),
    isInteger('stroke_count', item.stroke_count, 1, 30)
  );
}

// ============================================================
// Lesson container validator (Master Plan §4.2 — new in v2.0)
// ============================================================

function validateLesson(item) {
  if (!item || typeof item !== 'object') {
    return fail(err('item', 'must be an object'));
  }
  return combine(
    isPresent('lessonKey', item.lessonKey),
    matchesPattern('lessonKey', item.lessonKey, KEY_PATTERNS.lesson),
    isStringEnum('contentType', item.contentType, CONTENT_TYPES),
    isNonEmptyString('track', item.track),
    isInteger('trackPosition', item.trackPosition, 1, 999),
    isInteger('globalOrder', item.globalOrder, 1, 9999),
    isNonEmptyString('displayName_en', item.displayName_en),
    isNonEmptyString('displayName_ar', item.displayName_ar),
    detectArabicDialectMarkers('displayName_ar', item.displayName_ar),
    isNonEmptyString('introCopy_en', item.introCopy_en),
    isNonEmptyString('introCopy_ar', item.introCopy_ar),
    detectArabicDialectMarkers('introCopy_ar', item.introCopy_ar),
    isArrayOfStrings('itemKeys', item.itemKeys, { min: 1, max: 12 }),
    isInteger('estimated_minutes', item.estimated_minutes, 1, 30),
    item.isReviewLesson === undefined
      ? ok()
      : (typeof item.isReviewLesson === 'boolean'
          ? ok()
          : fail(err('isReviewLesson', 'must be a boolean if present'))),
    isStringEnum('jlpt', item.jlpt, [...JLPT_LEVELS, 'n5+n4'])
  );
}

// ============================================================
// Dispatch — pick the validator by content type
// ============================================================

function validateContentItem(contentType, item) {
  switch (contentType) {
    case 'hiragana':
    case 'katakana':
      return validateKana(item);
    case 'vocab':
      return validateVocab(item);
    case 'kanji':
      return validateKanji(item);
    case 'grammar':
      return validateGrammar(item);
    case 'listening':
      return validateListening(item);
    case 'radicals':
      return validateRadical(item);
    case 'lesson':
      return validateLesson(item);
    default:
      return fail(err('contentType', `unknown content type: ${contentType}. Allowed: ${CONTENT_TYPES.join(', ')}, lesson`));
  }
}

// ============================================================
// Formatter — pretty-print errors for the L2.04 CLI
// ============================================================

function formatErrors(result) {
  if (result.valid) return '✓ valid';
  return result.errors
    .map(e => `  ✕ ${e.field}: ${e.message}`)
    .join('\n');
}

// ============================================================
// Exports
// ============================================================

export {
  // Per-type validators
  validateKana,
  validateVocab,
  validateKanji,
  validateGrammar,
  validateListening,
  validateRadical,
  validateLesson,
  // Dispatch
  validateContentItem,
  // Helpers (exported for tests or for L2.04 to compose)
  detectArabicDialectMarkers,
  formatErrors,
  // Constants
  JLPT_LEVELS,
  KANA_ROWS,
  VOCAB_CATEGORIES,
  CONTENT_TYPES,
  KEY_PATTERNS
};
