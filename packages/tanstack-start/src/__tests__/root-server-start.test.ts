/**
 * `ConsentRoot` inlines a script that starts the vendor tags a visitor's
 * consent already allows, after the page content so it doesn't hold back
 * first paint. Prerendered HTML goes to every visitor, so it never starts
 * one.
 */
import type { Script } from '@c15t/core';
import { offline } from '@c15t/core/modes';
import { createElement } from 'react';
import { renderToReadableStream } from 'react-dom/server';
import { afterEach, expect, test, vi } from 'vitest';

import { optOutRule } from '../../../core/src/__tests__/fixtures/kernel-fixtures';
import { ConsentRoot } from '../root';
import type { ConsentRootProps } from '../root';
import { resolveConsent } from '../server';

const pixel: Script = {
	category: 'marketing',
	id: 'pixel',
	serverStart: () => ({ code: '' }),
	src: 'https://cdn.example.com/pixel.js',
};

/** A US-style policy: marketing runs until the visitor opts out. */
const optOutState = () =>
	resolveConsent({
		mode: offline({
			policyRules: [optOutRule({ prompt: 'none' })],
		}),
		request: new Request('https://app.example.com/'),
	});

const render = async (
	state: ConsentRootProps['state'],
	onError?: (error: unknown) => void
): Promise<string> => {
	const stream = await renderToReadableStream(
		createElement(
			ConsentRoot,
			{ scripts: [pixel], state },
			createElement('main', { id: 'page' }, 'Page')
		),
		{ onError }
	);
	await stream.allReady;
	return new Response(stream).text();
};

afterEach(() => {
	vi.unstubAllEnvs();
});

test('renders the server start script after the page content', async () => {
	// The first render loads the start module; later renders, like a warm
	// server's, inline the script where the component sits.
	await render(await optOutState());
	const html = await render(await optOutState());

	const start = html.indexOf(JSON.stringify(pixel.src));
	expect(start).toBeGreaterThan(-1);
	expect(start).toBeGreaterThan(html.indexOf('</main>'));
});

test('starts the scripts from a streamed state', async () => {
	await render(optOutState());
	const html = await render(optOutState());

	expect(html).toContain(JSON.stringify(pixel.src));
});

test('starts nothing from a prerender', async () => {
	vi.stubEnv('TSS_PRERENDERING', 'true');
	await render(await optOutState());
	const html = await render(await optOutState());

	expect(html).toContain('<main id="page">Page</main>');
	expect(html).not.toContain(JSON.stringify(pixel.src));
});

test('renders without a server start when the state promise rejects', async () => {
	// The provider falls back to the transport for a rejected state; the
	// server start has to skip quietly, not fail the server render.
	const state = Promise.reject(new Error('backend unreachable'));
	state.catch(() => undefined);
	const onError = vi.fn();

	const html = await render(state, onError);

	expect(onError).not.toHaveBeenCalled();
	expect(html).toContain('<main id="page">Page</main>');
	expect(html).not.toContain(JSON.stringify(pixel.src));
});
