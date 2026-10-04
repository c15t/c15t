/**
 * The provider names the on-demand chunks its page starts with, and
 * `c15tHandle`'s page transform turns that into `<link rel="modulepreload">`.
 *
 * Runs in the `ssr` project, so the provider is server-compiled as it is
 * during a SvelteKit render or prerender.
 */
import { render } from 'svelte/server';
import { describe, expect, test } from 'vitest';

import ConsentManagerProvider from '../lib/components/manager-provider.svelte';
import { injectModulePreloads } from '../lib/kit/module-preload';
import { offline } from '../lib/transports/offline';
import type { ConsentManagerOptions } from '../lib/types';

const HREFS = {
	'network-blocker': '/_app/immutable/chunks/blocker.js',
	'script-loader': '/_app/immutable/chunks/loader.js',
};

const SCRIPT = {
	category: 'measurement',
	id: 'analytics',
	src: 'https://example.com/analytics.js',
} as const;

const BLOCKER = {
	rules: [{ category: 'measurement', domain: 'example.com', id: 'example' }],
} as const;

const renderPage = function renderPage(
	options: Partial<ConsentManagerOptions>
): string {
	const { head } = render(ConsentManagerProvider, {
		props: {
			options: {
				mode: offline(),
				persistence: false,
				...options,
			} as ConsentManagerOptions,
		},
	});
	// What `c15tHandle` does to the page once the plugin wrote the URLs.
	return injectModulePreloads(head, HREFS);
};

const preloads = (head: string): string[] =>
	[...head.matchAll(/<link rel="modulepreload"[^>]*>/gu)].map(([tag]) => tag);

describe('module preloads for on-demand chunks', () => {
	test('a page with scripts preloads the script loader', () => {
		expect(preloads(renderPage({ scripts: [SCRIPT] }))).toEqual([
			'<link rel="modulepreload" href="/_app/immutable/chunks/loader.js">',
		]);
	});

	test('a page with blocker rules preloads the network blocker', () => {
		expect(preloads(renderPage({ networkBlocker: BLOCKER }))).toEqual([
			'<link rel="modulepreload" href="/_app/immutable/chunks/blocker.js">',
		]);
	});

	test('a page without scripts or rules preloads nothing', () => {
		const head = renderPage({});
		expect(preloads(head)).toEqual([]);
		expect(head).not.toContain('c15t:modulepreload');
	});

	test('a page with consent management disabled preloads no blocker', () => {
		expect(
			preloads(
				renderPage({ enabled: false, networkBlocker: BLOCKER, scripts: [] })
			)
		).toEqual([]);
	});

	test('the links carry the provider nonce', () => {
		expect(
			preloads(renderPage({ nonce: 'r4nd0m', scripts: [SCRIPT] }))
		).toEqual([
			'<link rel="modulepreload" href="/_app/immutable/chunks/loader.js" nonce="r4nd0m">',
		]);
	});
});
