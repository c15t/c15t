import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		include: ['src/**/*.test.ts'],
		exclude: [
			'**/node_modules/**',
			'**/dist/**',
			'**/build/**',
			'**/.cache/**',
			'**/coverage/**',
		],
		coverage: {
			provider: 'istanbul',
			reporter: ['text', 'json-summary', 'json', 'html'],
			reportOnFailure: true,
			enabled: true,
			reportsDirectory: './coverage',
			include: ['src/**/*.ts', '!**/*.d.ts', '!**/node_modules/**'],
		},
	},
});
