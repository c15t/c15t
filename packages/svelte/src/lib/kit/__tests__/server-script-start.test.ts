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

	expect(inject(`<head>${marker('go()')}</head><body><main>`)).toBe(
		`<head>${marker('')}</head><body><main>`
	);
	expect(inject('</main></body></html>')).toBe(
		'</main><script>go()</script></body></html>'
	);
});

test("takes SvelteKit's script nonce without one on the marker", () => {
	const page = createServerStartInjector()(
		`<head>${marker('go()')}</head><body><script nonce="kit-nonce">boot()</script></body>`
	);

	expect(page).toContain('<script nonce="kit-nonce">go()</script></body>');
});

test("prefers the marker's nonce and drops one that is not a nonce", () => {
	expect(
		createServerStartInjector()(
			`<head>${marker('go()', 'own')}</head><body><script nonce="kit">boot()</script></body>`
		)
	).toContain('<script nonce="own">go()</script></body>');
	expect(
		createServerStartInjector()(
			`<head>${marker('go()', 'a&quot; onload=&quot;x')}</head><body></body>`
		)
	).toContain('<script>go()</script></body>');
});

test('adds nothing for an empty marker', () => {
	const page = `<head>${marker('')}</head><body></body>`;

	expect(createServerStartInjector()(page)).toBe(page);
});
