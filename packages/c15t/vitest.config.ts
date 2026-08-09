import { defineConfig } from 'vitest/config';

// The facade parity suite spawns a plain-Node subprocess for all module
// loading (see __tests__/parity-runner.mjs), so the Vitest environment stays
// a bare `node` with no coverage instrumentation — there is no package
// source to cover, only generated shims.
export default defineConfig({
	test: {
		environment: 'node',
		include: ['__tests__/**/*.test.ts'],
	},
});
