import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@figcontrol/shared': '../../packages/shared/src/index.ts'
    }
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts', 'src/**/*.test.ts']
  }
});
