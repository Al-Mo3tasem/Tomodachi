// scripts/lessons/gen-review-briefs.mjs
// Emits two self-contained, paste-to-an-agent review briefs:
//   docs/review-brief-ARABIC-copy.md      (native-Arabic reviewer)
//   docs/review-brief-CURRICULUM-order.md (JLPT N5 pedagogy reviewer)
import { initAdmin } from '../lib/admin.js';
import { readFileSync, writeFileSync } from 'node:fs';

const hira = JSON.parse(readFileSync('scripts/lessons/hiragana-lessons-copy.json', 'utf8'));
const kata = JSON.parse(readFileSync('scripts/lessons/katakana-lessons-copy.json', 'utf8'));
const vintro = JSON.parse(readFileSync('scripts/lessons/vocab-cluster-intros.json', 'utf8')).clusters;

const { db } = initAdmin('dev');
const L = (await db.collection('content_sets/lessons/items').get()).docs.map(d => d.data()).sort((a, b) => a.globalOrder - b.globalOrder);
const grammar = L.filter(d => d.contentType === 'grammar').sort((a, b) => a.trackPosition - b.trackPosition);

// ---------- Brief 1: Arabic copy ----------
let a = `# Tomodachi — Arabic Lesson-Copy Review (self-contained)

> **How to use:** paste this ENTIRE file to a native-Arabic reviewer or an AI model. Section 1 is the instructions; everything after is what they review. No repo access needed.

## 1. PROMPT — instructions to the reviewer

You are a **native Modern Standard Arabic (MSA / الفصحى) editor** and a Japanese-learning content specialist. This is an **Arabic-first** app teaching Japanese to Arabic speakers; the Arabic quality is the product's main differentiator, so it must read as if written by a native educator — **never as a translation of the English**. For EACH lesson-intro below, judge the Arabic on: (1) natural, fluent MSA — no translationese, no calques, no English word order; (2) zero dialect (no Egyptian/Levantine/Gulf markers); (3) pedagogical clarity for a total beginner; (4) faithful to the English intent without copying its structure; (5) correct terminology and diacritics where used. Be specific: when something is off, give the exact fix. Answer ONLY in the JSON schema in section 4.

## 2. CONTEXT

- Learners: absolute beginners, native Arabic speakers (MENA), learning Japanese at JLPT N5 level, mostly on mobile.
- Each "lesson intro" is 1–2 sentences shown on a card BEFORE the learner starts that lesson. It should be warm, encouraging, and clear.
- Japanese terms (hiragana, katakana, dakuten, yōon…) and romaji letters (a, ka…) appear inline and are fine as-is.
- These texts were drafted by an AI; you are the quality gate.

## 3. THE COPY TO REVIEW (English shown only so you can judge fidelity — do NOT rate the English)

`;
let idx = 1;
const block = (key, en_name, ar_name, en_intro, ar_intro) => {
  a += `\n### ${idx}. \`${key}\`\n- **EN title:** ${en_name}\n- **AR title:** ${ar_name}\n- **EN intro:** ${en_intro}\n- **AR intro:** ${ar_intro}\n`;
  idx++;
};
a += `\n## 3a. Hiragana track (16)\n`;
for (const [k, v] of Object.entries(hira)) if (!k.startsWith('_')) block(k, v.displayName_en, v.displayName_ar, v.introCopy_en, v.introCopy_ar);
a += `\n## 3b. Katakana track (16)\n`;
for (const [k, v] of Object.entries(kata)) if (!k.startsWith('_')) block(k, v.displayName_en, v.displayName_ar, v.introCopy_en, v.introCopy_ar);
a += `\n## 3c. Vocab cluster intros (20)\n`;
for (const c of vintro) block(`vocab:${c.slug}`, c.name_en, c.name_ar, c.intro_en, c.intro_ar);

a += `
> Note: the 54 grammar lessons reuse Arabic from an earlier, separately-reviewed content batch (the \`body_ar\` fields), so they are excluded here to keep this review focused on the newly-drafted Arabic above.

## 4. REQUIRED OUTPUT SCHEMA

Respond with exactly one JSON object:

\`\`\`json
{
  "reviewer": "<name + one-line credential>",
  "overall": "excellent | good_minor_edits | needs_rework",
  "summary": "<2-3 sentences: overall Arabic quality + biggest recurring issue>",
  "per_lesson": [
    {
      "key": "<e.g. hiragana:01>",
      "verdict": "keep | edit | rewrite",
      "issue": "<what is wrong, or empty if keep>",
      "suggested_ar": "<your improved Arabic, or empty if keep>"
    }
  ],
  "systemic_notes": ["<recurring patterns to fix across all copy>"]
}
\`\`\`
Only list \`per_lesson\` entries whose verdict is edit or rewrite (skip the ones you'd keep), but set \`overall\` honestly.
`;
writeFileSync('docs/review-brief-ARABIC-copy.md', a);

// ---------- Brief 2: Curriculum order ----------
let g = `# Tomodachi — Final Curriculum Order Review (self-contained)

> **How to use:** paste this ENTIRE file to a Japanese-pedagogy expert or AI model. Confirms the BUILT lesson order (an earlier review approved the plan; this checks the finished sequence).

## 1. PROMPT

You are an expert in **JLPT N5 curriculum design and Japanese second-language acquisition**. Below is the FINAL, built linear lesson order for a beginner Japanese app for Arabic speakers — 133 lessons woven into one path, plus the grammar sub-sequence. Judge it for: (1) dependency correctness (nothing taught before its prerequisites — e.g. a grammar point before the verb form it needs); (2) pacing and cognitive load; (3) motivation for beginners. This order was already revised once by four reviewers (copula-first grammar, dakuten-before-greetings, food-before-を, katakana after early vocab) — your job is to catch anything that survived. Flag any specific lesson that is mis-placed. Answer ONLY in the section-4 schema.

## 2. CONTEXT

- Tracks & counts: Hiragana 16 lessons, Katakana 16, Vocab 47 (thematic clusters + 5 katakana-loanword mini-lessons), Grammar 54 (one point per lesson). Kanji is NOT yet in the path (authored later).
- Locked rules: hiragana rows 1–10 before any vocabulary; grammar in dependency order with です first; no more than ~3 same-type lessons in a row.
- \`globalOrder\` is reshuffle-safe, so any change you suggest is cheap to apply.

## 3a. THE FULL LINEAR PATH (globalOrder → lessonKey — English title)

\`\`\`
`;
for (const d of L) g += `${String(d.globalOrder).padStart(3)}  ${d.lessonKey.padEnd(28)} ${d.displayName_en}\n`;
g += `\`\`\`

## 3b. THE GRAMMAR SUB-SEQUENCE (A-hybrid, function-first — the 54 points in teaching order)

\`\`\`
`;
grammar.forEach((d, i) => { g += `${String(i + 1).padStart(2)}  ${d.displayName_en}\n`; });
g += `\`\`\`

## 4. REQUIRED OUTPUT SCHEMA

\`\`\`json
{
  "reviewer": "<name + one-line credential>",
  "overall_verdict": "approve | approve_with_changes | rework",
  "dependency_errors": [
    { "lesson": "<lessonKey or globalOrder>", "problem": "<what prerequisite is missing>", "fix": "<move where>" }
  ],
  "pacing_issues": [
    { "location": "<globalOrder range>", "issue": "<too dense / too sparse / too many same-type>", "fix": "<specific>" }
  ],
  "grammar_order_issues": [
    { "point": "<e.g. を>", "problem": "<...>", "fix": "<move before/after ...>" }
  ],
  "notable_good_choices": ["<what to keep deliberately>"],
  "confidence_notes": "<where you're least sure>"
}
\`\`\`
`;
writeFileSync('docs/review-brief-CURRICULUM-order.md', g);

console.log('wrote docs/review-brief-ARABIC-copy.md  (' + (idx - 1) + ' lessons embedded)');
console.log('wrote docs/review-brief-CURRICULUM-order.md  (' + L.length + ' lessons + ' + grammar.length + ' grammar points)');
process.exit(0);
