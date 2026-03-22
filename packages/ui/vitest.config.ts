import { resolve } from 'node:path';
import { baseConfig } from '@c15t/vitest-config/base';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
	baseConfig,
	defineConfig({
		resolve: {
			alias: {
				'~': resolve(__dirname, './src'),
				'@c15t/translations': resolve(
					__dirname,
					'../translations/src/index.ts'
				),
				'@c15t/translations/all': resolve(
					__dirname,
					'../translations/src/all.ts'
				),
				c15t: resolve(__dirname, '../core/src/index.ts'),
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
