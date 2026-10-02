import { resolve } from 'node:path';

export default {
	resolve: {
		alias: {
			'@c15t/core': resolve(
				import.meta.dirname,
				'../../packages/core/dist/index.js'
			),
			'@c15t/schema/types': resolve(
				import.meta.dirname,
				'../../packages/schema/dist/types.js'
			),
		},
	},
	test: {
		environment: 'node',
		include: ['examples/uk-exemptions/__tests__/*.test.ts'],
	},
};
