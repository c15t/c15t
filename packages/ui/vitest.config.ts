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
			environment: 'jsdom',
			include: [
				'src/**/__tests__/**/*.test.ts',
				'src/**/__tests__/**/*.test.tsx',
			],
		},
	})
);
