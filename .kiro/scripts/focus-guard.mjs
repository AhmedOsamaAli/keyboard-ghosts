// Blocks writes that remove the keyboard focus outline from the game's own UI.
// Exit 2 = blocked. Exit 0 = allowed (also for any failure before a decision).
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';

const EXT = /\.(css|tsx|ts|html)$/i;

function collect(value, key, out) {
  if (typeof value === 'string') {
    out.push({ key, value });
  } else if (Array.isArray(value)) {
    for (const item of value) collect(item, key, out);
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) collect(v, k, out);
  }
}

function isTargetPath(s) {
  if (s.length > 260 || /[\r\n]/.test(s) || !EXT.test(s)) return false;
  return /(^|\/)src\//.test(s.replace(/\\/g, '/'));
}

function matchRule(text) {
  if (/focus-guard: allow/.test(text)) return null;
  const re = /(?<![\w-])(outline-style|outline-width|outline)["']?\s*:\s*([^;}\n]*)/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    const prop = m[1].toLowerCase();
    const val = m[2]
      .replace(/!important/i, '')
      .replace(/["',]/g, '')
      .trim()
      .toLowerCase();
    if (prop === 'outline-style' && val === 'none') return 'outline-style: none';
    if (prop === 'outline' && val === 'none') return 'outline: none';
    if (prop !== 'outline-style' && /^0(px|em|rem)?$/.test(val)) return `${prop}: 0`;
  }
  return null;
}

// For str_replace: apply the edit in memory and return the resulting file text.
// Returns null when this is not a replace or the file cannot be read (caller falls back).
function resultOfReplace(event, path) {
  const input = event?.toolInput ?? event?.tool_input ?? event;
  if (!input || typeof input.oldStr !== 'string' || typeof input.newStr !== 'string') return null;
  if (input.oldStr === '') return null;
  let current;
  try {
    current = readFileSync(isAbsolute(path) ? path : join(process.cwd(), path), 'utf8');
  } catch {
    return null;
  }
  if (!current.includes(input.oldStr)) return null;
  return input.replace_all
    ? current.split(input.oldStr).join(input.newStr)
    : current.replace(input.oldStr, () => input.newStr);
}

function decide() {
  const raw = readStdin();
  const event = JSON.parse(raw);
  const strings = [];
  collect(event, '', strings);
  const target = strings.find((s) => isTargetPath(s.value));
  if (!target) return null;
  const resulting = resultOfReplace(event, target.value);
  if (resulting !== null) {
    const rule = matchRule(resulting);
    return rule ? { rule, path: target.value } : null;
  }
  for (const s of strings) {
    if (s === target || /old/i.test(s.key)) continue;
    const rule = matchRule(s.value);
    if (rule) return { rule, path: target.value };
  }
  return null;
}

import { readFileSync } from 'node:fs';
function readStdin() {
  return readFileSync(0, 'utf8');
}

let verdict = null;
try {
  verdict = decide();
} catch (err) {
  process.stderr.write(
    `focus-guard: warning, could not check this write (${err?.message ?? err}). Allowing it.\n`,
  );
  process.exit(0);
}

if (!verdict) process.exit(0);

process.stderr.write(
  `focus-guard: blocked a write to ${verdict.path}. Removing the focus outline hides keyboard focus (WCAG 2.4.7). Use :focus-visible with a visible style instead.\n`,
);
try {
  const file = join(process.cwd(), 'docs', 'evidence', 'events.jsonl');
  mkdirSync(dirname(file), { recursive: true });
  appendFileSync(
    file,
    JSON.stringify({
      time: new Date().toISOString(),
      rule: verdict.rule,
      path: verdict.path,
    }) + '\n',
  );
} catch {
  // logging must never change the decision
}
process.exit(2);
