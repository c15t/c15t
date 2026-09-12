import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		hookTimeout: 30_000,
		include: ['scripts/transport.test.ts'],
		testTimeout: 20_000,
	},
});
