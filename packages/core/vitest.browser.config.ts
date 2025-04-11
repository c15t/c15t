/// <reference types="vitest" />
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

// Configuration for browser tests
export default defineConfig({
	resolve: {
		alias: {
			'~': resolve(__dirname, './src'),
		},
	},
	test: {
		globals: true,
		environment: 'jsdom',
		include: ['**/__tests__/**/*.browser.test.ts'],
		// No setup files for browser tests since they use real browser APIs
	},
});
