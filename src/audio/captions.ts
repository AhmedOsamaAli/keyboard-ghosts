/** What the shell receives for every sound. `quiet` is true when the shell should not announce it. */
export interface CaptionEvent {
  id: string;
  text: string;
  quiet: boolean;
}

export const CAPTION_MAX_WORDS = 6;
export const CAPTION_MERGE_MS = 400;

/** The broken rules of a caption. An empty list means the caption is valid. */
export function captionErrors(text: string): string[] {
  const errors: string[] = [];
  if (!text.startsWith('[') || !text.endsWith(']') || text.length < 2) {
    errors.push('caption must start with [ and end with ]');
    return errors;
  }
  const inner = text.slice(1, -1);
  if (inner !== inner.toLowerCase()) errors.push('caption must be lower case');
  const words = inner.split(/\s+/).filter((w) => w.length > 0);
  if (words.length < 1 || words.length > CAPTION_MAX_WORDS) {
    errors.push('caption must have 1 to 6 words');
  }
  if (/\d/.test(inner)) errors.push('caption must not contain digits');
  if (/[^\p{L}\d\s'-]/u.test(inner)) {
    errors.push('caption must not contain punctuation other than hyphens and apostrophes');
  }
  return errors;
}

export function isValidCaption(text: string): boolean {
  return captionErrors(text).length === 0;
}

export interface CaptionMerger {
  /** Returns the event, or null when the same text was emitted less than 400 ms ago. */
  offer(event: CaptionEvent): CaptionEvent | null;
}

/** `clock` gives milliseconds. A different text is never dropped. */
export function createCaptionMerger(
  clock: () => number,
  windowMs: number = CAPTION_MERGE_MS,
): CaptionMerger {
  const last = new Map<string, number>();
  return {
    offer(event) {
      const now = clock();
      const before = last.get(event.text);
      if (before !== undefined && now - before < windowMs) return null;
      last.set(event.text, now);
      return event;
    },
  };
}
