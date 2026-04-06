import { resolve } from 'node:path';
import { baseConfig } from '@c15t/vitest-config/base';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
	baseConfig,
	defineConfig({
		resolve: {
			alias: {
				// Resolve monorepo packages from source (same as esbuild build)
				'c15t/runtime': resolve(__dirname, '../core/src/runtime/index.ts'),
				'c15t/policy-actions': resolve(
					__dirname,
					'../core/src/libs/policy-actions.ts'
				),
				'c15t/script-loader': resolve(
					__dirname,
					'../core/src/libs/script-loader/index.ts'
				),
				c15t: resolve(__dirname, '../core/src/index.ts'),
				'@c15t/translations': resolve(
					__dirname,
					'../translations/src/index.ts'
				),
				'@c15t/schema/types': resolve(__dirname, '../schema/src/types.ts'),
				'@c15t/schema': resolve(__dirname, '../schema/src/index.ts'),
				'~': resolve(__dirname, '../core/src'),
			},
		},
		test: {
			include: ['src/**/*.test.ts', 'src/**/*.e2e.test.ts'],
			browser: {
				enabled: true,
				provider: playwright(),
				instances: [{ browser: 'chromium' }],
			},
			retry: 2,
		},
	})
);
