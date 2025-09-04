import { resolve } from 'node:path';
import preact from '@preact/preset-vite';
import { defineConfig, mergeConfig } from 'vitest/config';
import { baseConfig } from '../../internals/vitest-config/src/base-config';

export default mergeConfig(
	baseConfig,
	defineConfig({
		plugins: [preact()],
		resolve: {
			alias: {
				'~': resolve(__dirname, './src'),
			},
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
