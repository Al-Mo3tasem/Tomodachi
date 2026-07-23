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
