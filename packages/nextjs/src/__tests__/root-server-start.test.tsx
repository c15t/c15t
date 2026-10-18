import type { Script } from '@c15t/core';
/**
 * The server start script waits for the page's stylesheets before it runs.
 * Rendered ahead of the page it holds the parser back and delays first
 * paint, so it must follow the page content.
 */
import { custom } from '@c15t/react';
import { renderToReadableStream } from 'react-dom/server';
import { expect, test } from 'vitest';

import {
	choiceRecords,
	matchedResolution,
	NOW,
	optInRule,
} from '../../../core/src/__tests__/fixtures/kernel-fixtures';
import { ConsentRoot } from '../root';

const pixel: Script = {
	category: 'marketing',
	id: 'pixel',
	serverStart: () => ({ code: '' }),
	src: 'https://cdn.example.com/pixel.js',
};

const render = async (): Promise<string> => {
	const resolution = matchedResolution(optInRule());
	const stream = await renderToReadableStream(
		<ConsentRoot
			options={{ mode: custom({ init: () => Promise.resolve({}) }) }}
			scripts={[pixel]}
			state={{
				initialPolicyResolution: resolution,
				initialRecords: choiceRecords(
					{ marketing: true },
					{
						confirmedAt: NOW - 1000,
						fingerprint: resolution.fingerprints.choice,
					}
				),
				now: NOW,
			}}
		>
			<main id="page">Page</main>
		</ConsentRoot>
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
