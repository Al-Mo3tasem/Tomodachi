// scripts/lessons/gen-vocab-containers.mjs [--write]
// Vocab lesson containers from vocab-clusters-v2.json + vocab-cluster-intros.json.
// Splits each cluster into ≤10-item lessons, EXCLUDING katakana-anchor deferrals
// (those become separate anchor mini-lessons via gen-anchor-lessons.mjs).
// globalOrder provisional (200+), re-stamped later.
import { initAdmin, writeItem } from '../lib/admin.js';
import { validateLesson, formatErrors } from './validators.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

const WRITE = process.argv.includes('--write');
const spec = JSON.parse(readFileSync('scripts/lessons/vocab-clusters-v2.json', 'utf8'));
const intros = JSON.parse(readFileSync('scripts/lessons/vocab-cluster-intros.json', 'utf8')).clusters;
if (spec.clusters.length !== intros.length) { console.error(`cluster/intro count mismatch: ${spec.clusters.length} vs ${intros.length}`); process.exit(2); }

const { db, projectId } = initAdmin('dev');
const devVocabKeys = new Set((await db.collection('content_sets/vocab/items').get()).docs.map(d => d.id));
const PER_LESSON = 10;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
// Balanced chunking: 21 → 7+7+7 (never 10+10+1 — a 1-item lesson is an
// auto-win quiz). Sizes differ by at most 1.
const chunk = (a, max) => {
  const parts = Math.ceil(a.length / max) || 1;
  const base = Math.floor(a.length / parts);
  let extra = a.length % parts;
  const o = []; let i = 0;
  for (let p = 0; p < parts; p++) { const size = base + (extra-- > 0 ? 1 : 0); o.push(a.slice(i, i + size)); i += size; }
  return o;
};

const containers = []; let bad = 0; let go = 200; let deferredCount = 0;
for (let ci = 0; ci < spec.clusters.length; ci++) {
  const cl = spec.clusters[ci]; const meta = intros[ci];
  // exclude katakana-anchor deferrals (they anchor katakana weeks instead)
  const items = cl.items.filter(it => { if (it.deferToLesson) { deferredCount++; return false; } return true; });
  const dangling = items.filter(it => !devVocabKeys.has(it.key));
  if (dangling.length) { console.log(`✗ ${meta.slug}: keys not on dev: ${dangling.map(d => d.key).join(',')}`); bad++; }
  const lessons = chunk(items, PER_LESSON);
  lessons.forEach((group, li) => {
    const n = li + 1;
    const c = {
      lessonKey: `vocab:${meta.slug}:${n}`,
      contentType: 'vocab', track: `vocab_${meta.slug}`, trackPosition: n,
      globalOrder: go++,
      displayName_en: lessons.length > 1 ? `${meta.name_en} · ${n}` : meta.name_en,
      displayName_ar: lessons.length > 1 ? `${meta.name_ar} · ${n}` : meta.name_ar,
      introCopy_en: meta.intro_en, introCopy_ar: meta.intro_ar,
      introCopy_ar_f: meta.intro_ar_f ?? '',
      itemKeys: group.map(it => it.key),
      estimated_minutes: clamp(Math.round(group.length * 0.8) + 2, 4, 12), jlpt: 'n5'
    };
    if (c.itemKeys.length < 2) { console.log(`✗ ${c.lessonKey}: only ${c.itemKeys.length} item(s) — quiz would be an auto-win`); bad++; return; }
    const res = validateLesson(c);
    if (!res.valid) { console.log(`✗ ${c.lessonKey} INVALID:\n${formatErrors(res)}`); bad++; return; }
    containers.push(c);
  });
}

const all = containers.flatMap(c => c.itemKeys);
console.log(`vocab: ${containers.length} lessons across ${spec.clusters.length} clusters | ${all.length} item slots, ${new Set(all).size} unique, ${deferredCount} deferred to katakana anchors`);
console.log(`per-cluster: ${spec.clusters.map((c, i) => `${intros[i].slug}(${containers.filter(x => x.track === 'vocab_' + intros[i].slug).length})`).join(' ')}`);
writeFileSync('scripts/lessons/vocab-containers.json', JSON.stringify(containers, null, 1));

if (WRITE && !bad) {
  // Preserve the woven globalOrder on regeneration: only stamp-globalorder
  // may change order; a re-run generator must not clobber it with
  // provisional values.
  const _cur = new Map((await db.collection('content_sets/lessons/items').get()).docs.map(d => [d.data().lessonKey, d.data().globalOrder]));
  containers.forEach(c => { const g = _cur.get(c.lessonKey); if (g) c.globalOrder = g; });
  for (const c of containers) await writeItem(db, 'lesson', c); console.log(`  ✓ wrote ${containers.length} → ${projectId}`); }
else if (!WRITE) console.log('  (dry run)');
process.exit(bad ? 1 : 0);
