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
		include: ['**/__tests__/**/*.test.ts'],
		mockReset: true,
	},
});
