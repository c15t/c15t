import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
	root: fileURLToPath(new URL('.', import.meta.url)),
	test: {
		environment: 'node',
		hookTimeout: 60_000,
		include: ['tests/**/*.test.ts'],
		testTimeout: 30_000,
	},
});
