import { describe, expect, test } from 'vitest';

import { injectModulePreloads } from '../module-preload';

const HREFS = {
	'network-blocker': '/_app/immutable/chunks/blocker.js',
	'script-loader': '/_app/immutable/chunks/loader.js',
};

const LOADER_LINK =
	'<link rel="modulepreload" href="/_app/immutable/chunks/loader.js">';
const BLOCKER_LINK =
	'<link rel="modulepreload" href="/_app/immutable/chunks/blocker.js">';

const marker = (content: string): string =>
	`<meta name="c15t-modulepreload" content="${content}">`;

describe('injectModulePreloads', () => {
	test('links each named chunk at the end of the head', () => {
		const head = `<head><!--[-->${marker('script-loader network-blocker')}<!--]--><title>x</title>`;
		expect(injectModulePreloads(`${head}</head><body></body>`, HREFS)).toBe(
			`${head}${LOADER_LINK}${BLOCKER_LINK}</head><body></body>`
		);
	});

	test('leaves a page without the marker untouched', () => {
		const html = '<head><title>x</title></head>';
		expect(injectModulePreloads(html, HREFS)).toBe(html);
	});

	test('adds nothing when the build wrote no URL', () => {
		const html = `<head>${marker('script-loader')}</head>`;
		// The placeholders, as in `vite dev` or without `c15tPreload()`.
		expect(injectModulePreloads(html)).toBe(html);
		// An entry chunk already carries the module.
		expect(injectModulePreloads(html, { ...HREFS, 'script-loader': '' })).toBe(
			html
		);
	});

	test('links each chunk once when two providers name it', () => {
		const html = injectModulePreloads(
			`<head>${marker('script-loader')}${marker('script-loader')}</head>`,
			HREFS
		);
		expect(html.match(/rel="modulepreload"/gu)).toHaveLength(1);
	});

	test("takes SvelteKit's script nonce when the provider has none", () => {
		expect(
			injectModulePreloads(
				`<head>${marker('script-loader')}</head><body><script nonce="kitN0nce">start()</script></body>`,
				HREFS
			)
		).toContain(
			'<link rel="modulepreload" href="/_app/immutable/chunks/loader.js" nonce="kitN0nce">'
		);
	});

	test('prefers the provider nonce and refuses one that is not a nonce', () => {
		expect(
			injectModulePreloads(
				`<head>${marker('script-loader nonce=own')}</head><script nonce="kit">`,
				HREFS
			)
		).toContain('nonce="own">');
		// What Svelte renders for a nonce with quotes in it.
		expect(
			injectModulePreloads(
				`<head>${marker('script-loader nonce=&quot;x&quot;onload=&quot;y')}</head>`,
				HREFS
			)
		).toContain(`${LOADER_LINK}</head>`);
	});

	test('ignores names that are not chunks', () => {
		const html = `<head>${marker('constructor toString')}</head>`;
		expect(injectModulePreloads(html, HREFS)).toBe(html);
	});
});
