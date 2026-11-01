import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		// Node 25+ defines a global `localStorage` that is undefined without
		// `--localstorage-file`, hiding the test DOM's storage.
		execArgv: ['--no-experimental-webstorage'],
		include: ['src/**/*.test.ts'],
	},
});
