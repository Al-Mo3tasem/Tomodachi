// scripts/lessons/gen-kana-containers.mjs  <track> [--write]
// Generalized kana-track container generator (hiragana | katakana).
// globalOrder here is a track-local PROVISIONAL (hiragana 1.., katakana 100+..);
// the true interleaved order is stamped later by stamp-globalorder.mjs.
import { initAdmin, writeItem } from '../lib/admin.js';
import { validateLesson, formatErrors } from './validators.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

const track = process.argv[2];
const WRITE = process.argv.includes('--write');
if (!['hiragana', 'katakana'].includes(track)) { console.error('usage: gen-kana-containers.mjs <hiragana|katakana> [--write]'); process.exit(2); }

const copy = JSON.parse(readFileSync(`scripts/lessons/${track}-lessons-copy.json`, 'utf8'));
const goBase = track === 'katakana' ? 100 : 0;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

const { db, projectId } = initAdmin('dev');
const snap = await db.collection(`content_sets/${track}/items`).get();
const romajiToKey = new Map();
snap.forEach(d => { const x = d.data(); romajiToKey.set(String(x.romaji).toLowerCase(), x.key); });

const containers = [];
let bad = 0;
for (const [lessonKey, def] of Object.entries(copy)) {
  if (lessonKey.startsWith('_')) continue;
  const trackPosition = Number(lessonKey.split(':')[1]);
  const itemKeys = []; const missing = [];
  for (const r of def.romaji) { const k = romajiToKey.get(r); if (k) itemKeys.push(k); else missing.push(r); }
  if (missing.length) { console.log(`✗ ${lessonKey}: romaji not in dev: ${missing.join(',')}`); bad++; continue; }
  const c = {
    lessonKey, contentType: track, track, trackPosition,
    globalOrder: goBase + (track === 'katakana' ? trackPosition : [1,2,3,4,5,6,7,8,9,10,12,14,16,17,19,21][trackPosition - 1]),
    displayName_en: def.displayName_en, displayName_ar: def.displayName_ar,
    introCopy_en: def.introCopy_en, introCopy_ar: def.introCopy_ar,
    introCopy_ar_f: def.introCopy_ar_f ?? '',
    itemKeys, estimated_minutes: clamp(Math.round(itemKeys.length * 0.7) + 3, 4, 10), jlpt: 'pre-n5'
  };
  const res = validateLesson(c);
  if (!res.valid) { console.log(`✗ ${lessonKey} INVALID:\n${formatErrors(res)}`); bad++; continue; }
  containers.push(c);
}

const all = containers.flatMap(c => c.itemKeys);
const covOk = new Set(all).size === snap.size && all.length === new Set(all).size;
if (!covOk) { console.log(`COVERAGE FAILURE (${new Set(all).size}/${snap.size}, dupes ${all.length - new Set(all).size}) — refusing to write`); bad++; }
console.log(`${track}: ${containers.length}/${Object.keys(copy).length - 1} valid | coverage ${new Set(all).size}/${snap.size} | dupes ${all.length - new Set(all).size}`);
writeFileSync(`scripts/lessons/${track}-containers.json`, JSON.stringify(containers, null, 1));

if (WRITE && !bad) {
  // Preserve the woven globalOrder on regeneration: only stamp-globalorder
  // may change order; a re-run generator must not clobber it with
  // provisional values.
  const _cur = new Map((await db.collection('content_sets/lessons/items').get()).docs.map(d => [d.data().lessonKey, d.data().globalOrder]));
  containers.forEach(c => { const g = _cur.get(c.lessonKey); if (g) c.globalOrder = g; });
  for (const c of containers) await writeItem(db, 'lesson', c);
  console.log(`  ✓ wrote ${containers.length} → ${projectId}`);
} else if (!WRITE) console.log('  (dry run)');
process.exit(bad ? 1 : 0);
