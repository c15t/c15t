import { configDefaults, defineConfig } from 'vitest/config';

import base from './vitest.config';

export default defineConfig({
	...base,
	test: {
		...base.test,
		exclude: configDefaults.exclude,
		include: ['src/starters.test.ts'],
	},
});
