/** A word is a run of characters that are not white space. */
export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
}

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isKebabCase(text: string): boolean {
  return KEBAB.test(text);
}

/** One non-empty sentence: any `.`, `!` or `?` is a single mark at the very end. */
export function isSingleSentence(text: string): boolean {
  const t = text.trim();
  if (t === '') return false;
  const body = t.replace(/[.!?]$/, '');
  return body.trim() !== '' && !/[.!?]/.test(body);
}
