import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		coverage: { enabled: false },
		// DOM tests opt in per file with `@vitest-environment jsdom`; server
		// request tests stay on plain Node like a real server render.
		environment: 'node',
		// Node 25+ defines a global `localStorage` that is undefined without
		// `--localstorage-file`, hiding jsdom's storage. Older Node lacks the flag.
		execArgv:
			Number.parseInt(process.versions.node, 10) >= 25
				? ['--no-experimental-webstorage']
				: [],
		include: ['tests/**/*.test.{ts,tsx}'],
		passWithNoTests: false,
		restoreMocks: true,
		setupFiles: ['tests/setup.ts'],
		unstubGlobals: true,
	},
});
