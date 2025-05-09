import { resolve } from 'node:path';
import { baseConfig } from '@c15t/vitest-config/base';
import react from '@vitejs/plugin-react';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
	baseConfig,
	defineConfig({
		plugins: [react()],
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
			],
			browser: {
				enabled: true,
				provider: 'playwright',
				instances: [{ browser: 'chromium' }],
			},
		},
	})
);
