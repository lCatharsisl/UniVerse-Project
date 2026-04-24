import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setupTests.ts',
    include: ['src/**/*.smoke.test.ts', 'src/**/*.smoke.test.tsx'],
    exclude: ['node_modules/**', 'dist/**'],
  },
});
