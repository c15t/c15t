import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

/**
 * Vitest config shared by every compatibility fixture app.
 *
 * @param appDir - Absolute path of the fixture app (its `next.config.ts` dir)
 */
export const createCompatVitestConfig = function createCompatVitestConfig(
	appDir: string
) {
	return defineConfig({
		root: appDir,
		test: {
			coverage: { enabled: false },
			environment: 'node',
			fileParallelism: false,
			globalSetup: [
				fileURLToPath(new URL('./global-setup.ts', import.meta.url)),
			],
			hookTimeout: 300_000,
			include: ['tests/**/*.test.ts'],
			passWithNoTests: false,
			testTimeout: 90_000,
		},
	});
};
