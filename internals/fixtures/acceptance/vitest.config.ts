import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		coverage: { enabled: false },
		environment: 'node',
		exclude: [...configDefaults.exclude, 'src/starters.test.ts'],
		expect: { poll: { interval: 50, timeout: 5000 } },
		fileParallelism: false,
		hookTimeout: 600_000,
		include: ['src/**/*.test.ts'],
		testTimeout: 60_000,
	},
});
