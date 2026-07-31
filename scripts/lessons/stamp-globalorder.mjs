// scripts/lessons/stamp-globalorder.mjs [--write]
// THE woven linear path, v2 — an EXPLICIT 133-lesson sequence (no arithmetic
// slot formulas; the v1 formula diverged from the designed adjacencies and a
// curriculum review caught it). Encodes the 2026-07-24 review fixes:
//   • verbs → ます → food → を run (items-before-rule, objects before を)
//   • places before に/で; demonstratives before の; numbers after yōon III
//   • ね/よ after the existence pair; だ opens the plain block; どちら → より → 一番
//   • katakana-anchor word lessons pinned after the rows they need
//   • colors/adjectives:3 co-located with adjective grammar; path ends on でしょう
// Verifies before writing: set-equality vs dev, kana-glyph dependencies for
// every vocab lesson, and grammar prerequisite assertions.
import { initAdmin } from '../lib/admin.js';

const WRITE = process.argv.includes('--write');
const G = (k) => `grammar:${k}`;

const SEQ = [
  'hiragana:01', 'hiragana:02', 'hiragana:03', 'hiragana:04', 'hiragana:05',
  'hiragana:06', 'hiragana:07', 'hiragana:08', 'hiragana:09', 'hiragana:10',
  'vocab:greetings:1',        // dakuten-free set (glyph-proven)
  'hiragana:11',              // dakuten が/ざ
  G('desu_copula'),
  'hiragana:12',              // dakuten だ/ば
  'vocab:greetings_more:1',   // ありがとう・こんばんは now readable
  G('wa_topic'),
  'hiragana:13',              // handakuten
  G('ka_question'),
  'vocab:demonstratives:1',
  'hiragana:14',              // yōon I
  G('no_possessive'),
  'vocab:demonstratives:2',
  'hiragana:15',              // yōon II
  G('ga_subject'),
  'hiragana:16',              // yōon III — hiragana complete
  'vocab:numbers:1',          // きゅう/じゅう need yōon
  G('mo_also'),
  'vocab:numbers:2',
  'vocab:verbs:1',
  G('masu_polite'),
  'vocab:food:1',
  G('wo_object'),             // built from known verbs + food
  'vocab:verbs:2',
  'katakana:01',
  'vocab:food:2',
  'vocab:places:1',
  G('ni_target'),             // place nouns available
  'katakana:02',
  'vocab:places:2',
  G('de_location'),
  'vocab:adjectives:1',
  'katakana:03',
  G('he_direction'),
  'vocab:adjectives:2',
  G('to_with_and'),
  'katakana:04',
  'vocab:time:1',
  G('kara_from'),
  G('made_until'),
  'katakana:05',
  'vocab:time:2',
  G('ya_and_etc'),
  'vocab:time:3',
  'katakana:06',
  G('arimasu_inanimate'),
  G('imasu_animate'),
  'vocab:family:1',
  'katakana:07',
  G('ne_confirm'),
  'vocab:family:2',
  'katakana:08',
  G('yo_assert'),
  'vocab:counters:1',
  'katakana:09',
  G('masen_neg'),
  'vocab:transport:1',
  'katakana:10',
  'vocab:katakana_words:1',   // コーヒー (needs ka+ha rows)
  G('mashita_past'),
  'vocab:transport:2',
  'katakana:11',              // dakuten I
  'vocab:katakana_words:2',   // トイレ・ホテル
  G('masendeshita'),
  'vocab:body:1',
  'katakana:12',              // dakuten II
  'vocab:katakana_words:3',   // レストラン
  G('mashou'),
  'vocab:body:2',
  'katakana:13',              // handakuten
  'vocab:katakana_words:4',   // ゼロ・バス
  'vocab:katakana_words:5',   // パン
  'vocab:nature:1',
  'katakana:14',              // yōon I
  G('deshita_past'),
  'vocab:nature:2',
  'katakana:15',              // yōon II
  G('ja_nai_neg'),
  'vocab:adverbs:1',
  'katakana:16',              // yōon III — katakana complete
  G('tai_want'),
  'vocab:adverbs:2',
  G('i_adj'),
  'vocab:adjectives:3',       // reactivated beside adjective grammar
  G('i_adj_neg'),
  'vocab:home_verbs:1',
  G('i_adj_past'),
  'vocab:colors:1',
  G('na_adj'),
  'vocab:colors:2',
  G('na_adj_neg'),
  'vocab:home_verbs:2',
  G('na_adj_past'),
  'vocab:colors:3',
  G('te_form'),               // base form BEFORE its derivatives
  'vocab:home_verbs:3',
  G('te_kudasai'),
  'vocab:objects:1',
  G('te_iru'),
  'vocab:objects:2',
  G('te_mo_ii'),
  'vocab:objects:3',
  G('te_wa_ikenai'),
  'vocab:school:1',
  G('da_copula'),             // opens the plain-form block
  G('dictionary_form'),       // review-mandated: ない/た derive from this base form
  G('nai_neg'),
  'vocab:school:2',
  G('ta_past'),
  'vocab:social_verbs:1',
  G('koto_ga_dekiru'),
  'vocab:social_verbs:2',
  G('dochira_which'),         // two-item frame before comparative
  G('yori_than'),
  G('ichiban_most'),
  G('kara_because'),
  G('dakara_so'),
  G('demo_but'),
  G('kedo_but'),
  G('sorekara_then'),
  G('toki_when'),
  G('mae_ni_before'),
  G('ato_de_after'),
  G('nagara_while'),
  G('deshou_probably')        // ends the path on a real teaching beat
];

const { db, projectId } = initAdmin('dev');
const snap = await db.collection('content_sets/lessons/items').get();
const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

// ---- 1. set equality ----
const have = new Set(docs.map(d => d.lessonKey));
const want = new Set(SEQ);
const missing = SEQ.filter(k => !have.has(k));
const extra = docs.filter(d => !want.has(d.lessonKey)).map(d => d.lessonKey);
if (SEQ.length !== new Set(SEQ).size) { console.error('SEQ has duplicates'); process.exit(1); }
console.log(`SEQ ${SEQ.length} | dev ${docs.length} | missing ${missing.length} | extra ${extra.length}`);
if (missing.length) console.log('  missing:', missing.join(', '));
if (extra.length) console.log('  extra:', extra.join(', '));

// ---- 2. glyph-dependency check on the FINAL order ----
const rank = new Map(SEQ.map((k, i) => [k, i + 1]));
const glyphRank = new Map();  // glyph → rank of the kana lesson that teaches it
for (const t of ['hiragana', 'katakana']) {
  const items = new Map((await db.collection(`content_sets/${t}/items`).get()).docs.map(d => [d.id, d.data().glyph]));
  for (const d of docs.filter(x => x.contentType === t)) {
    const r = rank.get(d.lessonKey); if (!r) continue;
    for (const k of d.itemKeys) {
      const glyph = items.get(k) || '';
      for (const ch of glyph) {
        const prev = glyphRank.get(ch);
        if (prev === undefined || r < prev) glyphRank.set(ch, r);
      }
    }
  }
}
// conventions covered by the reading-rules UI screen (D-C decision), not by kana lessons
['っ', 'ー', 'ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ', 'ッ', 'ァ', 'ィ', 'ゥ', 'ェ', 'ォ'].forEach(ch => glyphRank.set(ch, 0));

const vocabReading = new Map((await db.collection('content_sets/vocab/items').get()).docs.map(d => [d.id, d.data().reading]));
let glyphViolations = 0;
for (const d of docs.filter(x => x.contentType === 'vocab')) {
  const r = rank.get(d.lessonKey); if (!r) continue;
  for (const k of d.itemKeys) {
    for (const ch of (vocabReading.get(k) || '')) {
      const gr = glyphRank.get(ch);
      if (gr === undefined) { console.log(`  ✗ ${d.lessonKey}#${k}: glyph '${ch}' taught nowhere`); glyphViolations++; }
      else if (gr >= r) { console.log(`  ✗ ${d.lessonKey}#${k} (rank ${r}): glyph '${ch}' taught at rank ${gr}`); glyphViolations++; }
    }
  }
}
console.log(`glyph-dependency violations: ${glyphViolations}`);

// ---- 3. grammar prerequisite assertions ----
const before = (a, b) => { const ok = rank.get(G(a)) < rank.get(G(b)); if (!ok) { console.log(`  ✗ assert ${a} < ${b}`); return 1; } return 0; };
const beforeK = (a, b) => { const ok = rank.get(a) < rank.get(b); if (!ok) { console.log(`  ✗ assert ${a} < ${b}`); return 1; } return 0; };
let asserts = 0;
asserts += before('te_form', 'te_kudasai') + before('te_form', 'te_iru');
asserts += before('dochira_which', 'yori_than') + before('yori_than', 'ichiban_most');
asserts += before('da_copula', 'nai_neg') + before('nai_neg', 'ta_past');
asserts += before('masu_polite', 'wo_object') + before('desu_copula', 'wa_topic');
asserts += beforeK('vocab:verbs:1', G('masu_polite')) + beforeK('vocab:food:1', G('wo_object'));
asserts += beforeK('vocab:places:1', G('ni_target')) + beforeK('vocab:places:2', G('de_location'));
asserts += beforeK('vocab:demonstratives:1', G('no_possessive'));
asserts += beforeK('hiragana:16', 'vocab:numbers:1');   // じゅう needs yōon III
console.log(`grammar/order assertions failed: ${asserts}`);

if (missing.length || extra.length || glyphViolations || asserts) { console.log('\nNOT SAFE — fix before stamping.'); process.exit(1); }

if (WRITE) {
  let n = 0;
  for (const d of docs) { const go = rank.get(d.lessonKey); if (d.globalOrder !== go) { await db.doc(`content_sets/lessons/items/${d.id}`).update({ globalOrder: go }); n++; } }
  console.log(`\n✓ stamped ${n} of ${docs.length} → ${projectId}`);
} else console.log('\nALL CHECKS PASS (dry run — pass --write to stamp)');
process.exit(0);
