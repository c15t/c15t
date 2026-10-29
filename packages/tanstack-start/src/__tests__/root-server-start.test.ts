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
			acknowledgeNoRecords: true,
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

test("renders no start script for a state that is no one visitor's", async () => {
	// Prerendered HTML, and the static root's `state={{}}`, would carry an
	// empty inline script that a hash-based policy has to allow.
	vi.stubEnv('TSS_PRERENDERING', 'true');
	const prerendered = await optOutState();
	vi.unstubAllEnvs();

	// `{}` as the static root passes it; the backend URL stands in for the
	// one `consentManifest()` supplies.
	const empty = { backendURL: 'https://consent.example.com' };

	// A first render loads the start module, as in the tests above.
	await render(prerendered);
	const pages = await Promise.all([render(prerendered), render(empty)]);

	for (const html of pages) {
		expect(html).toContain('<main id="page">Page</main>');
		expect(html).not.toContain('<script');
	}
});

test('renders no start script for a streamed state that starts nothing', async () => {
	vi.stubEnv('TSS_PRERENDERING', 'true');
	const prerendered = Promise.resolve(await optOutState());
	vi.unstubAllEnvs();
	const rejected = Promise.reject(new Error('backend unreachable'));
	rejected.catch(() => undefined);

	await render(await optOutState());
	const pages = await Promise.all([render(prerendered), render(rejected)]);

	for (const html of pages) {
		expect(html).toContain('<main id="page">Page</main>');
		expect(html).not.toContain('<script');
	}
});

test('renders no start script when the app turns the server start off', async () => {
	await render(await optOutState());
	const stream = await renderToReadableStream(
		createElement(
			ConsentRoot,
			{
				scriptLoader: { serverStart: false },
				scripts: [pixel],
				state: await optOutState(),
			},
			createElement('main', { id: 'page' }, 'Page')
		)
	);
	await stream.allReady;
	const html = await new Response(stream).text();

	expect(html).toContain('<main id="page">Page</main>');
	expect(html).not.toContain('<script');
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

/**
 * The root as React 18 runs it: React without `use`. React 19's renderer
 * still renders it, retrying on the thrown promise as React 18's does;
 * React 18.3.1's own renderer is checked outside CI.
 */
const importRootWithoutUse = async (): Promise<typeof ConsentRoot> => {
	vi.resetModules();
	// oxlint-disable-next-line anti-slop/no-module-mocking -- The repo installs only React 19; React 18 is React without `use`.
	vi.doMock('react', async (importOriginal) => {
		const actual = await importOriginal<Record<string, unknown>>();
		const react18 = { ...actual, use: undefined };
		return { ...react18, default: react18 };
	});
	return (await import('../root')).ConsentRoot;
};

test('starts the scripts from a streamed state on React 18, which has no `use`', async () => {
	try {
		const Root = await importRootWithoutUse();
		const onError = vi.fn();
		const stream = await renderToReadableStream(
			createElement(
				Root,
				{ scripts: [pixel], state: optOutState() },
				createElement('main', { id: 'page' }, 'Page')
			),
			{ onError }
		);
		await stream.allReady;
		const html = await new Response(stream).text();

		expect(onError).not.toHaveBeenCalled();
		const start = html.indexOf(JSON.stringify(pixel.src));
		expect(start).toBeGreaterThan(html.indexOf('</main>'));
	} finally {
		vi.doUnmock('react');
		vi.resetModules();
	}
});

test('finishes concurrent React 18 renders while a failed start module reloads', async () => {
	// Both renders wait on the first, failed load. The second load waits
	// for the test; a render that waited on the first must not wait on it.
	let loads = 0;
	let release: () => void = () => undefined;
	const released = new Promise<void>((resolve) => {
		release = resolve;
	});
	// oxlint-disable-next-line anti-slop/no-module-mocking -- The property under test is a failed load of this module; no interface stands in for a dynamic import.
	vi.doMock('@c15t/core/runtime/script-server-start', async () => {
		loads += 1;
		if (loads > 1) {
			await released;
		}
		throw new Error('chunk missing');
	});
	try {
		const Root = await importRootWithoutUse();
		const state = await optOutState();
		const renderPage = async () => {
			const stream = await renderToReadableStream(
				createElement(
					Root,
					{ scripts: [pixel], state },
					createElement('main', { id: 'page' }, 'Page')
				)
			);
			await stream.allReady;
			return new Response(stream).text();
		};

		const pages = await Promise.race([
			Promise.all([renderPage(), renderPage()]),
			new Promise<'waiting on the reload'>((resolve) => {
				setTimeout(() => resolve('waiting on the reload'), 1000);
			}),
		]);

		expect(pages).toHaveLength(2);
		for (const html of pages) {
			expect(html).toContain('<main id="page">Page</main>');
			expect(html).not.toContain(JSON.stringify(pixel.src));
		}
	} finally {
		release();
		vi.doUnmock('@c15t/core/runtime/script-server-start');
		vi.doUnmock('react');
		vi.resetModules();
	}
});
