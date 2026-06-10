import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

// Integration suite: boots the Nest app against Postgres/Redis/MinIO.
// Run with `pnpm infra:up` first, then `pnpm test:int`.
// SWC transform is required so NestJS DI gets emitted decorator metadata
// (vitest's default esbuild does not emit it).
export default defineConfig({
  test: {
    include: ['**/*.int.spec.ts'],
    testTimeout: 30000,
    hookTimeout: 60000,
    fileParallelism: false,
    pool: 'forks',
  },
  plugins: [swc.vite({ module: { type: 'es6' } })],
});
