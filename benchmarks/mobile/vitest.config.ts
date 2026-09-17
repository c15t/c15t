import { resolve } from 'node:path';

import { defineConfig } from 'vitest/config';

/**
 * `react-native` points at the bench stub for the same reason `tsconfig.json`
 * does: the harness measures the c15t boundary, not a React Native runtime. The
 * alias has to be here too, because Vitest resolves through Vite and ignores
 * TypeScript path mappings.
 */
export default defineConfig({
	resolve: {
		alias: {
			'react-native': resolve(
				import.meta.dirname,
				'src/support/react-native-stub.ts'
			),
		},
	},
	test: {
		environment: 'node',
		include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
	},
});
