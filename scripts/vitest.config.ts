import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
	root: fileURLToPath(new URL('.', import.meta.url)),
	test: {
		environment: 'node',
		include: ['**/*.test.ts'],
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
			include: ['**/*.ts', '!**/*.d.ts', '!**/node_modules/**'],
		},
	},
});
