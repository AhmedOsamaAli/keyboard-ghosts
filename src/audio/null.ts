import type { Audio } from './audio';

/** Sound that does nothing. For places where sound is not wired in, and for tests of the shell. */
export const nullAudio: Audio = {
  enable: () => Promise.resolve(),
  disable: () => Promise.resolve(),
  setChapter: () => {},
  setFocusState: () => {},
  play: () => {},
  setMaster: () => {},
  onCaption: () => () => {},
  state: () => ({ enabled: false, chapter: 'porch', focus: 'lit', masterDb: -6, layers: [] }),
  dispose: () => {},
};
