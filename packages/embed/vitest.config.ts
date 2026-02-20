import { resolve } from 'node:path';
import { uiConfig } from '@c15t/vitest-config/ui';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
	uiConfig,
	defineConfig({
		resolve: {
			alias: {
				'~': resolve(__dirname, './src'),
			},
		},
		test: {
			include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
		},
	})
);
