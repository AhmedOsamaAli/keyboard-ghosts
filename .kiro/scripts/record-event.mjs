// Records every hook event (raw stdin) to .local/events.jsonl. Never blocks.
import { appendFileSync, mkdirSync } from 'node:fs';

try {
  let raw = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) raw += chunk;
  mkdirSync('.local', { recursive: true });
  appendFileSync(
    '.local/events.jsonl',
    JSON.stringify({ time: new Date().toISOString(), raw }) + '\n',
  );
} catch (err) {
  console.error(`record-event: warning: ${err && err.message ? err.message : err}`);
}
process.exit(0);
