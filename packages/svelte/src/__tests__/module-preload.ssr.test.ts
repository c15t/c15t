import { offline } from '@c15t/core';
/**
 * The provider names the on-demand chunk its page starts with, and
 * `c15tHandle`'s page transform turns that into `<link rel="modulepreload">`.
 *
 * Runs in the `ssr` project, so the provider is server-compiled as it is
 * during a SvelteKit render or prerender.
 */
import { render } from 'svelte/server';
import { describe, expect, test } from 'vitest';

import ConsentProvider from '../lib/components/consent-provider.svelte';
import { injectModulePreloads } from '../lib/kit/module-preload';
import type { ConsentManagerOptions } from '../lib/types';

const HREFS = {
	'loader-and-blocker': '/_app/immutable/chunks/gates.js',
};

const LINK =
	'<link rel="modulepreload" href="/_app/immutable/chunks/gates.js" fetchpriority="low">';

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
	const { head } = render(ConsentProvider, {
		props: {
			options: {
				mode: offline(),
				persistence: false,
				...options,
			} as ConsentManagerOptions,
		},
	});
	// What `c15tHandle` does to the page once the plugin wrote the URLs.
	return injectModulePreloads(`<head>${head}</head>`, HREFS);
};

/** The links the handle added. */
const preloads = (head: string): string[] =>
	[...head.matchAll(/<link rel="modulepreload"[^>]*>/gu)].map(([tag]) => tag);

describe('module preloads for on-demand chunks', () => {
	test('a page with scripts preloads the loader-and-blocker chunk', () => {
		expect(preloads(renderPage({ scripts: [SCRIPT] }))).toEqual([LINK]);
	});

	test('a page with blocker rules preloads the same chunk', () => {
		expect(preloads(renderPage({ networkBlocker: BLOCKER }))).toEqual([LINK]);
	});

	test('a page with scripts and blocker rules preloads one chunk', () => {
		expect(
			preloads(renderPage({ networkBlocker: BLOCKER, scripts: [SCRIPT] }))
		).toEqual([LINK]);
	});

	test('a page without scripts or rules preloads nothing', () => {
		const head = renderPage({});
		expect(preloads(head)).toEqual([]);
		expect(head).not.toContain('c15t-modulepreload');
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
			'<link rel="modulepreload" href="/_app/immutable/chunks/gates.js" fetchpriority="low" nonce="r4nd0m">',
		]);
	});
});
