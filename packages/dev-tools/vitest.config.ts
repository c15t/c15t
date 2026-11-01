import { resolve } from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: {
		alias: {
			'~': resolve(__dirname, './src'),
		},
	},
	test: {
		// Vitest blanks CSS modules by default, `?raw` imports included; the
		// panel carries its stylesheet as a string, so keep this one real.
		css: { include: [/dev-tools\.css/u] },
		environment: 'jsdom',
		// Node 25+ defines a global `localStorage` that is undefined without
		// `--localstorage-file`, hiding jsdom's storage.
		execArgv: ['--no-experimental-webstorage'],
		include: ['**/__tests__/**/*.test.ts'],
		mockReset: true,
	},
});
