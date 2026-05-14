import { resolve } from 'node:path';
import { baseConfig } from '@c15t/vitest-config/base';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
	baseConfig,
	defineConfig({
		resolve: {
			alias: {
				'~': resolve(__dirname, './src'),
				c15t: resolve(__dirname, '../core/src/index.ts'),
				'@c15t/schema/types': resolve(__dirname, '../schema/src/types.ts'),
				'@c15t/schema': resolve(__dirname, '../schema/src/index.ts'),
				'@c15t/translations': resolve(
					__dirname,
					'../translations/src/index.ts'
				),
			},
		},
		test: {
			environment: 'node',
			include: [
				'**/__tests__/**/**.test.ts',
				'**/__tests__/**/**.browser.test.ts',
			],
			setupFiles: ['../core/vitest.setup.ts'],
			mockReset: true,
		},
	})
);
