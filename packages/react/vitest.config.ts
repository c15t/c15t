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
				// Resolve core package to source so Vite can handle its dynamic
				// imports natively. rslib emits webpack-style chunks that Vite's
				// browser bundler cannot analyse.
				c15t: resolve(__dirname, '../core/src/index.ts'),
				// Core source lazy-imports @iabtechlabtcf/core which is only
				// installed in the core package's node_modules.
				'@iabtechlabtcf/core': resolve(
					__dirname,
					'../core/node_modules/@iabtechlabtcf/core'
				),
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
			setupFiles: ['./src/test-setup.browser.ts'],
			retry: 2,
		},
	})
);
