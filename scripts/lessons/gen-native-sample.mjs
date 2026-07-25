// scripts/lessons/gen-native-sample.mjs
// D-B sampling design (lead-approved): build the native-reviewer pack from the
// CURRENT (post-AI-fix) copy — a shuffled, unlabeled mix of cards the AI pass
// edited and cards it kept. If the native reviewer starts rewriting the keeps,
// the AI pass was insufficient; if they confirm them, the rest is trustworthy.
import { readFileSync, writeFileSync } from 'node:fs';

const hira = JSON.parse(readFileSync('scripts/lessons/hiragana-lessons-copy.json', 'utf8'));
const kata = JSON.parse(readFileSync('scripts/lessons/katakana-lessons-copy.json', 'utf8'));
const vint = JSON.parse(readFileSync('scripts/lessons/vocab-cluster-intros.json', 'utf8')).clusters;

// AI-pass verdicts (from the 2026-07-24 review): edited vs kept
const EDITED = new Set(['hiragana:01','hiragana:02','hiragana:06','hiragana:09','hiragana:10','hiragana:11','hiragana:12','hiragana:13','hiragana:14','hiragana:15','hiragana:16','katakana:01','katakana:05','katakana:07','katakana:11','katakana:14','katakana:16','vocab:demonstratives','vocab:food','vocab:verbs','vocab:places','vocab:counters','vocab:family','vocab:transport','vocab:body','vocab:nature','vocab:adverbs','vocab:home_verbs','vocab:school','vocab:social_verbs']);
const KEEPS = ['hiragana:03','hiragana:04','hiragana:05','katakana:04','katakana:10','katakana:13','vocab:greetings','vocab:numbers','vocab:adjectives','vocab:colors'];

const all = [];
for (const [k, v] of Object.entries(hira)) if (!k.startsWith('_')) all.push({ key: k, ar_title: v.displayName_ar, ar: v.introCopy_ar });
for (const [k, v] of Object.entries(kata)) if (!k.startsWith('_')) all.push({ key: k, ar_title: v.displayName_ar, ar: v.introCopy_ar });
for (const c of vint) all.push({ key: `vocab:${c.slug}`, ar_title: c.name_ar, ar: c.intro_ar });

const pick = all.filter(x => EDITED.has(x.key) || KEEPS.includes(x.key));
// deterministic shuffle (no Date/random dependency): sort by a simple string hash
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 100000, 7);
pick.sort((x, y) => hash(x.key) - hash(y.key));

let md = `# مراجعة نصوص عربية — تطبيق لتعليم اليابانية (حزمة مستقلة)

> **طريقة الاستخدام:** أرسل هذا الملف كاملًا إلى مراجعٍ عربيّ اللغة (أو نموذج ذكاء اصطناعي يعمل بوصفه محرّرًا عربيًّا). لا يحتاج المراجع إلى أي ملفات أخرى.

## التعليمات

أنت محرّر لغة عربية فصحى. النصوص أدناه هي مقدّمات دروس (١–٢ جملة تظهر على بطاقة قبل بدء الدرس) في تطبيق يعلّم اللغة اليابانية للناطقين بالعربية — والجمهور شباب من مختلف البلدان العربية يستخدمون الهاتف. المطلوب لكل بطاقة:

1. حكم واحد: **سليمة** / **تحتاج تحسينًا** / **تحتاج إعادة صياغة**.
2. إن لم تكن سليمة: ما المشكلة تحديدًا، وما الصياغة الأفضل؟

قيّم: سلامة الفصحى وطبيعتها (لا ترجمة حرفية)، وخلوّها من العامية، ووضوحها للمبتدئ تمامًا، ونبرتها (ودودة دون تكلّف). المصطلحات اليابانية (هيراغانا، كاتاكانا، داكوتِن…) والحروف اللاتينية (a, ka…) مقصودة كما هي.

أجب بجدول: | رقم | الحكم | المشكلة | الصياغة المقترحة |

## البطاقات (${pick.length})

`;
pick.forEach((x, i) => { md += `\n**${i + 1}.** «${x.ar_title}»\n${x.ar}\n`; });
md += `\n---\n*ملاحظة للمالك (ليست للمراجع): خريطة الأرقام إلى المفاتيح محفوظة في scripts/lessons/native-sample-map.json — قارن أحكام المراجع بها: إن وافق على أغلب بطاقات "keep" فتدقيق الذكاء الاصطناعي كافٍ لبقية النصوص.*\n`;

writeFileSync('docs/review-brief-ARABIC-native-sample.md', md);
writeFileSync('scripts/lessons/native-sample-map.json', JSON.stringify(pick.map((x, i) => ({ n: i + 1, key: x.key, group: EDITED.has(x.key) ? 'edited' : 'keep' })), null, 1));
console.log(`native sample: ${pick.length} cards (${pick.filter(x => EDITED.has(x.key)).length} edited + ${pick.filter(x => KEEPS.includes(x.key)).length} keeps), shuffled → docs/review-brief-ARABIC-native-sample.md`);
process.exit(0);
