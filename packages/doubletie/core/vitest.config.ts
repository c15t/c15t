import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		// Test environment and globals
		environment: 'node',
		globals: true,
		// Test organization
		include: [
			'src/__tests__/**/*.{test,spec}.{js,ts}',
			'src/__tests__/**/*.test-d.ts',
		],
		exclude: ['**/node_modules/**', '**/dist/**'],
		// Configure test suites
		testNamePattern:
			process.env.TEST_TYPE === 'e2e'
				? 'e2e'
				: process.env.TEST_TYPE === 'unit'
					? 'unit'
					: undefined,

		// Configure coverage
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: ['src/__tests__/fixtures/**', 'src/__tests__/types/**'],
		},
	},
});
