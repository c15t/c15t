import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { baseConfig } from '@c15t/vitest-config/base';
import { defineConfig, mergeConfig } from 'vitest/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default mergeConfig(
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
					find: /^react-native$/,
					replacement: resolve(
						__dirname,
						'./src/__tests__/helpers/react-native-stub.ts'
					),
				},
				{ find: /^~$/, replacement: resolve(__dirname, './src') },
			],
		},
		test: {
			coverage: {
				// Coverage ratchet: floors below current coverage so regressions
				// fail CI. Raise as coverage improves; never lower.
				exclude: [
					// The TurboModule spec only resolves inside a React Native runtime
					// with the New Architecture enabled, so no Node test can load it.
					'src/specs/**',
					// Test doubles and the render harness are not shipped code.
					'src/__tests__/**',
					'src/**/__tests__/**',
					// Gradle output from the Android module is not shipped JavaScript.
					// Counting it would report a test runner's own bundle as uncovered.
					'**/build/**',
				],
				thresholds: {
					branches: 90,
					functions: 90,
					lines: 90,
					statements: 90,
				},
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
			],
		},
	})
);
