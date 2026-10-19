import type { Script } from '@c15t/core';
/**
 * The server start script waits for the page's stylesheets before it runs.
 * Rendered ahead of the page it holds the parser back and delays first
 * paint, so it must follow the page content.
 */
import { custom } from '@c15t/react';
import { renderToReadableStream } from 'react-dom/server';
import { expect, test, vi } from 'vitest';

import {
	choiceRecords,
	matchedResolution,
	NOW,
	optInRule,
} from '../../../core/src/__tests__/fixtures/kernel-fixtures';
import { ConsentRoot } from '../root';
import type { ConsentRootProps } from '../root';

const pixel: Script = {
	category: 'marketing',
	id: 'pixel',
	serverStart: () => ({ code: '' }),
	src: 'https://cdn.example.com/pixel.js',
};

const grantedState = () => {
	const resolution = matchedResolution(optInRule());
	return {
		initialPolicyResolution: resolution,
		initialRecords: choiceRecords(
			{ marketing: true },
			{
				confirmedAt: NOW - 1000,
				fingerprint: resolution.fingerprints.choice,
			}
		),
		now: NOW,
	};
};

const render = async (
	state: ConsentRootProps['state'] = grantedState(),
	onError?: (error: unknown) => void
): Promise<string> => {
	const stream = await renderToReadableStream(
		<ConsentRoot
			options={{ mode: custom({ init: () => Promise.resolve({}) }) }}
			scripts={[pixel]}
			state={state}
		>
			<main id="page">Page</main>
		</ConsentRoot>,
		{ onError }
	);
	await stream.allReady;
	return new Response(stream).text();
};

test('renders the server start script after the page content', async () => {
	// The first render loads the start module; later renders, like a warm
	// server's, inline the script where the component sits.
	await render();
	const html = await render();

	const start = html.indexOf(JSON.stringify(pixel.src));
	expect(start).toBeGreaterThan(-1);
	expect(start).toBeGreaterThan(html.indexOf('</main>'));
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

test('renders no inline script without a state', async () => {
	// A static or cached page has no state. An empty inline script there
	// would still need a CSP nonce.
	const stream = await renderToReadableStream(
		<ConsentRoot
			options={{ mode: custom({ init: () => Promise.resolve({}) }) }}
			scripts={[pixel]}
		>
			<main id="page">Page</main>
		</ConsentRoot>
	);
	await stream.allReady;
	const html = await new Response(stream).text();

	expect(html).toContain('<main id="page">Page</main>');
	expect(html).not.toContain('<script');
});

test('renders the empty script the browser hydrates when the start module fails to load', async () => {
	// The browser always renders an empty script here; rendering nothing on
	// the server would fail hydration.
	vi.resetModules();
	// oxlint-disable-next-line anti-slop/no-module-mocking -- The property under test is a failed load of this module; no interface stands in for a dynamic import.
	vi.doMock('@c15t/core/runtime/script-server-start', () => {
		throw new Error('chunk missing');
	});
	try {
		const { ConsentRoot: FreshRoot } = await import('../root');
		const onError = vi.fn();
		const stream = await renderToReadableStream(
			<FreshRoot
				options={{ mode: custom({ init: () => Promise.resolve({}) }) }}
				scripts={[pixel]}
				state={grantedState()}
			>
				<main id="page">Page</main>
			</FreshRoot>,
			{ onError }
		);
		await stream.allReady;
		const html = await new Response(stream).text();

		expect(onError).not.toHaveBeenCalled();
		expect(html).toMatch(/<\/main><!--\$--><script[^>]*><\/script>/u);
		expect(html).not.toContain(JSON.stringify(pixel.src));
	} finally {
		vi.doUnmock('@c15t/core/runtime/script-server-start');
		vi.resetModules();
	}
});
