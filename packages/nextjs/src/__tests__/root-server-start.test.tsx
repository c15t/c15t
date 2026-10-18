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
