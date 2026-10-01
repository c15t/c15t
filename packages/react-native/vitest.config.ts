import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { baseConfig } from '@c15t/vitest-config/base';
import { defineConfig, mergeConfig } from 'vitest/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Coverage ratchet: floors below current coverage so regressions fail CI.
 * Raise as coverage improves; never lower. `scripts/check-coverage-ratchet.ts`
 * reads this same object, so the package keeps one list of numbers.
 */
export const coverageThresholds = {
	branches: 90,
	functions: 90,
	lines: 90,
	statements: 90,
};

const cliArgs = process.argv.slice(2);

/** `vitest run` is run mode; a bare `vitest` is watch mode. */
const isRunMode = cliArgs.includes('run') || cliArgs.includes('--run');

/**
 * Vitest treats every non-flag argument as a filename filter, so
 * `vitest run src/protocol` exercises four modules against a package-wide
 * ratchet and can never reach the floors. Thresholds on such a run report the
 * filter rather than the code, and bury the real result under a table of zeros.
 */
const isFilteredRun = cliArgs.some(
	(arg) => !arg.startsWith('-') && arg !== 'run'
);

/**
 * Set only by `test:coverage`, the coverage-gated run. It forces the ratchet on
 * whatever was selected and hands the verdict to
 * `scripts/check-coverage-ratchet.ts`, which names the files that broke the
 * floor instead of printing four aggregate percentages.
 */
const runsRatchet = process.env.C15T_COVERAGE_RATCHET === '1';

/** An explicit `--coverage` always instruments, even alongside a filter. */
const wantsCoverage = cliArgs.some(
	(arg) => arg === '--coverage' || arg.startsWith('--coverage.')
);

/**
 * Watch and filtered runs skip instrumentation: reporting every untouched file
 * as uncovered is most of their cost, and nothing reads it. A run that asks for
 * coverage by name is the exception, because that request is the point.
 */
const collectCoverage =
	runsRatchet || wantsCoverage || (isRunMode && !isFilteredRun);

const config = mergeConfig(
	baseConfig,
	defineConfig({
		resolve: {
			alias: [
				// A faithful stand-in for the two `react-native` surfaces the
				// bridge touches. The real entry point needs a React Native
				// runtime, so resolution — not module mocking — is what swaps
				// it out: the bridge code under test is the production code,
				// unchanged, and the fake behaves like the registered module.
				{
					find: /^react-native$/u,
					replacement: resolve(
						__dirname,
						'./src/__tests__/helpers/react-native-stub.ts'
					),
				},
				{ find: /^~$/u, replacement: resolve(__dirname, './src') },
			],
		},
		test: {
			coverage: {
				enabled: collectCoverage,
				// Coverage ratchet: floors below current coverage so regressions
				// fail CI. Raise as coverage improves; never lower.
				exclude: [
					// The TurboModule spec only resolves inside a React Native runtime
					// with the New Architecture enabled, so no Node test can load it.
					'src/specs/**',
					// Test doubles and the render harness are not shipped code.
					'src/__tests__/**',
					'src/**/__tests__/**',
					// The fixture generator is repo tooling: it is not published and not
					// reachable from a runtime import, so ratcheting its lines would gate a
					// build script on how many fixture rows a change happened to add.
					'scripts/**',
					// Gradle output from the Android module is not shipped JavaScript.
					// Counting it would report a test runner's own bundle as uncovered.
					'**/build/**',
				],
				// The checker gates under the ratchet, and a filter can never reach
				// package-wide floors, so neither gates: report the numbers only.
				thresholds:
					runsRatchet || isFilteredRun || !collectCoverage
						? {}
						: { ...coverageThresholds },
			},
			// Component and hook tests render through react-dom in a DOM. The
			// native bridge is a faithful stub, so nothing here needs a device.
			environment: 'jsdom',
			exclude: [
				'**/node_modules/**',
				'**/dist/**',
				'**/build/**',
				'**/.cache/**',
				'**/coverage/**',
			],
			include: [
				'src/**/*.test.tsx',
				'src/**/*.test.ts',
				'src/**/*.spec.tsx',
				'src/**/*.spec.ts',
				// The generator's own tests live beside the generator they exercise.
				'scripts/**/*.test.ts',
			],
		},
	})
);

/**
 * The `text` reporter prints one row per source file on every run. Under the
 * ratchet that table is the thing being replaced: `check-coverage-ratchet.ts`
 * prints only the files below the floor. It has to be removed after the merge
 * because `mergeConfig` concatenates arrays rather than replacing them.
 */
if (runsRatchet && config.test?.coverage?.reporter) {
	config.test.coverage.reporter = config.test.coverage.reporter.filter(
		(reporter) => (Array.isArray(reporter) ? reporter[0] : reporter) !== 'text'
	);
}

export default config;
