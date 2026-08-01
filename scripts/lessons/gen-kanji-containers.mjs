// scripts/lessons/gen-kanji-containers.mjs [--write]
// Kanji lesson containers from the verified radical-family design
// (scripts/lessons/kanji-lessons-design.json = {lessons, lessonCopy} out of
// the kanji-track-build workflow). Validates coverage (all 103 kanji exactly
// once, keys resolve on dev) + validateLesson before writing.
import { initAdmin, writeItem } from '../lib/admin.js';
import { validateLesson, formatErrors } from './validators.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

const WRITE = process.argv.includes('--write');
const { lessons, lessonCopy } = JSON.parse(readFileSync('scripts/lessons/kanji-lessons-design.json', 'utf8'));
const copyByN = new Map(lessonCopy.map(c => [c.n, c]));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

const { db, projectId } = initAdmin('dev');
const devKeys = new Set((await db.collection('content_sets/kanji/items').get()).docs.map(d => d.id));

const containers = []; let bad = 0;
for (const l of lessons) {
  const copy = copyByN.get(l.n);
  if (!copy) { console.log(`✗ kanji:${l.n}: no copy entry`); bad++; continue; }
  const missing = l.kanjiKeys.filter(k => !devKeys.has(k));
  if (missing.length) { console.log(`✗ kanji:${l.n}: keys not on dev: ${missing.join(',')}`); bad++; continue; }
  const c = {
    lessonKey: `kanji:${String(l.n).padStart(2, '0')}`,
    contentType: 'kanji', track: 'kanji', trackPosition: l.n,
    globalOrder: 400 + l.n,   // provisional; stamp assigns the woven order
    displayName_en: copy.displayName_en, displayName_ar: copy.displayName_ar,
    introCopy_en: copy.introCopy_en, introCopy_ar: copy.introCopy_ar,
    introCopy_ar_f: '',
    itemKeys: l.kanjiKeys,
    estimated_minutes: clamp(l.kanjiKeys.length + 3, 5, 12), jlpt: 'n5'
  };
  const res = validateLesson(c);
  if (!res.valid) { console.log(`✗ ${c.lessonKey} INVALID:\n${formatErrors(res)}`); bad++; continue; }
  containers.push(c);
}

const all = containers.flatMap(c => c.itemKeys);
const dupes = all.length - new Set(all).size;
console.log(`kanji: ${containers.length} lessons | coverage ${new Set(all).size}/${devKeys.size} | dupes ${dupes}`);
if (new Set(all).size !== devKeys.size || dupes) { console.log('COVERAGE FAILURE — not writing'); bad++; }
writeFileSync('scripts/lessons/kanji-containers.json', JSON.stringify(containers, null, 1));

if (WRITE && !bad) {
  // Preserve the woven globalOrder on regeneration: only stamp-globalorder
  // may change order; a re-run generator must not clobber it with
  // provisional values.
  const _cur = new Map((await db.collection('content_sets/lessons/items').get()).docs.map(d => [d.data().lessonKey, d.data().globalOrder]));
  containers.forEach(c => { const g = _cur.get(c.lessonKey); if (g) c.globalOrder = g; });
  for (const c of containers) await writeItem(db, 'lesson', c); console.log(`  ✓ wrote ${containers.length} → ${projectId}`); }
else if (!WRITE) console.log('  (dry run)');
process.exit(bad ? 1 : 0);
