import { resolve } from 'node:path';
import { baseConfig } from '@c15t/vitest-config/base';
import preact from '@preact/preset-vite';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
	baseConfig,
	defineConfig({
		plugins: [preact()],
		resolve: {
			alias: {
				'~': resolve(__dirname, './src'),
			},
		},
		optimizeDeps: {
			include: ['preact/hooks'],
		},
		test: {
			include: [
				'src/**/*.test.tsx',
				'src/**/*.test.ts',
				'src/**/*.spec.tsx',
				'src/**/*.spec.ts',
				'src/**/*.e2e.test.tsx',
			],

			browser: {
				enabled: true,
				provider: 'playwright',
				instances: [{ browser: 'chromium' }],
			},
		},
	})
);
