/**
 * `c15tHandle`'s page transform moves the provider's server start from its
 * `<head>` marker to a `<script>` at the end of `<body>`.
 */
import { expect, test } from 'vitest';

import { createServerStartInjector } from '../server-script-start';

const marker = (content: string, nonce?: string): string =>
	`<meta name="c15t-server-start" content="${content}"${
		nonce === undefined ? '' : ` data-nonce="${nonce}"`
	}>`;

test('keeps the script for the chunk that closes the body', () => {
	const inject = createServerStartInjector();

	expect(inject(`<head>${marker('go()')}</head><body><main>`, false)).toBe(
		`<head>${marker('')}</head><body>`
	);
	expect(inject('</main></body></html>', true)).toBe(
		'<main></main><script>go()</script></body></html>'
	);
});

test.each([
	['the marker', marker('a=>b&quot;', 'own'), 'own'],
	["SvelteKit's script", marker('a=>b&quot;'), 'kit'],
])(
	'reads a marker split across chunks, with the nonce of %s',
	(_source, meta, nonce) => {
		const page = `<html><head>${meta}</head><body><script nonce="kit">boot()</script></body></html>`;
		const whole = createServerStartInjector()(page, true);

		expect(whole).toContain(`<script nonce="${nonce}">a=>b"</script></body>`);
		for (let at = 0; at <= page.length; at += 1) {
			const inject = createServerStartInjector();

			expect(
				inject(page.slice(0, at), false) + inject(page.slice(at), true)
			).toBe(whole);
		}
		const inject = createServerStartInjector();

		expect(
			[...page].map((character) => inject(character, false)).join('') +
				inject('', true)
		).toBe(whole);
	}
);

test("takes SvelteKit's script nonce without one on the marker", () => {
	const page = createServerStartInjector()(
		`<head>${marker('go()')}</head><body><script nonce="kit-nonce">boot()</script></body>`,
		true
	);

	expect(page).toContain('<script nonce="kit-nonce">go()</script></body>');
});

test("prefers the marker's nonce and drops one that is not a nonce", () => {
	expect(
		createServerStartInjector()(
			`<head>${marker('go()', 'own')}</head><body><script nonce="kit">boot()</script></body>`,
			true
		)
	).toContain('<script nonce="own">go()</script></body>');
	expect(
		createServerStartInjector()(
			`<head>${marker('go()', 'a&quot; onload=&quot;x')}</head><body></body>`,
			true
		)
	).toContain('<script>go()</script></body>');
});

test('adds nothing for an empty marker', () => {
	const page = `<head>${marker('')}</head><body></body>`;

	expect(createServerStartInjector()(page, true)).toBe(page);
});
