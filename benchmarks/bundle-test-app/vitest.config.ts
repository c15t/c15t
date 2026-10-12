import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['*.test.ts', 'client-payload/*.test.ts'],
		testTimeout: 30_000,
	},
});
