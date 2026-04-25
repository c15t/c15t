import { resolve } from 'node:path';
import { baseConfig } from '@c15t/vitest-config/base';
import vue from '@vitejs/plugin-vue';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
	baseConfig,
	defineConfig({
		plugins: [vue()],
		resolve: {
			alias: {
				'~': resolve(__dirname, './src'),
				// Point c15t/v3 at source so v3 changes in core don't
				// need a rebuild before these tests can run.
				'c15t/v3/modules/script-loader': resolve(
					__dirname,
					'../core/src/v3/modules/script-loader/index.ts'
				),
				'c15t/v3/modules/network-blocker': resolve(
					__dirname,
					'../core/src/v3/modules/network-blocker/index.ts'
				),
				'c15t/v3/modules/iframe-blocker': resolve(
					__dirname,
					'../core/src/v3/modules/iframe-blocker/index.ts'
				),
				'c15t/v3/modules/persistence': resolve(
					__dirname,
					'../core/src/v3/modules/persistence/index.ts'
				),
				'c15t/v3': resolve(__dirname, '../core/src/v3/index.ts'),
				c15t: resolve(__dirname, '../core/src/index.ts'),
				'@c15t/translations': resolve(
					__dirname,
					'../translations/src/index.ts'
				),
				'@c15t/schema/types': resolve(__dirname, '../schema/src/types.ts'),
				'@c15t/schema': resolve(__dirname, '../schema/src/index.ts'),
			},
		},
		test: {
			environment: 'jsdom',
			include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
		},
	})
);
