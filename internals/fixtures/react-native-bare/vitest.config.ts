import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		coverage: { enabled: false },
		environment: 'node',
		include: ['src/**/*.test.ts'],
	},
});
