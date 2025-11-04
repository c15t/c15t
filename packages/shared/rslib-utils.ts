import { RsdoctorRspackPlugin } from '@rsdoctor/rspack-plugin';

/**
 * Standard exclude patterns for rslib configuration files.
 * These patterns exclude test files and system files from the build.
 */
export const standardExcludePatterns = [
	'**/.DS_Store',
	'**/__tests__/**',
	'**/*.test.ts',
	'**/*.test.tsx',
	'**/*.spec.ts',
	'**/*.spec.tsx',
	'**/*.browser.test.ts',
	'**/*.e2e.test.tsx',
];

/**
 * Returns an array of RsdoctorRspackPlugin instances if RSDOCTOR environment variable is set,
 * otherwise returns an empty array.
 * This utility centralizes the Rsdoctor plugin configuration across all rslib configs.
 */
export function getRsdoctorPlugins() {
	if (process.env.RSDOCTOR) {
		return [
			new RsdoctorRspackPlugin({
				disableClientServer: true,
				output: {
					mode: 'brief',
					options: {
						type: ['json'],
					},
				},
			}),
		];
	}
	return [];
}
