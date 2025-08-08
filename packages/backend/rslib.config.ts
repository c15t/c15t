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
