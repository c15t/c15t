import { availableParallelism } from 'node:os';

import { defineConfig } from 'vitest/config';

/**
 * Turbo sets `TURBO_HASH` for every task it runs, and runs up to 20 test
 * tasks at once (`concurrency` in turbo.json). Each Vitest would otherwise
 * start a worker per core plus Chromium for its browser project, so ten
 * packages in parallel oversubscribe the machine many times over. Tests that
 * wait for Vite to compile a lazily imported chunk (the 1 s `vi.waitFor`
 * default, the 5 s test timeout) then time out, while the same package passes
 * alone. A quarter of the cores per package keeps the parallel run about as
 * fast and stops those timeouts. Run on its own, Vitest keeps its default.
 */
const maxWorkers = process.env.TURBO_HASH
	? Math.max(2, Math.floor(availableParallelism() / 4))
	: undefined;

// Configure proper output structure for coverage files
export const baseConfig = defineConfig({
	test: {
		// oxlint-disable-next-line sort-keys -- Preserve declaration order, interface shape, and public compatibility.
		coverage: {
			// Output to ./coverage
			enabled: true,
			// Include covered and uncovered files matching this pattern
			// If not set, only files loaded during test run will be included
			include: [
				'**/*.{ts,tsx,js,jsx}',
				'!**/*.d.ts',
				'!**/node_modules/**',
				'!**/dist/**',
				'!**/dist-types/**',
				'!**/storybook-static/**',
				'!**/coverage/**',
				// Build and test tooling is never exercised by a test run. Listing
				// it as uncovered makes Vitest transform it through Vite at report
				// time; in browser mode that walk reaches rslib's rspack resolver,
				// triggers a dependency re-optimisation, and reloads the page
				// mid-run, which vitest-browser-react does not survive.
				'!**/*.config.{ts,js,mjs,cjs}',
				'!**/scripts/**',
			],

			provider: 'istanbul',
			reporter: [
				'text',
				[
					'json-summary',
					{
						// This is needed for the GitHub action
						file: 'coverage-summary.json',
					},
				],
				[
					'json',
					{
						// This contains line-by-line coverage info
						file: 'coverage-final.json',
					},
				],
				// Add HTML reporter for local viewing
				[
					'html',
					{
						subdir: 'html',
					},
				],
			],
			reportOnFailure: true,
			reportsDirectory: './coverage',
		},
		maxWorkers,
	},
});
