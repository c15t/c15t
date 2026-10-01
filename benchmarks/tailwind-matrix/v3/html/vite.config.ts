import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

/**
 * Stands in for the CDN: emits `@c15t/browser`'s script-tag build as
 * `/c15t.js`. Vite only builds the page's Tailwind stylesheet here.
 */
const c15tScript = (): Plugin => ({
	generateBundle() {
		this.emitFile({
			fileName: 'c15t.js',
			source: readFileSync(
				fileURLToPath(import.meta.resolve('@c15t/browser/c15t.js')),
				'utf8'
			),
			type: 'asset',
		});
	},
	name: 'c15t-script-tag',
});

export default defineConfig({
	build: {
		rollupOptions: {
			input: {
				index: fileURLToPath(new URL('index.html', import.meta.url)),
				'light-dom': fileURLToPath(new URL('light-dom.html', import.meta.url)),
			},
		},
	},
	plugins: [c15tScript()],
});
