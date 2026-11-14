// focus-guard: allow
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const script = resolve(__dirname, '../../.kiro/scripts/focus-guard.mjs');

const scratch = mkdtempSync(join(tmpdir(), 'focus-guard-default-'));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

// Runs in a scratch folder by default so blocked writes never log into the repo.
function run(input: string, cwd: string = scratch) {
  return spawnSync(process.execPath, [script], { input, encoding: 'utf8', cwd });
}

function write(path: string, text: string) {
  return JSON.stringify({ toolName: 'fs_write', toolInput: { path, text } });
}

describe('focus-guard', () => {
  it('blocks outline: none in src/', () => {
    expect(run(write('src/ui/x.css', 'a { outline: none }')).status).toBe(2);
  });
  it('allows the same text outside src/', () => {
    expect(run(write('levels/foyer/index.html', 'a { outline: none }')).status).toBe(0);
  });
  it('allows :focus-visible outline', () => {
    expect(run(write('src/ui/x.css', ':focus-visible { outline: 2px solid }')).status).toBe(0);
  });
  it('allows outline: 0.5px', () => {
    expect(run(write('src/ui/x.css', 'a { outline: 0.5px solid }')).status).toBe(0);
  });
  it('blocks outline: 0', () => {
    expect(run(write('src/ui/x.css', 'a { outline: 0 }')).status).toBe(2);
  });
  it('ignores old text in an edit', () => {
    const event = JSON.stringify({
      toolInput: {
        path: 'src/ui/x.css',
        oldStr: 'a { outline: none }',
        newStr: ':focus-visible { outline: 2px solid }',
      },
    });
    expect(run(event).status).toBe(0);
  });
  it('allows broken JSON', () => {
    expect(run('{not json').status).toBe(0);
  });
  it('blocks fs_append of outline: none', () => {
    const event = JSON.stringify({
      toolName: 'fs_append',
      toolInput: { path: 'src/ui/x.css', text: 'a { outline: none }' },
    });
    expect(run(event).status).toBe(2);
  });
  it('allows fs_append of a visible outline', () => {
    const event = JSON.stringify({
      toolName: 'fs_append',
      toolInput: { path: 'src/ui/x.css', text: 'a:focus-visible { outline: 2px solid }' },
    });
    expect(run(event).status).toBe(0);
  });
  describe('str_replace checks the resulting file', () => {
    function replace(input: Record<string, unknown>, content: string) {
      const dir = mkdtempSync(join(tmpdir(), 'focus-guard-sr-'));
      try {
        mkdirSync(join(dir, 'src'), { recursive: true });
        writeFileSync(join(dir, 'src', 'x.css'), content);
        const event = JSON.stringify({
          toolName: 'str_replace',
          toolInput: { path: 'src/x.css', ...input },
        });
        return run(event, dir).status;
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    }
    it('blocks a replacement that has no outline word but makes outline: 0', () => {
      expect(
        replace({ oldStr: '3px solid red', newStr: '0' }, 'a { outline: 3px solid red; }'),
      ).toBe(2);
    });
    it('allows a harmless replacement', () => {
      expect(replace({ oldStr: '3px', newStr: '4px' }, 'a { outline: 3px solid red; }')).toBe(0);
    });
    it('blocks when replace_all makes every match bad', () => {
      expect(
        replace(
          { oldStr: '2px solid', newStr: 'none', replace_all: true },
          'a { outline: 2px solid; } b { outline: 2px solid; }',
        ),
      ).toBe(2);
    });
    it('allows when the file cannot be read and the new text is fine', () => {
      const event = JSON.stringify({
        toolName: 'str_replace',
        toolInput: { path: 'src/missing.css', oldStr: 'a', newStr: 'b' },
      });
      expect(run(event).status).toBe(0);
    });
  });
  it('still blocks and logs from an empty folder', () => {
    const dir = mkdtempSync(join(tmpdir(), 'focus-guard-'));
    try {
      expect(run(write('src/ui/x.css', 'a { outline: none }'), dir).status).toBe(2);
      expect(existsSync(join(dir, 'docs', 'evidence', 'events.jsonl'))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
