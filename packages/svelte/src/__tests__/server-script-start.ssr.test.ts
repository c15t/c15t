/**
 * When the visitor's consent already lets a script run, the server render
 * starts it from the end of `<body>`, before hydration.
 * Nothing starts while the policy asks the visitor to choose, or from a
 * shared render, which carries no request clock.
 *
 * Runs in the `ssr` project, so the provider is server-compiled as it is
 * during a SvelteKit render.
 */
import { offline } from '@c15t/core';
import type { Script } from '@c15t/core';
import type { PolicyRule } from '@c15t/schema/types';
import { resolvePolicyRules } from '@c15t/schema/types';
import { render } from 'svelte/server';
import { afterEach, beforeAll, expect, test } from 'vitest';

import ConsentProvider from '../lib/components/consent-provider.svelte';
import { setRequestEvent } from '../lib/kit/__tests__/app-server';
import { createEvent } from '../lib/kit/__tests__/event';
import {
	createServerStartInjector,
	loadServerScriptStart,
} from '../lib/kit/server-script-start';
import type { ConsentManagerOptions } from '../lib/types';

const pixel: Script = {
	category: 'marketing',
	id: 'pixel',
	serverStart: () => ({ code: 'window.__pixel="a&b<c"' }),
	src: 'https://cdn.example.com/pixel.js',
};

/** A US-style policy: marketing runs until the visitor opts out. */
const optOut: PolicyRule = {
	id: 'policy_us',
	match: { isDefault: true },
	model: 'opt-out',
	prompt: 'none',
};

/** The page `c15tHandle` sends: the render, after its page transform. */
const renderPage = function renderPage({
	rule = optOut,
	shared = false,
	...options
}: Partial<ConsentManagerOptions> & {
	rule?: PolicyRule;
	shared?: boolean;
}): string {
	// `c15tHandle` makes the transform before SvelteKit renders the page.
	const event = createEvent();
	const inject = createServerStartInjector(event.locals);
	setRequestEvent(event);
	const { body, head } = render(ConsentProvider, {
		props: {
			options: {
				mode: offline(),
				persistence: false,
				prefetch: {
					initialPolicyResolution: resolvePolicyRules({
						countryCode: 'US',
						regionCode: null,
						rules: [rule],
					}),
					// A shared render's state carries no request clock.
					now: shared ? undefined : Date.now(),
				},
				scripts: [pixel],
				...options,
			} as ConsentManagerOptions,
		},
	});
	setRequestEvent(undefined);
	return inject(`<html><head>${head}</head><body>${body}</body></html>`, true);
};

/** The inline scripts the page ends its body with. */
const startScripts = (page: string): string[] =>
	[...page.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>(?=<\/body>)/gu)].map(
		([tag]) => tag
	);

beforeAll(async () => {
	await loadServerScriptStart();
});

afterEach(() => {
	setRequestEvent(undefined);
});

test('starts an allowed script from the end of the body, with the nonce', () => {
	const page = renderPage({ nonce: 'request-nonce' });
	const [start, ...rest] = startScripts(page);

	expect(rest).toEqual([]);
	expect(start).toMatch(/^<script nonce="request-nonce">/u);
	expect(start).toContain(JSON.stringify(pixel.src));
	expect(start).toContain('window.__pixel="a&b<c"');
	// The code never passes through the rendered markup.
	expect(page.indexOf('window.__pixel')).toBe(
		page.lastIndexOf('window.__pixel')
	);
});

test('starts nothing while the policy asks the visitor to choose', () => {
	expect(
		startScripts(renderPage({ rule: { ...optOut, prompt: 'choice' } }))
	).toEqual([]);
});

test('starts nothing from a shared render', () => {
	expect(startScripts(renderPage({ shared: true }))).toEqual([]);
});

test('starts nothing when the app turns the server start off', () => {
	expect(
		startScripts(renderPage({ scriptLoader: { serverStart: false } }))
	).toEqual([]);
});

test('starts nothing without scripts', () => {
	expect(startScripts(renderPage({ scripts: [] }))).toEqual([]);
});
