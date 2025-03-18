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
			index: ['./src/index.ts'],
			'schema/index': ['./src/schema/index.ts'],
			'client/index': ['./src/client/index.ts'],
			'integrations/index': ['./src/integrations/index.ts'],
			'integrations/next': ['./src/integrations/next.ts'],
			'integrations/react': ['./src/integrations/react.ts'],
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
			'pkgs/logger/index': ['./src/pkgs/logger/index.ts'],
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
