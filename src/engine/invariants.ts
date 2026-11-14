import type { Level } from './schema';
import { HISTORY_LIMIT, type GameState } from './state';

export interface Violation {
  code:
    | 'ghost-ids-differ'
    | 'released-without-correct-pick'
    | 'haunting-with-correct-pick'
    | 'picked-unknown-repair'
    | 'attempts-invalid'
    | 'history-too-long'
    | 'history-entry-invalid'
    | 'step-invalid'
    | 'seed-invalid';
  message: string;
  ghost?: string;
}

function sameIds(a: string[], b: string[]): boolean {
  const x = [...a].sort();
  const y = [...b].sort();
  return x.length === y.length && x.every((id, i) => id === y[i]);
}

/** Returns the broken rules of a state. An empty list means the state is sound. */
export function checkInvariants(level: Level, state: GameState): Violation[] {
  const out: Violation[] = [];
  const levelIds = level.ghosts.map((g) => g.id);

  if (!sameIds(Object.keys(state.ghosts), levelIds)) {
    out.push({
      code: 'ghost-ids-differ',
      message: 'The state and the level have different ghosts.',
    });
  }

  for (const ghost of level.ghosts) {
    const s = state.ghosts[ghost.id];
    if (!s) continue;
    const repair = s.picked === null ? undefined : ghost.repairs.find((r) => r.id === s.picked);
    if (s.picked !== null && !repair) {
      out.push({
        code: 'picked-unknown-repair',
        message: 'The pick is not a repair of this ghost.',
        ghost: ghost.id,
      });
    }
    if (s.status === 'released' && !repair?.correct) {
      out.push({
        code: 'released-without-correct-pick',
        message: 'A released ghost holds the correct repair.',
        ghost: ghost.id,
      });
    }
    if (s.status === 'haunting' && repair?.correct) {
      out.push({
        code: 'haunting-with-correct-pick',
        message: 'A ghost with the correct repair is released.',
        ghost: ghost.id,
      });
    }
    if (!Number.isInteger(s.attempts) || s.attempts < 0) {
      out.push({
        code: 'attempts-invalid',
        message: 'Attempts is a whole number, zero or more.',
        ghost: ghost.id,
      });
    }
  }

  if (state.history.length > HISTORY_LIMIT) {
    out.push({ code: 'history-too-long', message: 'The history holds too many entries.' });
  }
  state.history.forEach((entry, i) => {
    let ok = sameIds(Object.keys(entry), levelIds);
    if (ok) {
      for (const ghost of level.ghosts) {
        const picked = entry[ghost.id]?.picked ?? null;
        if (picked !== null && !ghost.repairs.some((r) => r.id === picked)) ok = false;
      }
    }
    if (!ok) {
      out.push({
        code: 'history-entry-invalid',
        message: `History entry ${i} does not match the level.`,
      });
    }
  });

  if (!Number.isInteger(state.step) || state.step < 0) {
    out.push({
      code: 'step-invalid',
      message: 'The step counter is a whole number, zero or more.',
    });
  }
  if (!Number.isInteger(state.seed) || state.seed < 0 || state.seed > 0xffffffff) {
    out.push({ code: 'seed-invalid', message: 'The seed is a 32-bit whole number.' });
  }
  return out;
}
