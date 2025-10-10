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
			alias: {
				'~': resolve(__dirname, './src'),
			},
		},
		test: {
			include: [
				'src/**/*.test.tsx',
				'src/**/*.test.ts',
				'src/**/*.spec.tsx',
				'src/**/*.spec.ts',
				'src/**/*.e2e.test.tsx',
				'src/**/*.e2e.test.ts',
			],
			exclude: [
				'**/node_modules/**',
				'**/dist/**',
				'**/build/**',
				'**/.cache/**',
				'**/coverage/**',
			],
		},
	})
);
