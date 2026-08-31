import { defineConfig } from 'vitest/config';

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
	},
});
