import { resolve } from 'node:path';
import { baseConfig } from '@c15t/vitest-config/base';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
	baseConfig,
	defineConfig({
		resolve: {
			alias: {
				'~': resolve(__dirname, '../core/src'),
				c15t: resolve(__dirname, '../core/src/index.ts'),
				'c15t-v3': resolve(__dirname, '../core-v3/src/index.ts'),
				'@c15t/schema/types': resolve(__dirname, '../schema/src/types.ts'),
				'@c15t/schema': resolve(__dirname, '../schema/src/index.ts'),
			},
		},
		test: {
			environment: 'node',
			include: ['src/v3/**/__tests__/**/*.test.ts'],
			passWithNoTests: true,
		},
	})
);
