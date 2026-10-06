/**
 * The Nuxt module stops Nuxt prefetching c15t chunks a page loads only
 * after its first banner, or only when it configures them. Every finished
 * prefetch queues main-thread work, and on a page whose `/init` answer
 * arrives while they land, the banner waits behind them.
 */
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import { stopPrefetchingConsentChunks } from '../prefetch';
import type { ClientManifestChunk } from '../prefetch';

const c15t = (path: string) => `../node_modules/@c15t/${path}`;

const createManifest = (): Record<string, ClientManifestChunk> => ({
	'_dialog-shared.js': { css: ['dialog.css'], prefetch: true },
	'_shared-kernel.js': { prefetch: true },
	'_vue.js': { prefetch: true },
	'dialog.css': { prefetch: true },
	'node_modules/nuxt/dist/app/components/error-404.vue': {
		imports: ['_vue.js'],
		isDynamicEntry: true,
		prefetch: true,
		src: 'node_modules/nuxt/dist/app/components/error-404.vue',
	},
	'node_modules/nuxt/dist/app/entry.js': {
		dynamicImports: [
			c15t('core/dist/modules/script-loader/loader.js'),
			c15t('core/dist/runtime/provider-update.js'),
			c15t('vue/dist/runtime/components/manager.vue'),
			c15t('vue/dist/runtime/components/iab-prompt.vue'),
			c15t('iab/dist/index.js'),
			c15t('vue/dist/runtime/client-manifest.js'),
			'node_modules/nuxt/dist/app/components/error-404.vue',
		],
		imports: ['_vue.js', '_shared-kernel.js'],
		isEntry: true,
		prefetch: true,
		src: 'node_modules/nuxt/dist/app/entry.js',
	},
	[c15t('core/dist/modules/script-loader/loader.js')]: {
		isDynamicEntry: true,
		prefetch: true,
		src: c15t('core/dist/modules/script-loader/loader.js'),
	},
	[c15t('core/dist/runtime/provider-update.js')]: {
		isDynamicEntry: true,
		prefetch: true,
		src: c15t('core/dist/runtime/provider-update.js'),
	},
	[c15t('vue/dist/runtime/components/manager.vue')]: {
		imports: ['_dialog-shared.js', '_vue.js', '_shared-kernel.js'],
		isDynamicEntry: true,
		prefetch: true,
		src: c15t('vue/dist/runtime/components/manager.vue'),
	},
	[c15t('vue/dist/runtime/components/iab-prompt.vue')]: {
		isDynamicEntry: true,
		prefetch: true,
		src: c15t('vue/dist/runtime/components/iab-prompt.vue'),
	},
	[c15t('iab/dist/index.js')]: {
		isDynamicEntry: true,
		prefetch: true,
		src: c15t('iab/dist/index.js'),
	},
	[c15t('vue/dist/runtime/client-manifest.js')]: {
		isDynamicEntry: true,
		prefetch: true,
		src: c15t('vue/dist/runtime/client-manifest.js'),
	},
});

const isConsentFile = (file: string) => file.includes('/@c15t/');

const prefetched = (manifest: Record<string, ClientManifestChunk>) =>
	Object.entries(manifest)
		.filter(([, chunk]) => chunk.prefetch)
		.map(([key]) => key.replace('../node_modules/@c15t/', '@c15t/'))
		.sort();

describe('stopPrefetchingConsentChunks', () => {
	test('keeps hints for chunks a first banner can need and for everything else in the app', () => {
		const manifest = createManifest();
		stopPrefetchingConsentChunks(manifest, '/app', isConsentFile);

		expect(prefetched(manifest)).toEqual([
			'@c15t/iab/dist/index.js',
			'@c15t/vue/dist/runtime/client-manifest.js',
			'@c15t/vue/dist/runtime/components/iab-prompt.vue',
			'_shared-kernel.js',
			'_vue.js',
			'node_modules/nuxt/dist/app/components/error-404.vue',
			'node_modules/nuxt/dist/app/entry.js',
		]);
	});

	test('drops the hints for on-demand modules, live updates and the dialog with its own chunks and styles', () => {
		const manifest = createManifest();
		stopPrefetchingConsentChunks(manifest, '/app', isConsentFile);

		for (const key of [
			c15t('core/dist/modules/script-loader/loader.js'),
			c15t('core/dist/runtime/provider-update.js'),
			c15t('vue/dist/runtime/components/manager.vue'),
			'_dialog-shared.js',
			'dialog.css',
		]) {
			expect(manifest[key]?.prefetch, key).toBe(false);
		}
	});

	test('a chunk the app also reaches keeps its hint', () => {
		const manifest = createManifest();
		const entry = manifest['node_modules/nuxt/dist/app/entry.js'];
		entry?.imports?.push('_dialog-shared.js');
		stopPrefetchingConsentChunks(manifest, '/app', isConsentFile);

		expect(manifest['_dialog-shared.js']?.prefetch).toBe(true);
		expect(manifest['dialog.css']?.prefetch).toBe(true);
	});

	test('reads package names from disk by default', () => {
		const manifest: Record<string, ClientManifestChunk> = {
			'src/runtime/components/manager.vue': {
				isDynamicEntry: true,
				prefetch: true,
				src: 'runtime/components/manager.vue',
			},
		};
		// This package (`@c15t/vue`) owns the source; Vite roots it at `src`.
		stopPrefetchingConsentChunks(manifest, join(__dirname, '..'));

		expect(manifest['src/runtime/components/manager.vue']?.prefetch).toBe(
			false
		);
	});
});
