// scripts/lib/prompts.js
// Readline + $EDITOR helpers + per-content-type form definitions for the
// L2.04 authoring CLI.
//
// Field input modes (decision L2.04 plan #2C — hybrid):
//   - short:   inline readline prompt   (key, jlpt, romaji, etc.)
//   - long:    shell out to $EDITOR     (mnemonics, body, notes, stories)
//   - array:   read lines until blank   (en_meanings, onyomi, etc.)
//   - integer: inline + parseInt        (ordinal, stroke_count, difficulty)
//   - enum:    inline + enumerated list (category, jlpt, row)
//   - object:  recurses into sub-fields (en.primary, en.notes, mnemonic.en.meaning_story)
//
// The "edit whole as JSON" path uses $EDITOR on a JSON serialization of the
// current draft — useful when the lead wants to fix many fields at once or
// recover from a structural mistake.

import { createInterface } from 'node:readline';
import { stdin, stdout, platform, env } from 'node:process';
import { spawnSync } from 'node:child_process';
import { writeFileSync, readFileSync, mkdirSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SCRIPTS_ROOT = dirname(__dirname);
const TMP_DIR = join(SCRIPTS_ROOT, 'tmp');

// ============================================================
// ANSI colors (hand-rolled — no chalk dep)
// ============================================================

const C = {
  reset:  '\x1b[0m',
  dim:    '\x1b[2m',
  bold:   '\x1b[1m',
  red:    '\x1b[31m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  blue:   '\x1b[34m',
  magenta:'\x1b[35m',
  cyan:   '\x1b[36m',
  gray:   '\x1b[90m'
};

export const color = {
  dim:    s => `${C.dim}${s}${C.reset}`,
  bold:   s => `${C.bold}${s}${C.reset}`,
  red:    s => `${C.red}${s}${C.reset}`,
  green:  s => `${C.green}${s}${C.reset}`,
  yellow: s => `${C.yellow}${s}${C.reset}`,
  blue:   s => `${C.blue}${s}${C.reset}`,
  cyan:   s => `${C.cyan}${s}${C.reset}`,
  gray:   s => `${C.gray}${s}${C.reset}`,
  bullet: () => `${C.cyan}•${C.reset}`,
  check:  () => `${C.green}✓${C.reset}`,
  cross:  () => `${C.red}✕${C.reset}`,
  warn:   () => `${C.yellow}⚠${C.reset}`
};

// ============================================================
// Readline (AsyncIterator pattern — handles multiple sequential reads on
// both TTY and piped stdin. `readline/promises` rl.question() hangs on the
// second call with piped input; the iterator-based approach does not.)
// ============================================================

let _rl = null;
let _iter = null;

function getRL() {
  if (!_rl) {
    _rl = createInterface({ input: stdin, output: stdout });
    _iter = _rl[Symbol.asyncIterator]();
  }
  return _rl;
}
export function closeRL() {
  if (_rl) {
    _rl.close();
    _rl = null;
    _iter = null;
  }
}

export async function ask(prompt) {
  getRL();
  if (prompt) stdout.write(prompt);
  const { value, done } = await _iter.next();
  if (done) return '';
  return String(value).trim();
}

// Read multi-line until a blank line is entered. Returns an array of strings.
export async function askLines(prompt) {
  console.log(prompt);
  console.log(color.dim('  (one per line; blank line to finish)'));
  const lines = [];
  while (true) {
    const line = await ask(`  ${lines.length + 1}> `);
    if (line === '') break;
    lines.push(line);
  }
  return lines;
}

// ============================================================
// $EDITOR shell-out for long fields and "edit whole"
// ============================================================

function detectEditor() {
  // Honor explicit env override first.
  if (env.VISUAL) return env.VISUAL;
  if (env.EDITOR) return env.EDITOR;
  // Platform defaults — picked for "always available out of the box".
  if (platform === 'win32') return 'notepad';
  return 'nano';
}

// Open `initial` text in $EDITOR, return whatever was saved. `suffix` controls
// the temp file extension (.md for prose, .json for structured edit).
export function editInEditor(initial, suffix = '.md') {
  mkdirSync(TMP_DIR, { recursive: true });
  // Stable name based on caller-passed suffix + a process-relative counter.
  // (No Math.random / Date.now per script restrictions in some contexts.)
  editInEditor._counter = (editInEditor._counter || 0) + 1;
  const tmpPath = join(TMP_DIR, `edit-${process.pid}-${editInEditor._counter}${suffix}`);
  writeFileSync(tmpPath, initial ?? '', 'utf8');

  const editor = detectEditor();
  const result = spawnSync(editor, [tmpPath], { stdio: 'inherit', shell: false });
  if (result.error) {
    // Best-effort cleanup before re-throwing
    try { unlinkSync(tmpPath); } catch {}
    throw new Error(`failed to launch editor "${editor}": ${result.error.message}`);
  }
  const out = readFileSync(tmpPath, 'utf8');
  try { unlinkSync(tmpPath); } catch {}
  return out;
}

// ============================================================
// Form-field definitions per content type
// ============================================================
//
// Each field: { path, label, type, required, default?, enum?, hint? }
//   path:    dotted path into the item object ('en.primary', 'mnemonic.ar.meaning_story')
//   label:   human-readable prompt
//   type:    'short' | 'long' | 'integer' | 'enum' | 'array'
//   default: value or function(item) → value, applied if user input is empty

const VOCAB_CATEGORIES = [
  'verbs', 'nouns', 'adjectives', 'adverbs', 'expressions',
  'counters', 'time', 'days', 'family', 'food', 'places',
  'body', 'feelings', 'weather', 'nature'
];

const JLPT = ['pre-n5', 'n5', 'n4', 'n3'];

const KANA_ROWS = [
  'a', 'ka', 'sa', 'ta', 'na', 'ha', 'ma', 'ya', 'ra', 'wa', 'n',
  'gojuon', 'dakuten', 'handakuten', 'yoon'
];

export const FORMS = {
  vocab: [
    { path: 'key',                type: 'short',   label: 'key',            required: true },
    { path: 'jlpt',               type: 'enum',    label: 'JLPT level',     required: true, enum: JLPT, default: 'n5' },
    { path: 'category',           type: 'enum',    label: 'category',       required: true, enum: VOCAB_CATEGORIES },
    { path: 'japanese',           type: 'short',   label: 'Japanese (kanji+kana)', required: true },
    { path: 'reading',            type: 'short',   label: 'reading (kana only)',   required: true },
    { path: 'romaji',             type: 'short',   label: 'romaji',         required: true },
    { path: 'en.primary',         type: 'short',   label: 'EN primary meaning', required: true },
    { path: 'en.notes',           type: 'long',    label: 'EN notes (1-2 sentences max)', required: false },
    { path: 'ar.primary',         type: 'short',   label: 'AR primary meaning', required: true },
    { path: 'ar.notes',           type: 'long',    label: 'AR notes (1-2 sentences max)', required: false },
    { path: 'example_ja',         type: 'short',   label: 'example sentence (JA)', required: true },
    { path: 'example_en',         type: 'short',   label: 'example sentence (EN)', required: true },
    { path: 'example_ar',         type: 'short',   label: 'example sentence (AR)', required: true },
    { path: 'example_audio_key',  type: 'short',   label: 'example audio key', required: true, default: item => `examples/${item.key}` },
    { path: 'audio_key',          type: 'short',   label: 'audio key',      required: true, default: item => `vocab/${item.key}` },
    { path: 'difficulty',         type: 'integer', label: 'difficulty 1-5', required: true, default: 1 }
  ],

  hiragana: [
    { path: 'key',           type: 'short',   label: 'key',         required: true },
    { path: 'glyph',         type: 'short',   label: 'glyph',       required: true },
    { path: 'romaji',        type: 'short',   label: 'romaji',      required: true },
    { path: 'row',           type: 'enum',    label: 'row',         required: true, enum: KANA_ROWS },
    { path: 'mnemonic_en',   type: 'long',    label: 'EN mnemonic (1 sentence)', required: true },
    { path: 'mnemonic_ar',   type: 'long',    label: 'AR mnemonic (1 sentence, parallel-authored)', required: true },
    { path: 'audio_key',     type: 'short',   label: 'audio key',   required: true, default: item => `hiragana/${item.key}` },
    { path: 'jlpt',          type: 'enum',    label: 'JLPT level',  required: true, enum: JLPT, default: 'pre-n5' },
    { path: 'difficulty',    type: 'integer', label: 'difficulty 1-5', required: true, default: 1 }
  ],

  katakana: [
    { path: 'key',           type: 'short',   label: 'key',         required: true },
    { path: 'glyph',         type: 'short',   label: 'glyph',       required: true },
    { path: 'romaji',        type: 'short',   label: 'romaji',      required: true },
    { path: 'row',           type: 'enum',    label: 'row',         required: true, enum: KANA_ROWS },
    { path: 'mnemonic_en',   type: 'long',    label: 'EN mnemonic', required: true },
    { path: 'mnemonic_ar',   type: 'long',    label: 'AR mnemonic', required: true },
    { path: 'audio_key',     type: 'short',   label: 'audio key',   required: true, default: item => `katakana/${item.key}` },
    { path: 'jlpt',          type: 'enum',    label: 'JLPT level',  required: true, enum: JLPT, default: 'pre-n5' },
    { path: 'difficulty',    type: 'integer', label: 'difficulty 1-5', required: true, default: 1 }
  ],

  kanji: [
    { path: 'key',                            type: 'short',   label: 'key',         required: true },
    { path: 'jlpt',                           type: 'enum',    label: 'JLPT level',  required: true, enum: JLPT, default: 'n5' },
    { path: 'ordinal',                        type: 'integer', label: 'ordinal',     required: true },
    { path: 'kanji',                          type: 'short',   label: 'kanji',       required: true },
    { path: 'onyomi',                         type: 'array',   label: 'onyomi readings (katakana)', required: false },
    { path: 'kunyomi',                        type: 'array',   label: 'kunyomi readings (hiragana)', required: false },
    { path: 'en_meanings',                    type: 'array',   label: 'EN meanings (most-primary first)', required: true },
    { path: 'ar_meanings',                    type: 'array',   label: 'AR meanings (most-primary first)', required: true },
    { path: 'mnemonic.en.meaning_story',      type: 'long',    label: 'EN meaning story (anchor to shape)', required: true },
    { path: 'mnemonic.en.reading_story',      type: 'long',    label: 'EN reading story (phonetic hook)',  required: true },
    { path: 'mnemonic.ar.meaning_story',      type: 'long',    label: 'AR meaning story (independently authored)', required: true },
    { path: 'mnemonic.ar.reading_story',      type: 'long',    label: 'AR reading story (AR-native phonetic hook, NOT translated)', required: true },
    { path: 'radicals',                       type: 'array',   label: 'radical keys', required: true },
    { path: 'stroke_count',                   type: 'integer', label: 'stroke count', required: true },
    { path: 'example_vocab_keys',             type: 'array',   label: 'example vocab keys (optional)', required: false }
  ],

  grammar: [
    { path: 'key',               type: 'short',   label: 'key',           required: true },
    { path: 'jlpt',              type: 'enum',    label: 'JLPT level',    required: true, enum: JLPT, default: 'n5' },
    { path: 'ordinal',           type: 'integer', label: 'ordinal',       required: true },
    { path: 'title_en',          type: 'short',   label: 'EN title',      required: true },
    { path: 'title_ar',          type: 'short',   label: 'AR title',      required: true },
    { path: 'body_en',           type: 'long',    label: 'EN body (markdown)', required: true },
    { path: 'body_ar',           type: 'long',    label: 'AR body (markdown, parallel-authored)', required: true },
    { path: 'examples',          type: 'long',    label: 'examples array (open in editor as JSON: [{ja, romaji, en, ar, breakdown}, ...])', required: true, default: () => [] },
    { path: 'difficulty',        type: 'integer', label: 'difficulty 1-5', required: true, default: 1 },
    { path: 'estimated_minutes', type: 'integer', label: 'estimated minutes', required: true, default: 5 }
  ],

  listening: [
    { path: 'key',                type: 'short',   label: 'key',         required: true },
    { path: 'jlpt',               type: 'enum',    label: 'JLPT',        required: true, enum: JLPT, default: 'n5' },
    { path: 'ordinal',            type: 'integer', label: 'ordinal',     required: true },
    { path: 'audio_key',          type: 'short',   label: 'audio key',   required: true, default: item => `listening/${item.key}` },
    { path: 'ja_transcript',      type: 'short',   label: 'JA transcript', required: true },
    { path: 'romaji',             type: 'short',   label: 'romaji',      required: true },
    { path: 'en.primary',         type: 'short',   label: 'EN meaning',  required: true },
    { path: 'en.notes',           type: 'long',    label: 'EN notes',    required: false },
    { path: 'ar.primary',         type: 'short',   label: 'AR meaning',  required: true },
    { path: 'ar.notes',           type: 'long',    label: 'AR notes',    required: false },
    { path: 'distractors_en',     type: 'array',   label: 'EN distractors (exactly 3)', required: true },
    { path: 'distractors_ar',     type: 'array',   label: 'AR distractors (exactly 3)', required: true },
    { path: 'difficulty',         type: 'integer', label: 'difficulty 1-5', required: true, default: 1 },
    { path: 'audio_duration_ms',  type: 'integer', label: 'audio duration (ms)', required: true, default: 2000 }
  ],

  radicals: [
    { path: 'key',                  type: 'short',   label: 'key',          required: true },
    { path: 'glyph',                type: 'short',   label: 'glyph',        required: true },
    { path: 'en_meanings',          type: 'array',   label: 'EN meanings',  required: true },
    { path: 'ar_meanings',          type: 'array',   label: 'AR meanings',  required: true },
    { path: 'meaning_story_en',     type: 'long',    label: 'EN meaning story', required: true },
    { path: 'meaning_story_ar',     type: 'long',    label: 'AR meaning story (parallel-authored)', required: true },
    { path: 'stroke_count',         type: 'integer', label: 'stroke count', required: true }
  ]
};

// ============================================================
// Dotted-path get/set
// ============================================================

export function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

export function setPath(obj, path, value) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (cur[k] == null || typeof cur[k] !== 'object') cur[k] = {};
    cur = cur[k];
  }
  cur[parts[parts.length - 1]] = value;
  return obj;
}

// ============================================================
// Prompt a single field (used in field-walk and re-edit flows)
// ============================================================

function resolveDefault(field, item) {
  if (field.default == null) return undefined;
  return typeof field.default === 'function' ? field.default(item) : field.default;
}

export async function promptField(field, item) {
  const current = getPath(item, field.path);
  const hasCurrent = current !== undefined && current !== null && current !== '' && !(Array.isArray(current) && current.length === 0);

  const label = color.bold(field.label);
  const pathHint = color.gray(` (${field.path})`);
  const req = field.required ? color.red('*') : ' ';
  const header = `${req} ${label}${pathHint}`;

  console.log('');
  console.log(header);

  if (hasCurrent) {
    const shown = field.type === 'long' && typeof current === 'string' && current.length > 200
      ? current.slice(0, 200) + color.dim('… (truncated)')
      : JSON.stringify(current);
    console.log(color.dim(`  current: ${shown}`));
  }

  switch (field.type) {
    case 'short': {
      const def = hasCurrent ? current : resolveDefault(field, item);
      const promptText = def !== undefined && def !== ''
        ? `  > [${color.cyan(String(def))}] `
        : `  > `;
      const answer = await ask(promptText);
      if (answer === '') return def === undefined ? '' : def;
      return answer;
    }

    case 'integer': {
      const def = hasCurrent ? current : resolveDefault(field, item);
      const promptText = def !== undefined ? `  > [${color.cyan(String(def))}] ` : `  > `;
      const answer = await ask(promptText);
      if (answer === '') return def === undefined ? undefined : def;
      const n = parseInt(answer, 10);
      if (!Number.isFinite(n)) {
        console.log(color.yellow(`  ⚠ "${answer}" is not an integer — keeping current/default.`));
        return def;
      }
      return n;
    }

    case 'enum': {
      const def = hasCurrent ? current : resolveDefault(field, item);
      console.log(color.dim(`  options: ${field.enum.join(', ')}`));
      const promptText = def !== undefined ? `  > [${color.cyan(String(def))}] ` : `  > `;
      const answer = await ask(promptText);
      if (answer === '') return def;
      if (!field.enum.includes(answer)) {
        console.log(color.yellow(`  ⚠ "${answer}" is not in the allowed set — keeping current/default.`));
        return def;
      }
      return answer;
    }

    case 'long': {
      console.log(color.dim('  Press Enter to open editor. Save and close to submit.'));
      await ask(color.dim('  (Enter) '));
      const initial = typeof current === 'string' ? current
                    : current === undefined || current === null ? ''
                    : JSON.stringify(current, null, 2);
      // For 'examples' style fields that hold structured data, allow editing as JSON
      const suffix = field.path === 'examples' ? '.json' : '.md';
      const raw = editInEditor(initial, suffix);
      const trimmed = raw.replace(/\s+$/, '');
      if (suffix === '.json') {
        try {
          return JSON.parse(trimmed || '[]');
        } catch (e) {
          console.log(color.red(`  ✕ JSON parse failed: ${e.message}. Keeping previous value.`));
          return current;
        }
      }
      return trimmed;
    }

    case 'array': {
      if (hasCurrent) {
        console.log(color.dim(`  current: [${current.join(', ')}]`));
        const replace = await ask(`  Replace? [y/N] `);
        if (replace.toLowerCase() !== 'y') return current;
      }
      return askLines('  >');
    }

    default:
      throw new Error(`unknown field type: ${field.type}`);
  }
}

// ============================================================
// Walk the form for a content type, prompting for every field in order
// ============================================================

export async function walkForm(contentType, item) {
  const form = FORMS[contentType];
  if (!form) throw new Error(`no form defined for content type "${contentType}"`);
  for (const field of form) {
    const value = await promptField(field, item);
    if (value !== undefined) setPath(item, field.path, value);
  }
  return item;
}

// ============================================================
// Display the current draft side-by-side EN/AR for review
// ============================================================

export function displayDraft(contentType, item) {
  const form = FORMS[contentType];
  console.log('');
  console.log(color.bold('─── Current draft ' + '─'.repeat(50)));
  if (!form) {
    console.log(JSON.stringify(item, null, 2));
    return;
  }
  for (const field of form) {
    const val = getPath(item, field.path);
    const label = color.cyan(field.label.padEnd(38));
    const display = val === undefined || val === null || val === ''
      ? color.gray('(empty)')
      : Array.isArray(val)
        ? `[${val.join(', ')}]`
        : typeof val === 'object'
          ? JSON.stringify(val)
          : typeof val === 'string' && val.length > 120
            ? val.slice(0, 117) + '...'
            : String(val);
    console.log(`  ${label} ${display}`);
  }
  console.log(color.bold('─'.repeat(68)));
}

// ============================================================
// Open the entire draft as JSON in $EDITOR for bulk edits
// ============================================================

export function editAsJSON(item) {
  const initial = JSON.stringify(item, null, 2);
  const raw = editInEditor(initial, '.json');
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.log(color.red(`  ✕ JSON parse failed: ${e.message}. Keeping previous draft.`));
    return item;
  }
}
