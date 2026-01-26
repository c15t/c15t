import { resolve } from 'node:path';
import { baseConfig } from '@c15t/vitest-config/base';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
	baseConfig,
	defineConfig({
		plugins: [react()],
		resolve: {
			alias: {
				'~': resolve(__dirname, './src'),
				react: resolve(__dirname, './node_modules/react'),
				'react-dom': resolve(__dirname, './node_modules/react-dom'),
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
				provider: playwright(),
				instances: [{ browser: 'chromium' }],
			},
		},
	})
);
