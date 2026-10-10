import { describe, expect, test } from 'vitest';

import { injectModulePreloads } from '../module-preload';

const HREFS = {
	'loader-and-blocker': '/_app/immutable/chunks/gates.js',
};

const LINK =
	'<link rel="modulepreload" href="/_app/immutable/chunks/gates.js" fetchpriority="low">';

const marker = (content: string): string =>
	`<meta name="c15t-modulepreload" content="${content}">`;

describe('injectModulePreloads', () => {
	test('links the named chunk at the end of the head', () => {
		const head = `<head><!--[-->${marker('loader-and-blocker')}<!--]--><title>x</title>`;
		expect(injectModulePreloads(`${head}</head><body></body>`, HREFS)).toBe(
			`${head}${LINK}</head><body></body>`
		);
	});

	test('asks for the chunk at low priority', () => {
		// At the default priority the links went ahead of app chunks the
		// browser requests later and delayed hydration on HTTP/1.1.
		const html = injectModulePreloads(
			`<head>${marker('loader-and-blocker')}</head>`,
			HREFS
		);
		const links = html.match(/<link [^>]*>/gu) ?? [];
		expect(links).toEqual([LINK]);
		expect(LINK).toContain(' fetchpriority="low"');
	});

	test('leaves a page without the marker untouched', () => {
		const html = '<head><title>x</title></head>';
		expect(injectModulePreloads(html, HREFS)).toBe(html);
	});

	test('adds nothing when the build wrote no URL', () => {
		const html = `<head>${marker('loader-and-blocker')}</head>`;
		// The placeholders, as in `vite dev` or without `consentManifest()`.
		expect(injectModulePreloads(html)).toBe(html);
		// An entry chunk already carries the module.
		expect(
			injectModulePreloads(html, { ...HREFS, 'loader-and-blocker': '' })
		).toBe(html);
	});

	test('links each chunk once when two providers name it', () => {
		const html = injectModulePreloads(
			`<head>${marker('loader-and-blocker')}${marker('loader-and-blocker')}</head>`,
			HREFS
		);
		expect(html.match(/rel="modulepreload"/gu)).toHaveLength(1);
	});

	test("takes SvelteKit's script nonce when the provider has none", () => {
		expect(
			injectModulePreloads(
				`<head>${marker('loader-and-blocker')}</head><body><script nonce="kitN0nce">start()</script></body>`,
				HREFS
			)
		).toContain(
			'<link rel="modulepreload" href="/_app/immutable/chunks/gates.js" fetchpriority="low" nonce="kitN0nce">'
		);
	});

	test('prefers the provider nonce and refuses one that is not a nonce', () => {
		expect(
			injectModulePreloads(
				`<head>${marker('loader-and-blocker nonce=own')}</head><script nonce="kit">`,
				HREFS
			)
		).toContain('nonce="own">');
		// What Svelte renders for a nonce with quotes in it.
		expect(
			injectModulePreloads(
				`<head>${marker('loader-and-blocker nonce=&quot;x&quot;onload=&quot;y')}</head>`,
				HREFS
			)
		).toContain(`${LINK}</head>`);
	});

	test('ignores names that are not chunks', () => {
		const html = `<head>${marker('constructor toString')}</head>`;
		expect(injectModulePreloads(html, HREFS)).toBe(html);
	});
});
