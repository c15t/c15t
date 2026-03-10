import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: {
		alias: {
			'~': resolve(__dirname, './src'),
		},
	},
	test: {
		environment: 'jsdom',
		include: ['**/__tests__/**/*.test.ts'],
		mockReset: true,
	},
});
