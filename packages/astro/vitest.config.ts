import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { baseConfig } from '@c15t/vitest-config/base';
import { getViteConfig } from 'astro/config';
import { mergeConfig } from 'vitest/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const VIRTUAL_ID = 'virtual:c15t/options';
const RESOLVED_VIRTUAL_ID = `\0${VIRTUAL_ID}`;

/**
 * Stands in for the virtual module the integration generates at build time,
 * so `src/middleware.ts` and the injected routes import cleanly under test.
 */
const virtualOptionsPlugin = {
	load(id: string) {
		if (id !== RESOLVED_VIRTUAL_ID) {
			return;
		}
		return `export default ${JSON.stringify({
			endpoints: {
				enabled: false,
				initPath: '/api/c15t/init',
				manifestPath: '/api/c15t/manifest',
			},
			mode: { type: 'offline' },
			ui: 'svelte',
		})};`;
	},
	name: 'c15t:test-options',
	resolveId(id: string) {
		return id === VIRTUAL_ID ? RESOLVED_VIRTUAL_ID : undefined;
	},
};

export default getViteConfig(
	mergeConfig(baseConfig, {
		plugins: [virtualOptionsPlugin],
		resolve: {
			alias: {
				'@c15t/astro/server': resolve(__dirname, './src/server.ts'),
				'~': resolve(__dirname, './src'),
			},
		},
		test: {
			coverage: {
				// Coverage ratchet: floors below current coverage so regressions
				// fail CI. Raise as coverage improves; never lower.
				thresholds: {
					branches: 60,
					functions: 70,
					lines: 75,
					statements: 75,
				},
			},
			exclude: [
				'**/node_modules/**',
				'**/dist/**',
				'**/build/**',
				'**/.cache/**',
				'**/coverage/**',
			],
			// Two environments in one package: `astro/container` pulls in
			// esbuild, which refuses to run under jsdom's TextEncoder, while
			// the client boot needs a DOM. Server-side suites run in node and
			// anything named `*.dom.test.ts` runs in jsdom.
			projects: [
				{
					extends: true,
					test: {
						environment: 'node',
						include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
						exclude: ['src/**/*.dom.test.ts'],
						name: 'server',
					},
				},
				{
					extends: true,
					test: {
						environment: 'jsdom',
						// jsdom only exposes `localStorage` on a real origin;
						// the default `about:blank` is opaque and drops it,
						// which would silently skip persistence under test.
						environmentOptions: {
							jsdom: { url: 'https://example.com/' },
						},
						include: ['src/**/*.dom.test.ts'],
						name: 'browser',
						setupFiles: ['./src/__tests__/setup-dom.ts'],
					},
				},
			],
		},
	})
);
