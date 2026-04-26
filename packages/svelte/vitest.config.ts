import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: {
		alias: {
			'c15t/v3': resolve(__dirname, '../core/src/v3/index.ts'),
		},
	},
});
