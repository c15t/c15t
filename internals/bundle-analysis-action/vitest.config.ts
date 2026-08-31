import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		coverage: {
			enabled: true,
			include: ['src/**/*.ts', '!**/*.d.ts', '!**/node_modules/**'],
			provider: 'istanbul',
			reportOnFailure: true,
			reporter: ['text', 'json-summary', 'json', 'html'],
			reportsDirectory: './coverage',
		},
		environment: 'node',
		exclude: [
			'**/node_modules/**',
			'**/dist/**',
			'**/build/**',
			'**/.cache/**',
			'**/coverage/**',
		],
		include: ['src/**/*.test.ts'],
	},
});
