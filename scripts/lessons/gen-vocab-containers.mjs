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
const PER_LESSON = 10;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const chunk = (a, n) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };

const containers = []; let bad = 0; let go = 200; let deferredCount = 0;
for (let ci = 0; ci < spec.clusters.length; ci++) {
  const cl = spec.clusters[ci]; const meta = intros[ci];
  // exclude katakana-anchor deferrals (they anchor katakana weeks instead)
  const items = cl.items.filter(it => { if (it.deferToLesson) { deferredCount++; return false; } return true; });
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
    const res = validateLesson(c);
    if (!res.valid) { console.log(`✗ ${c.lessonKey} INVALID:\n${formatErrors(res)}`); bad++; return; }
    containers.push(c);
  });
}

const all = containers.flatMap(c => c.itemKeys);
console.log(`vocab: ${containers.length} lessons across ${spec.clusters.length} clusters | ${all.length} item slots, ${new Set(all).size} unique, ${deferredCount} deferred to katakana anchors`);
console.log(`per-cluster: ${spec.clusters.map((c, i) => `${intros[i].slug}(${containers.filter(x => x.track === 'vocab_' + intros[i].slug).length})`).join(' ')}`);
writeFileSync('scripts/lessons/vocab-containers.json', JSON.stringify(containers, null, 1));

if (WRITE && !bad) { for (const c of containers) await writeItem(db, 'lesson', c); console.log(`  ✓ wrote ${containers.length} → ${projectId}`); }
else if (!WRITE) console.log('  (dry run)');
process.exit(bad ? 1 : 0);
