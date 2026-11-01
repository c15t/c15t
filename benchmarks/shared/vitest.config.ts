import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		// Node 25+ defines a global `localStorage` that is undefined without
		// `--localstorage-file`, hiding the test DOM's storage. Older Node
		// lacks the flag.
		execArgv:
			Number.parseInt(process.versions.node, 10) >= 25
				? ['--no-experimental-webstorage']
				: [],
		include: ['src/**/*.test.ts'],
	},
});
