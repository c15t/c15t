import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		hookTimeout: 60_000,
		include: ['src/__tests__/native/*.test.ts'],
		testTimeout: 30_000,
	},
});
