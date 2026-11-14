import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// Purity rules for src/engine/**: no page, clock, randomness, network or other layers.
const FORBIDDEN_GLOBALS = [
  'window',
  'document',
  'localStorage',
  'sessionStorage',
  'fetch',
  'performance',
  'navigator',
  'setTimeout',
  'setInterval',
  'setImmediate',
  'clearTimeout',
  'clearInterval',
  'clearImmediate',
  'requestAnimationFrame',
  'cancelAnimationFrame',
].map((name) => ({
  name,
  message: 'The engine is pure: it never reads the page, the clock or the network.',
}));

// Purity rules for src/audio/**: time comes from the audio context's clock, randomness from the seeded
// generator, fetch is passed in, and nothing reads the page.
const AUDIO_FORBIDDEN_GLOBALS = [
  'window',
  'document',
  'localStorage',
  'sessionStorage',
  'fetch',
  'performance',
  'Date',
  'setTimeout',
  'setInterval',
  'setImmediate',
  'clearTimeout',
  'clearInterval',
  'clearImmediate',
  'requestAnimationFrame',
  'cancelAnimationFrame',
].map((name) => ({
  name,
  message:
    'src/audio reads no page, timer or clock: use the audio context clock, the seeded generator, and a fetch passed in.',
}));

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'playwright-report', 'test-results', '.local'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['scripts/**/*.mjs', '.kiro/scripts/**/*.mjs'],
    languageOptions: { globals: { console: 'readonly', process: 'readonly' } },
  },
  {
    files: ['src/engine/**/*.ts'],
    rules: {
      'no-restricted-globals': ['error', ...FORBIDDEN_GLOBALS],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use the seeded generator in rng.ts.' },
        { object: 'Date', property: 'now', message: 'Time is an input, never read in the engine.' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date']",
          message: 'Time is an input, never read in the engine.',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '(^|/)(fx|ui|audio|checks|hunt)(/|$)',
              message: 'The engine does not import from src/fx, ui, audio, checks or hunt.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/audio/**/*.ts'],
    rules: {
      'no-restricted-globals': ['error', ...AUDIO_FORBIDDEN_GLOBALS],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use the seeded generator (createRng).' },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '(^|/)(fx|ui|checks|hunt)(/|$)',
              message: 'src/audio does not import from src/fx, ui, checks or hunt.',
            },
            {
              regex: '(^|/)engine/(?!index(\\.ts)?$)',
              message: 'Import the engine only from src/engine/index.ts.',
            },
          ],
        },
      ],
    },
  },
);
