// scripts/lessons/gen-grammar-containers.mjs [--write]
// Grammar lesson containers in A-HYBRID (function-first) order, v2 after the
// 2026-07-24 curriculum review: て-form now precedes てください; だ opens the
// plain-form block (before ない/た); どちら precedes より/一番; ね/よ moved
// after the existence pair. displayName reuses authored title_en/ar; introCopy
// is a trimmed teaser of the authored body_en/ar.
import { initAdmin, writeItem } from '../lib/admin.js';
import { validateLesson, formatErrors } from './validators.mjs';
import { writeFileSync } from 'node:fs';

const WRITE = process.argv.includes('--write');

// A-hybrid v2 as stored ordinals (54, unique):
const ORDER = [16, 1, 13, 8, 2, 11, 20, 3, 4, 5, 6, 7, 9, 10, 12, 39, 40, 14, 15,
  21, 22, 23, 24, 18, 19, 30, 33, 35, 36, 34, 37, 38, 26, 25, 27, 28, 29,
  17, 55, 31, 32, 53, 43, 41, 42, 47, 46, 44, 48, 45, 49, 50, 51, 52, 54];
if (ORDER.length !== 55 || new Set(ORDER).size !== 55) { console.error('ORDER must be 55 unique ordinals'); process.exit(2); }

function teaser(s, max = 200) {
  if (!s) return null;
  const clean = String(s).replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('。'), cut.lastIndexOf('؟'));
  return (lastStop > 60 ? cut.slice(0, lastStop + 1) : cut).trim() + (lastStop > 60 ? '' : '…');
}

const { db, projectId } = initAdmin('dev');
const snap = await db.collection('content_sets/grammar/items').get();
const byOrd = new Map(snap.docs.map(d => [d.data().ordinal, d.data()]));

const containers = []; let bad = 0;
ORDER.forEach((ord, i) => {
  const it = byOrd.get(ord);
  if (!it) { console.log(`✗ ordinal ${ord} not found`); bad++; return; }
  const pos = i + 1;
  const c = {
    lessonKey: `grammar:${it.key.replace(/^g_n5_\d+_/, '')}`,
    contentType: 'grammar', track: 'grammar', trackPosition: pos,
    globalOrder: 300 + pos,   // provisional; stamp-globalorder assigns the woven order
    displayName_en: it.title_en, displayName_ar: it.title_ar,
    introCopy_en: teaser(it.body_en) || `Grammar point ${pos}: ${it.title_en}.`,
    introCopy_ar: teaser(it.body_ar) || it.title_ar,
    itemKeys: [it.key], estimated_minutes: 7, jlpt: 'n5', introCopy_ar_f: ''
  };
  const res = validateLesson(c);
  if (!res.valid) { console.log(`✗ ${c.lessonKey} INVALID:\n${formatErrors(res)}`); bad++; return; }
  containers.push(c);
});

console.log(`grammar: ${containers.length}/55 valid (A-hybrid v2 + dictionary form)`);
console.log('first 12:', containers.slice(0, 12).map(c => c.displayName_en.split(' — ')[0]).join(' → '));
writeFileSync('scripts/lessons/grammar-containers.json', JSON.stringify(containers, null, 1));
if (WRITE && !bad) { for (const c of containers) await writeItem(db, 'lesson', c); console.log(`  ✓ wrote ${containers.length} → ${projectId}`); }
else if (!WRITE) console.log('  (dry run)');
process.exit(bad ? 1 : 0);
