import { describe, expect, test } from 'vitest';

import { injectModulePreloads } from '../module-preload';

const HREFS = {
	'network-blocker': '/_app/immutable/chunks/blocker.js',
	'script-loader': '/_app/immutable/chunks/loader.js',
};

describe('injectModulePreloads', () => {
	test('replaces the marker with a link per named chunk', () => {
		expect(
			injectModulePreloads(
				'<head><!--c15t:modulepreload script-loader network-blocker--></head>',
				HREFS
			)
		).toBe(
			'<head><link rel="modulepreload" href="/_app/immutable/chunks/loader.js"><link rel="modulepreload" href="/_app/immutable/chunks/blocker.js"></head>'
		);
	});

	test('leaves a page without the marker untouched', () => {
		const html = '<head><title>x</title></head>';
		expect(injectModulePreloads(html, HREFS)).toBe(html);
	});

	test('drops the marker when the build wrote no URL', () => {
		// The placeholders, as in `vite dev` or without `c15tPreload()`.
		expect(
			injectModulePreloads(
				'<head><!--c15t:modulepreload script-loader--></head>'
			)
		).toBe('<head></head>');
		// An entry chunk already carries the module.
		expect(
			injectModulePreloads(
				'<head><!--c15t:modulepreload script-loader--></head>',
				{ ...HREFS, 'script-loader': '' }
			)
		).toBe('<head></head>');
	});

	test('links each chunk once when two providers name it', () => {
		const html = injectModulePreloads(
			'<!--c15t:modulepreload script-loader--><!--c15t:modulepreload script-loader-->',
			HREFS
		);
		expect(html.match(/modulepreload/gu)).toHaveLength(1);
	});

	test("takes SvelteKit's script nonce when the provider has none", () => {
		expect(
			injectModulePreloads(
				'<head><!--c15t:modulepreload script-loader--></head><body><script nonce="kitN0nce">start()</script></body>',
				HREFS
			)
		).toContain(
			'<link rel="modulepreload" href="/_app/immutable/chunks/loader.js" nonce="kitN0nce">'
		);
	});

	test('prefers the provider nonce and refuses one that is not a nonce', () => {
		expect(
			injectModulePreloads(
				'<!--c15t:modulepreload script-loader nonce=own--><script nonce="kit">',
				HREFS
			)
		).toContain('nonce="own">');
		expect(
			injectModulePreloads(
				'<!--c15t:modulepreload script-loader nonce="x"onload="y-->',
				HREFS
			)
		).toBe(
			'<link rel="modulepreload" href="/_app/immutable/chunks/loader.js">'
		);
	});

	test('ignores names that are not chunks', () => {
		expect(
			injectModulePreloads(
				'<!--c15t:modulepreload constructor toString-->',
				HREFS
			)
		).toBe('');
	});
});
