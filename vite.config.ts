import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';

export default defineConfig({
  base: '/keyboard-ghosts/',
  plugins: [preact()],
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/property/**/*.test.ts'],
  },
});
