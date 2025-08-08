import { defineConfig } from '@rslib/core';

const externals = [
	// Database packages
	'prisma',
	'@prisma/client',
	'better-sqlite3',
	'mongodb',
	'drizzle-orm',
	'bson',
	'mongodb-connection-string-url',
	'@mongodb-js/saslprep',
	'kerberos',
	'@mongodb-js/zstd',
	'@aws-sdk/credential-providers',
	'mongodb-client-encryption',

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
			'v2/core': ['./src/v2/core.ts'],
			'v2/router': ['./src/v2/router.ts'],
			'v2/contracts': ['./src/v2/contracts/index.ts'],
			'v2/schema': ['./src/v2/schema/index.ts'],
			'v2/pkgs/db-adapters': ['./src/v2/pkgs/db-adapters/index.ts'],
			'v2/pkgs/results': ['./src/v2/pkgs/results/index.ts'],
			core: ['./src/core.ts'],
			router: ['./src/router.ts'],
			contracts: ['./src/contracts/index.ts'],
			'schema/index': ['./src/schema/index.ts'],
			'pkgs/data-model/fields/index': ['./src/pkgs/data-model/fields/index.ts'],
			'pkgs/data-model/index': ['./src/pkgs/data-model/index.ts'],
			'pkgs/data-model/schema/index': ['./src/pkgs/data-model/schema/index.ts'],
			'pkgs/db-adapters/adapters/drizzle-adapter/index': [
				'./src/pkgs/db-adapters/adapters/drizzle-adapter/index.ts',
			],
			'pkgs/db-adapters/adapters/kysely-adapter/index': [
				'./src/pkgs/db-adapters/adapters/kysely-adapter/index.ts',
			],
			'pkgs/db-adapters/adapters/memory-adapter/index': [
				'./src/pkgs/db-adapters/adapters/memory-adapter/index.ts',
			],
			'pkgs/db-adapters/adapters/prisma-adapter/index': [
				'./src/pkgs/db-adapters/adapters/prisma-adapter/index.ts',
			],
			'pkgs/db-adapters/index': ['./src/pkgs/db-adapters/index.ts'],
			'pkgs/results/index': ['./src/pkgs/results/index.ts'],
			'pkgs/migrations/index': ['./src/pkgs/migrations/index.ts'],
			'pkgs/types/index': ['./src/pkgs/types/index.ts'],
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
});
