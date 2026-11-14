/**
 * Chrome adds the inputs of a node in an order that can change between runs. With three or more
 * inputs the float rounding then differs, and renders are not bitwise repeatable. Adding two
 * numbers is exact in either order, so every summing node here has at most two inputs.
 */

/** `count` input nodes summed in a binary tree into `out`. Connect exactly one node to each input. */
export function sumInputs(ctx: BaseAudioContext, out: AudioNode, count: number): GainNode[] {
  if (count <= 0) return [];
  let level: GainNode[] = Array.from({ length: count }, () => ctx.createGain());
  const leaves = level;
  if (count === 1) {
    leaves[0]?.connect(out);
    return leaves;
  }
  while (level.length > 2) {
    const next: GainNode[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const a = level[i] as GainNode;
      const b = level[i + 1];
      if (!b) {
        next.push(a);
        continue;
      }
      const node = ctx.createGain();
      a.connect(node);
      b.connect(node);
      next.push(node);
    }
    level = next;
  }
  for (const node of level) node.connect(out);
  return leaves;
}

export interface SlotMixer {
  /**
   * Connects `node` to a free slot from the context time `at` until `until` (Infinity for a bed
   * until `release`). When every slot is busy, the slot that frees first is taken over.
   */
  add(node: AudioNode, at: number, until: number): number;
  /** Marks a slot as free from the time `until`. */
  release(slot: number, until: number): void;
}

interface Slot {
  input: GainNode;
  node: AudioNode | null;
  busyUntil: number;
}

/** A fixed tree of `count` slots into `out`. A slot holds one voice at a time. */
export function createSlotMixer(ctx: BaseAudioContext, out: AudioNode, count: number): SlotMixer {
  const slots: Slot[] = sumInputs(ctx, out, count).map((input) => ({
    input,
    node: null,
    busyUntil: -Infinity,
  }));
  return {
    add(node, at, until) {
      let best = 0;
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i] as Slot;
        if (slot.busyUntil <= at) {
          best = i;
          break;
        }
        if (slot.busyUntil < (slots[best] as Slot).busyUntil) best = i;
      }
      const slot = slots[best] as Slot;
      if (slot.node) slot.node.disconnect(slot.input);
      node.connect(slot.input);
      slot.node = node;
      slot.busyUntil = until;
      return best;
    },
    release(index, until) {
      const slot = slots[index];
      if (slot) slot.busyUntil = until;
    },
  };
}
