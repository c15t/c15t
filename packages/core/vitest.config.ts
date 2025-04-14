import { resolve } from 'node:path';
import { baseConfig } from '@c15t/vitest-config/base';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
  baseConfig,
  defineConfig({
    resolve: {
      alias: {
        '~': resolve(__dirname, './src'),
      },
    },
    test: {
      environment: 'node',
      include: [
        '**/__tests__/**/*.test.ts',
        '**/__tests__/**/*.browser.test.ts',
      ],
      setupFiles: ['./vitest.setup.ts'],
      mockReset: true,
    },
  })
);
