import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { baseConfig } from '@c15t/vitest-config/base';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig, mergeConfig } from 'vitest/config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default mergeConfig(
	baseConfig,
	defineConfig({
		plugins: [
			{
				configureServer(server) {
					server.middlewares.use((request, response, next) => {
						if (request.url !== '/__c15t-test__/gated-script-csp') {
							next();
							return;
						}
						response.setHeader('Content-Type', 'text/html');
						response.setHeader(
							'Content-Security-Policy',
							"script-src 'nonce-c15t-test-nonce'"
						);
						response.end(
							readFileSync(
								resolve(
									__dirname,
									'src/__tests__/fixtures/gated-scripts-csp.html'
								)
							)
						);
					});
				},
				name: 'gated-script-csp-fixture',
			},
		],
		resolve: {
			alias: [{ find: '~', replacement: resolve(__dirname, './src') }],
		},
		test: {
			coverage: {
				// Coverage ratchet: floors below current coverage so regressions
				// fail CI. Raise as coverage improves; never lower.
				thresholds: {
					branches: 60,
					functions: 70,
					lines: 70,
					statements: 70,
				},
			},
			projects: [
				{
					extends: true,
					test: {
						environment: 'jsdom',
						exclude: ['src/**/*.browser.test.ts'],
						include: ['src/**/__tests__/**/*.test.ts'],
						name: 'unit',
					},
				},
				{
					extends: true,
					resolve: {
						alias: [
							{
								find: '@c15t/core/runtime',
								replacement: resolve(__dirname, '../core/src/runtime/index.ts'),
							},
							{
								find: /^@c15t\/core$/u,
								replacement: resolve(__dirname, '../core/src/index.ts'),
							},
							{
								find: '@c15t/iab/headless',
								replacement: resolve(__dirname, '../iab/src/headless.ts'),
							},
							{
								find: /^@c15t\/iab$/u,
								replacement: resolve(__dirname, '../iab/src/index.ts'),
							},
						],
					},
					server: { watch: null },
					test: {
						browser: {
							enabled: true,
							headless: true,
							instances: [{ browser: 'chromium' }],
							provider: playwright(),
						},
						include: ['src/**/*.browser.test.ts'],
						name: 'browser',
					},
				},
			],
		},
	})
);
