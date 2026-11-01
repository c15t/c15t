import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		// Node 25+ defines a global `localStorage` that is undefined without
		// `--localstorage-file`, hiding the test DOM's storage. Earlier Node
		// doesn't need the flag, and Node before 22.4 rejects it.
		execArgv:
			Number.parseInt(process.versions.node, 10) >= 25
				? ['--no-experimental-webstorage']
				: [],
		include: ['src/**/*.test.ts'],
	},
});
