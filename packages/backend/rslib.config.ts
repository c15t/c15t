import { defineConfig } from '@rslib/core';
import { getRsdoctorPlugins } from '../shared/rslib-utils';

const externals = [
	// Frameworks
	'hono',
	'express',
	'next',

	// UI frameworks
	'react',
	'vue',
	'solid-js',
	'solid-js/store',
	'next/headers',
	'$app/environment',
	'@vue/runtime-dom',
	'@vue/runtime-core',
	'@vue/shared',
	'@vue/reactivity',
	'@vue/compiler-dom',
	'@vue/compiler-core',
	'csstype',

	// Testing libraries
	'vitest',
	'@vitest/runner',
	'@vitest/utils',
	'@vitest/expect',
	'@vitest/snapshot',
	'@vitest/spy',
	'chai',
	'tinyspy',

	// Utilities and others
	'pathe',
	'std-env',
	'magic-string',
	'pretty-format',
	'p-limit',
	'next/dist/compiled/@edge-runtime/cookies',
	'@babel/types',
	'@babel/parser',
	'punycode',
];

export default defineConfig({
	source: {
		entry: {
			core: ['./src/core.ts'],
			router: ['./src/router.ts'],
			contracts: ['./src/contracts/index.ts'],
			'db/schema': ['./src/db/schema/index.ts'],
			'db/adapters': ['./src/db/adapters/index.ts'],
			'db/adapters/kysely': ['./src/db/adapters/kysely.ts'],
			'db/adapters/drizzle': ['./src/db/adapters/drizzle.ts'],
			'db/adapters/prisma': ['./src/db/adapters/prisma.ts'],
			'db/adapters/typeorm': ['./src/db/adapters/typeorm.ts'],
			'db/adapters/mongo': ['./src/db/adapters/mongo.ts'],
			'db/migrator': ['./src/db/migrator/index.ts'],
			'define-config': ['./src/define-config.ts'],
			types: ['./src/types/index.ts'],
			cache: ['./src/cache/index.ts'],
		},
	},
	lib: [
		{
			dts: true,
			bundle: true,
			format: 'esm',
			output: {
				externals,
			},
		},
		{
			dts: true,
			bundle: true,
			format: 'cjs',
			output: {
				externals,
			},
		},
	],
	output: {
		target: 'node',
		cleanDistPath: true,
		externals,
	},
	tools: {
		rspack: {
			plugins: [...getRsdoctorPlugins()],
		},
	},
});
