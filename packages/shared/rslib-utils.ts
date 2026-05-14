import { RsdoctorRspackMultiplePlugin } from '@rsdoctor/rspack-plugin';

/**
 * Standard exclude patterns for rslib configuration files.
 * These patterns exclude test files and system files from the build.
 */
export const standardExcludePatterns = [
	'**/.DS_Store',
	'**/__tests__/**',
	'**/__snapshots__/**',
	'**/__screenshots__/**',
	'**/*.test.ts',
	'**/*.test.tsx',
	'**/*.spec.ts',
	'**/*.spec.tsx',
	'**/*.browser.test.ts',
	'**/*.e2e.test.ts',
	'**/*.e2e.test.tsx',
	'**/*.e2e.ts',
	'**/mockServiceWorker.js',
	'**/test-setup.*',
];

/**
 * Standard source entry globs for packages that build from `./src/**`.
 * Uses explicit negated globs to prevent test and fixture files from being
 * emitted when bundlers process wildcard entries.
 */
export const standardSourceEntries = [
	'./src/**',
	'!./src/**/__tests__/**',
	'!./src/**/__snapshots__/**',
	'!./src/**/__screenshots__/**',
	'!./src/**/*.test.ts',
	'!./src/**/*.test.tsx',
	'!./src/**/*.spec.ts',
	'!./src/**/*.spec.tsx',
	'!./src/**/*.browser.test.ts',
	'!./src/**/*.e2e.test.ts',
	'!./src/**/*.e2e.test.tsx',
	'!./src/**/*.e2e.ts',
	'!./src/**/mockServiceWorker.js',
	'!./src/**/test-setup.*',
];

/**
 * Returns RsdoctorRspackPlugin instances when Rsdoctor is enabled via env.
 *
 * Supports `RSDOCTOR=true` (Rsdoctor Rspack quick start) and `WITH_RSDOCTOR=true`
 * (legacy monorepo convention). See
 * https://rsdoctor.rs/guide/start/quick-start#rspack
 */
export function getRsdoctorPlugins() {
	if (process.env.RSDOCTOR || process.env.WITH_RSDOCTOR) {
		return [
			new RsdoctorRspackMultiplePlugin({
				disableClientServer: false,
				output: {
					mode: 'brief',
					options: {
						type: ['html'],
					},
				},
			}),
		];
	}
	return [];
}
