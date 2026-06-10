import { defineConfig } from 'vitest/config';

// Default suite: fast unit tests only (no infra). Integration specs are excluded.
export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.int.spec.ts'],
  },
});
