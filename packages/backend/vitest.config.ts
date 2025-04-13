import { resolve } from 'node:path';
import { baseConfig } from '@c15t/vitest-config/base';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
	baseConfig,
	defineConfig({
		plugins: [tsconfigPaths()],
		resolve: {
			alias: {
				'~': resolve(__dirname, './src'),
			},
		},
		test: {
			environment: 'node',
		},
	})
);
