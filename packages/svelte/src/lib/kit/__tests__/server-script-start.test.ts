/**
 * `c15tHandle`'s page transform adds the start its request's render kept
 * to a `<script>` at the end of `<body>`.
 */
import { afterEach, beforeAll, expect, test } from 'vitest';

import { startOnServer } from '../../server-script-start';
import type { ServerStartOptions } from '../../server-script-start';
import {
	createServerStartInjector,
	registerPageStart,
} from '../server-script-start';
import { setRequestEvent } from './app-server';
import { createEvent } from './event';

/** Renders a provider for `event`, as SvelteKit does inside a request. */
const renderProvider = (
	event: ReturnType<typeof createEvent>,
	code: string,
	nonce?: string
): void => {
	setRequestEvent(event);
	startOnServer({ code, nonce } as unknown as ServerStartOptions);
	setRequestEvent(undefined);
};

/** A transform whose request's render started `code`, with `nonce`. */
const renderPage = (
	code: string,
	nonce?: string
): ((html: string, done: boolean) => string) => {
	const event = createEvent();
	const inject = createServerStartInjector(event.locals);
	renderProvider(event, code, nonce);
	return inject;
};

beforeAll(() => {
	// The start's code comes from the options, so each test picks it.
	registerPageStart((options) => (options as { code?: string }).code);
});

afterEach(() => {
	setRequestEvent(undefined);
});

test('adds the start before the last chunk closes the body', () => {
	const inject = renderPage('go()', 'own');

	expect(inject('<html><head></head><body><main>Loading', false)).toBe(
		'<html><head></head><body><main>Loading'
	);
	expect(inject('</main></body></html>', true)).toBe(
		'</main><script nonce="own">go()</script></body></html>'
	);
});

test('finds the end of the body however the chunks split it', () => {
	const page = '<html><body><script nonce="kit">boot()</script></body></html>';
	const whole = renderPage('go()')(page, true);

	expect(whole).toContain('<script nonce="kit">go()</script></body>');
	for (let at = 0; at <= page.length; at += 1) {
		const inject = renderPage('go()');

		expect(
			inject(page.slice(0, at), false) + inject(page.slice(at), true)
		).toBe(whole);
	}
});

test('ignores a body end in the text of an earlier chunk', () => {
	const inject = renderPage('go()');

	expect(
		inject('<body><script>"</body>"</script>', false) +
			inject('<main></main></body></html>', true)
	).toBe(
		'<body><script>"</body>"</script><main></main><script>go()</script></body></html>'
	);
});

test('keeps the body end when only comments follow it before the last chunk', () => {
	const inject = renderPage('go()');

	expect(
		inject('<body></body></html><!-- served -->', false) + inject('', true)
	).toBe('<body><script>go()</script></body></html><!-- served -->');
});

test('passes a long unfinished region through instead of holding it', () => {
	const inject = renderPage('go()');
	const script = `<body><script>if (a < b) {${'x'.repeat(5000)}`;

	expect(inject(script, false)).toBe(script);
	expect(inject(`${'y'.repeat(5000)}}</script></body>`, true)).toBe(
		`${'y'.repeat(5000)}}</script><script>go()</script></body>`
	);
});

test('drops a nonce that is not one', () => {
	expect(renderPage('go()', 'a" onload="x')('<body></body>', true)).toBe(
		'<body><script>go()</script></body>'
	);
});

test('starts nothing from markup in the page', () => {
	// What an earlier version read its code from, rendered here from content
	// a visitor wrote.
	const page =
		'<html><head><meta name="c15t-server-start" content="alert(1)" data-nonce="n"></head><body><script nonce="kit">boot()</script></body></html>';
	const event = createEvent();
	const inject = createServerStartInjector(event.locals);
	renderProvider(event, '');

	expect(inject(page, true)).toBe(page);
});

test("keeps each request's start to its own page", () => {
	const first = createEvent();
	const second = createEvent();
	const injectFirst = createServerStartInjector(first.locals);
	const injectSecond = createServerStartInjector(second.locals);
	renderProvider(second, 'second()');
	renderProvider(first, 'first()');
	// A second provider on the page starts nothing more.
	renderProvider(first, 'again()');

	expect(injectFirst('<body></body>', true)).toBe(
		'<body><script>first()</script></body>'
	);
	expect(injectSecond('<body></body>', true)).toBe(
		'<body><script>second()</script></body>'
	);
});

test('starts nothing for a render outside a request', () => {
	const event = createEvent();
	const inject = createServerStartInjector(event.locals);
	startOnServer({ code: 'go()' } as unknown as ServerStartOptions);

	expect(inject('<body></body>', true)).toBe('<body></body>');
});
