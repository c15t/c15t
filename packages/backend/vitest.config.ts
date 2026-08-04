import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseConfig } from '@c15t/vitest-config/base';
import { defineConfig, mergeConfig } from 'vitest/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default mergeConfig(
	baseConfig,
	defineConfig({
		resolve: {
			alias: {
				'~': path.resolve(__dirname, './src'),
			},
		},
		test: {
			environment: 'node',
			// PGlite and SQLite get a fresh in-process database per test, so files
			// cannot interfere and run in parallel. MySQL is a real server sharing
			// one schema, so two files migrating it at once produce failures that
			// depend on scheduling — the tests pass individually and fail
			// together. Opting into MySQL therefore opts into sequential files.
			fileParallelism: process.env.C15T_TEST_MYSQL_URL === undefined,
			// Almost every test here stands up a real database — PGlite is
			// Postgres compiled to WASM, and starting one is not free. Vitest's
			// 5s default is enough when this package runs alone and is not when
			// the whole monorepo's suites compete for the same cores, which is
			// exactly the situation in CI. A generous default beats sprinkling
			// timeouts on individual tests and finding the next one under load.
			testTimeout: 60_000,
			hookTimeout: 60_000,
			coverage: {
				// `__tests__/packaged.test.ts` imports the built artifact on
				// purpose, which would otherwise drag `dist/` into the coverage
				// report and halve every number for no reason — it is the same
				// code, compiled.
				exclude: ['dist/**', 'dist-types/**'],
			},
			// No coverage thresholds yet: the package has no behaviour to cover.
			// RFC 0004 §6 sets the floor at the old package's 55% once the first
			// handlers land, and it ratchets up from there — it never ships below
			// parity with @c15t/backend.
		},
	})
);
