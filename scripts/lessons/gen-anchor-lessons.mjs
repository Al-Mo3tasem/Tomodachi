// scripts/lessons/gen-anchor-lessons.mjs [--write]
// The 7 katakana-anchor loanwords (deferred out of vocab clusters) become
// "katakana words in context" mini-lessons, each scheduled at the katakana
// lesson that makes its word readable (the review's recommendation).
import { initAdmin, writeItem } from '../lib/admin.js';
import { validateLesson, formatErrors } from './validators.mjs';
import { readFileSync } from 'node:fs';

const WRITE = process.argv.includes('--write');
const spec = JSON.parse(readFileSync('scripts/lessons/vocab-clusters-v2.json', 'utf8'));
const deferred = spec.clusters.flatMap(c => c.items.filter(it => it.deferToLesson));

// group by the katakana lesson they anchor to
const byLesson = new Map();
for (const it of deferred) { const L = it.deferToLesson; if (!byLesson.has(L)) byLesson.set(L, []); byLesson.get(L).push(it); }

const { db, projectId } = initAdmin('dev');
const devVocabKeys = new Set((await db.collection('content_sets/vocab/items').get()).docs.map(d => d.id));
const containers = []; let bad = 0; let n = 1;
for (const [anchorLesson, items] of [...byLesson.entries()].sort((a, b) => a[0] - b[0])) {
  const c = {
    lessonKey: `vocab:katakana_words:${n}`,
    contentType: 'vocab', track: 'vocab_katakana_words', trackPosition: n,
    globalOrder: 250 + n,
    displayName_en: `Katakana Words · ${n}`,
    displayName_ar: `كلمات بالكاتاكانا · ${n}`,
    introCopy_en: 'Real words written in the katakana you just learned. Loanwords like these are everywhere in daily Japanese — signs, menus, and shops.',
    introCopy_ar: 'كلماتٌ حقيقية مكتوبة بالكاتاكانا التي تعلمتها للتو. الكلمات الدخيلة مثل هذه منتشرة في اليابانية اليومية — على اللافتات وقوائم الطعام والمتاجر.',
    itemKeys: items.map(it => it.key),
    introCopy_ar_f: '',
    estimated_minutes: 5, jlpt: 'n5',
    _anchorsAfter: anchorLesson
  };
  const dangling = items.filter(it => !devVocabKeys.has(it.key));
  if (dangling.length) { console.log(`✗ ${c.lessonKey}: keys not on dev: ${dangling.map(d => d.key).join(',')}`); bad++; continue; }
  const { _anchorsAfter, ...doc } = c;
  const res = validateLesson(doc);
  if (!res.valid) { console.log(`✗ ${doc.lessonKey}:\n${formatErrors(res)}`); bad++; continue; }
  console.log(`✓ ${doc.lessonKey} (after katakana L${anchorLesson}): ${items.map(i => i.reading).join('、')}`);
  containers.push(doc); n++;
}

if (WRITE && !bad) {
  // Preserve the woven globalOrder on regeneration: only stamp-globalorder
  // may change order; a re-run generator must not clobber it with
  // provisional values.
  const _cur = new Map((await db.collection('content_sets/lessons/items').get()).docs.map(d => [d.data().lessonKey, d.data().globalOrder]));
  containers.forEach(c => { const g = _cur.get(c.lessonKey); if (g) c.globalOrder = g; });
  for (const c of containers) await writeItem(db, 'lesson', c); console.log(`  ✓ wrote ${containers.length} → ${projectId}`); }
else if (!WRITE) console.log('  (dry run)');
process.exit(bad ? 1 : 0);
