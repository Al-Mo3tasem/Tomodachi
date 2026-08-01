// ============================================
// Tomodachi — Content transform (PURE, no deps)
// Adapts authored v2.0 per-item docs (content_sets/{type}/items/{key}) into
// the legacy set shape the game engine consumes:
//     { id, name, order, type, characters: [{ char, romaji }] }
//
// Kana are grouped by their `row` field. This is deliberately NOT an
// invented taxonomy: LEARNING_EXPERIENCE §2.1 locks "one lesson = one row",
// so a row grouping mirrors the hiragana:01–14 / katakana:01–14 tracks and
// is forward-compatible with the eventual lesson containers.
//
// PURE by design (zero imports) so it is unit-testable in Node against real
// Admin-SDK data without pulling in the browser Firebase SDK. The async
// Firestore read lives in content.js.
// ============================================

// Content types this transform currently handles. Vocab/kanji/grammar are
// intentionally excluded until the follow-on increment (vocab grouping is a
// design decision; kanji has no romaji; both need distractor type-scoping).
export const KANA_TYPES = ['hiragana', 'katakana'];

// Standard gojūon sequence, then the diacritic/compound rows. Matches the
// KANA_ROWS enum in js/validators/content.js.
export const ROW_ORDER = [
  'a', 'ka', 'sa', 'ta', 'na', 'ha', 'ma', 'ya', 'ra', 'wa', 'n',
  'gojuon', 'dakuten', 'handakuten', 'yoon'
];

const TYPE_ORDER = { hiragana: 0, katakana: 1 };

// Canonical gojūon sequence (Hepburn) used to order characters WITHIN a set,
// so a row reads あいうえお, not Firestore key order (あえいおう). Covers the
// full 104-glyph set: basic → dakuten → handakuten → yōon.
const KANA_SEQUENCE = [
  'a', 'i', 'u', 'e', 'o',
  'ka', 'ki', 'ku', 'ke', 'ko',
  'sa', 'shi', 'su', 'se', 'so',
  'ta', 'chi', 'tsu', 'te', 'to',
  'na', 'ni', 'nu', 'ne', 'no',
  'ha', 'hi', 'fu', 'he', 'ho',
  'ma', 'mi', 'mu', 'me', 'mo',
  'ya', 'yu', 'yo',
  'ra', 'ri', 'ru', 're', 'ro',
  'wa', 'wo', 'n',
  'ga', 'gi', 'gu', 'ge', 'go',
  'za', 'ji', 'zu', 'ze', 'zo',
  'da', 'di', 'du', 'de', 'do',
  'ba', 'bi', 'bu', 'be', 'bo',
  'pa', 'pi', 'pu', 'pe', 'po',
  'kya', 'kyu', 'kyo', 'sha', 'shu', 'sho', 'cha', 'chu', 'cho',
  'nya', 'nyu', 'nyo', 'hya', 'hyu', 'hyo', 'mya', 'myu', 'myo',
  'rya', 'ryu', 'ryo', 'gya', 'gyu', 'gyo', 'ja', 'ju', 'jo',
  'bya', 'byu', 'byo', 'pya', 'pyu', 'pyo'
];
const KANA_INDEX = new Map(KANA_SEQUENCE.map((r, i) => [r, i]));
const kanaRank = (romaji) => KANA_INDEX.has(romaji) ? KANA_INDEX.get(romaji) : 999;

// Authentic, locale-neutral Japanese row names (the legacy seed used the same
// あ行 style). Basic rows derive "{firstGlyph}行" from the data; the diacritic
// and compound rows get their proper names.
const SPECIAL_ROW_NAME = {
  dakuten: '濁音',
  handakuten: '半濁音',
  yoon: '拗音',
  gojuon: '五十音'
};

function setNameFor(row, characters) {
  if (row === 'n') return characters[0]?.char || 'ん';
  if (SPECIAL_ROW_NAME[row]) return SPECIAL_ROW_NAME[row];
  const first = characters[0]?.char;
  return first ? `${first}行` : row;
}

// Group one content type's authored items into legacy-shaped sets by row.
// items: Array<{ glyph, romaji, row, ... }> (raw Firestore doc data).
// Returns Array<{ id, name, order, type, characters:[{char,romaji}] }>.
// Items missing glyph or romaji are dropped (defensive; the authoring
// validator guarantees both, but a bridge should never emit a broken card).
export function groupKanaItems(type, items) {
  const byRow = new Map();
  const seen = new Set();
  for (const it of items) {
    if (!it || !it.glyph || !it.romaji) continue;
    if (seen.has(it.glyph)) continue;   // de-dupe: never emit a repeated card
    seen.add(it.glyph);
    const romaji = String(it.romaji).toLowerCase();
    // Dev-time guard: a romaji outside the canonical sequence sorts to the
    // tail of its row (graceful, but silently non-gojūon). Surface it so
    // future non-Hepburn content is caught rather than mis-ordered quietly.
    if (kanaRank(romaji) === 999 && typeof console !== 'undefined') {
      console.warn(`[content-transform] romaji "${romaji}" (${it.glyph}) not in canonical order — will sort last in its row`);
    }
    const row = it.row || 'other';
    if (!byRow.has(row)) byRow.set(row, []);
    byRow.get(row).push({ char: it.glyph, romaji });
  }

  const typeBase = (TYPE_ORDER[type] ?? 9) * 100;
  const sets = [];
  for (const [row, characters] of byRow) {
    if (!characters.length) continue;
    // Canonical within-row order (あいうえお), not Firestore key order.
    characters.sort((a, b) => kanaRank(a.romaji) - kanaRank(b.romaji));
    const ri = ROW_ORDER.indexOf(row);
    sets.push({
      id: `${type}_${row}`,
      name: setNameFor(row, characters),
      order: typeBase + (ri < 0 ? 99 : ri),
      type,
      characters
    });
  }
  sets.sort((a, b) => a.order - b.order);
  return sets;
}

// Full adapter: a map of { type: items[] } → flat, ordered set list.
export function buildKanaSets(itemsByType) {
  const out = [];
  for (const type of KANA_TYPES) {
    const items = itemsByType[type] || [];
    out.push(...groupKanaItems(type, items));
  }
  out.sort((a, b) => a.order - b.order);
  return out;
}

// ============================================
// Vocab → practice sets, grouped by the authored `category` tag
// (user decision 2026-07-24: practice-game vocab groups by category; the
// thematic lesson clusters are a different surface and live in the lesson
// path). Sets order AFTER all kana (kana = 0–199, vocab = 200+), in a
// pedagogically sensible category sequence.
// ============================================

// Taught-order for categories + display labels. Labels are English for now —
// set-name i18n is a flagged follow-up (legacy set names were locale-neutral
// Japanese like あ行; category names have no such neutral form).
export const VOCAB_CATEGORY_ORDER = [
  ['expressions', 'Expressions', 'تعابير'],
  ['time',        'Time', 'الوقت'],
  ['days',        'Days', 'الأيام'],
  ['counters',    'Counters', 'أدوات العدّ'],
  ['people',      'People', 'الناس'],
  ['family',      'Family', 'العائلة'],
  ['food',        'Food & Drink', 'الطعام والشراب'],
  ['places',      'Places', 'الأماكن'],
  ['body',        'Body', 'الجسم'],
  ['weather',     'Weather', 'الطقس'],
  ['nature',      'Nature', 'الطبيعة'],
  ['verbs',       'Verbs', 'أفعال'],
  ['adjectives',  'Adjectives', 'صفات'],
  ['adverbs',     'Adverbs', 'ظروف'],
  ['nouns',       'Nouns', 'أسماء']
];
const VOCAB_CAT_INDEX = new Map(VOCAB_CATEGORY_ORDER.map(([c], i) => [c, i]));
const VOCAB_CAT_LABEL = new Map(VOCAB_CATEGORY_ORDER.map(([c, en]) => [c, en]));
const VOCAB_CAT_LABEL_AR = new Map(VOCAB_CATEGORY_ORDER.map(([c, , ar]) => [c, ar]));

// Group vocab items into sets shaped like kana sets. The displayed "char" is
// the KANA READING (たべもの), not the kanji surface form (食べ物): kanji is
// excluded from the game for now (lead decision 2026-07-24), the N5 audience
// is pre-kanji so a kanji card would be unreadable, and TTS pronounces
// unambiguous kana correctly where kanji can misread. This also dissolves
// kanji homographs (人 = ひと vs にん become distinct cards). De-dupe is by
// the displayed kana form. Easiest first within a set (difficulty order).
export function groupVocabItems(items, useAr = false) {
  const byCat = new Map();
  const seen = new Set();
  for (const it of items) {
    const display = it && (it.reading || it.japanese);
    if (!it || !display || !it.romaji) continue;
    if (seen.has(display)) continue;   // two entries with one kana form → keep first
    seen.add(display);
    const cat = it.category || 'nouns';
    if (!byCat.has(cat)) byCat.set(cat, []);
    byCat.get(cat).push({
      char: display,
      romaji: String(it.romaji).toLowerCase(),
      _d: it.difficulty || 3
    });
  }

  const sets = [];
  for (const [cat, characters] of byCat) {
    if (!characters.length) continue;
    characters.sort((a, b) => a._d - b._d);
    characters.forEach(c => delete c._d);
    const ci = VOCAB_CAT_INDEX.has(cat) ? VOCAB_CAT_INDEX.get(cat) : 98;
    sets.push({
      id: `vocab_${cat}`,
      name: (useAr ? VOCAB_CAT_LABEL_AR.get(cat) : VOCAB_CAT_LABEL.get(cat)) || cat,
      order: 200 + ci,
      type: 'vocab',
      characters
    });
  }
  sets.sort((a, b) => a.order - b.order);
  return sets;
}
