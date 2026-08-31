import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
	root: fileURLToPath(new URL('.', import.meta.url)),
	test: {
		coverage: {
			enabled: true,
			include: ['**/*.ts', '!**/*.d.ts', '!**/node_modules/**'],
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
		include: ['**/*.test.ts'],
	},
});
