import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint({ overrideConfigFile: 'eslint.config.js' });

async function lint(code: string, filePath = 'src/engine/bad.ts') {
  const [result] = await eslint.lintText(code, { filePath });
  return result?.messages.filter((m) => m.severity === 2) ?? [];
}

const BAD: [string, string][] = [
  ['window', 'export const a = window.innerWidth;'],
  ['document', 'export const a = document.title;'],
  ['localStorage', 'export const a = localStorage.getItem("x");'],
  ['sessionStorage', 'export const a = sessionStorage.length;'],
  ['fetch', 'export const a = fetch("/x");'],
  ['performance', 'export const a = performance.now();'],
  ['navigator', 'export const a = navigator.userAgent;'],
  ['setTimeout', 'export const a = setTimeout(() => 1, 5);'],
  ['setInterval', 'export const a = setInterval(() => 1, 5);'],
  ['requestAnimationFrame', 'export const a = requestAnimationFrame(() => 1);'],
  ['Math.random', 'export const a = Math.random();'],
  ['Date.now', 'export const a = Date.now();'],
  ['new Date', 'export const a = new Date();'],
  ['import from fx', 'import { x } from "../fx/light";\nexport const a = x;'],
  ['import from ui', 'import { x } from "../ui/shell";\nexport const a = x;'],
  ['import from audio', 'import { x } from "../audio/mix";\nexport const a = x;'],
  ['import from checks', 'import { x } from "../checks/axe";\nexport const a = x;'],
  ['import from hunt', 'import { x } from "../hunt/solver";\nexport const a = x;'],
  ['import with src path', 'import { x } from "src/ui/shell";\nexport const a = x;'],
];

describe('engine purity (ESLint)', () => {
  it.each(BAD)('forbids %s in src/engine', async (_name, code) => {
    const errors = await lint(code);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('accepts clean engine code', async () => {
    const errors = await lint('export const a = (n: number): number => n + 1;\n');
    expect(errors).toEqual([]);
  });

  it('accepts a clean relative import inside the engine', async () => {
    const errors = await lint(
      'import { clamp } from "./clamp";\nexport const a = clamp(1, 0, 2);\n',
    );
    expect(errors).toEqual([]);
  });

  it('does not apply these rules outside src/engine', async () => {
    const errors = await lint('export const a = Date.now();\n', 'src/fx/clock.ts');
    expect(errors).toEqual([]);
  });
});
