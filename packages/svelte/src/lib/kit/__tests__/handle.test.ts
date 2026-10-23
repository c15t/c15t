import { custom, hosted as hostedTransport } from '@c15t/core';
import { clearManifestCache } from '@c15t/core/server';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { c15tHandle } from '../handle';
import { hosted } from '../index';
import { createConsentRoute } from '../routes';
import type { C15tLocals } from '../types';
import { CONSENTED_COOKIE, createEvent } from './event';
import { MANIFEST_FIXTURE } from './manifest-fixture';

const runHandle = async function runHandle(
	event: ReturnType<typeof createEvent>,
	options?: Parameters<typeof c15tHandle>[0]
) {
	const resolve = vi.fn(() => Promise.resolve(new Response('ok')));
	const response = await c15tHandle(options)({ event, resolve });
	return {
		locals: (event.locals as { c15t: C15tLocals }).c15t,
		resolve,
		response,
	};
};

describe('c15tHandle', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	test('normalizes infra geo headers onto the request as x-c15t-*', async () => {
		const event = createEvent({
			headers: {
				'cf-ipcountry': 'DE',
				'x-vercel-ip-country-region': 'BE',
			},
		});
		await runHandle(event);

		expect(event.request.headers.get('x-c15t-country')).toBe('DE');
		expect(event.request.headers.get('x-c15t-region')).toBe('BE');
	});

	test('normalizes GPC to sec-gpc and into the kernel overrides', async () => {
		const event = createEvent({ headers: { 'sec-gpc': '1' } });
		const { locals } = await runHandle(event);

		expect(event.request.headers.get('sec-gpc')).toBe('1');
		expect(locals.inputs.gpc).toBe(true);
		expect(locals.config.initialPrivacySignals?.gpc).toBe(true);
	});

	test('lets explicit x-c15t-* headers beat infrastructure headers', async () => {
		const event = createEvent({
			headers: {
				'cf-ipcountry': 'DE',
				'x-c15t-country': 'FR',
			},
		});
		const { locals } = await runHandle(event);

		expect(locals.inputs.country).toBe('FR');
		expect(event.request.headers.get('x-c15t-country')).toBe('FR');
	});

	test('option overrides beat every header', async () => {
		const event = createEvent({ headers: { 'x-c15t-country': 'FR' } });
		const { locals } = await runHandle(event, { country: 'US', region: 'CA' });

		expect(locals.inputs.country).toBe('US');
		expect(locals.inputs.region).toBe('CA');
	});

	test('rewrites accept-language to the language it resolved', async () => {
		const event = createEvent({
			headers: { 'accept-language': 'fr-FR,fr;q=0.9' },
		});
		const { locals } = await runHandle(event, { language: 'de' });

		expect(locals.inputs.language).toBe('de');
		// A downstream route re-reads `accept-language`, so it has to carry
		// the resolved language rather than the browser's original list.
		expect(event.request.headers.get('accept-language')).toBe('de');
	});

	test('parses the consent cookie into the kernel config', async () => {
		const event = createEvent({ headers: { cookie: CONSENTED_COOKIE } });
		const { locals } = await runHandle(event);

		expect(locals.config.initialRecords?.choice).not.toBeNull();
		expect(
			locals.config.initialRecords?.choice?.categories.marketing
		).toMatchObject({ basis: { kind: 'legacy-v2' }, value: true });
	});

	test('records no choice when there is no request context', async () => {
		const event = createEvent();
		const { locals } = await runHandle(event);

		expect(locals.config).toMatchObject({
			// No signal is not a decision: an absent header stays undefined.
			initialPrivacySignals: { gpc: undefined },
			// The subject ID the handle just set is not a choice.
			initialRecords: {
				choice: null,
				subject: { subjectId: expect.stringMatching(/^sub_/u) },
			},
			now: expect.any(Number),
		});
		expect(locals.inputs.country).toBeUndefined();
	});

	test('negotiates language q-values rather than splitting the first token', async () => {
		const event = createEvent({
			headers: { 'accept-language': 'en;q=0.4,de-DE;q=0.9' },
		});
		const { locals } = await runHandle(event);

		expect(locals.inputs.language).toBe('de');
	});

	test('continues when request headers are immutable', async () => {
		const event = createEvent({ headers: { 'cf-ipcountry': 'DE' } });
		vi.spyOn(event.request.headers, 'set').mockImplementation(() => {
			throw new TypeError('immutable');
		});

		const { locals, resolve } = await runHandle(event);

		expect(resolve).toHaveBeenCalledOnce();
		expect(locals.inputs.country).toBe('DE');
	});

	test('passes the event through to resolve and returns its response', async () => {
		const event = createEvent();
		const { resolve, response } = await runHandle(event);

		expect(resolve).toHaveBeenCalledWith(event, {
			transformPageChunk: expect.any(Function),
		});
		expect(await response.text()).toBe('ok');
	});

	test("links the on-demand chunks a page's provider names", async () => {
		const { resolve } = await runHandle(createEvent());
		const [, resolveOptions] = resolve.mock.calls[0] as unknown as [
			unknown,
			{
				transformPageChunk: (input: { done: boolean; html: string }) => string;
			},
		];

		// Outside a `consentManifest()` build no chunk is named, so no link
		// is added.
		const page =
			'<head><meta name="c15t-modulepreload" content="loader-and-blocker"></head>';
		expect(resolveOptions.transformPageChunk({ done: true, html: page })).toBe(
			page
		);
		expect(
			resolveOptions.transformPageChunk({ done: true, html: '<p>page</p>' })
		).toBe('<p>page</p>');
	});
});

describe('c15tHandle mode', () => {
	test('stores manifest() by default, with the route prefix and backend', async () => {
		const { locals } = await runHandle(createEvent(), {
			backendURL: 'https://consent.example.com',
			routePrefix: '/api/c15t',
		});
		expect(locals).toMatchObject({
			backendURL: 'https://consent.example.com',
			mode: { type: 'manifest' },
			routePrefix: '/api/c15t',
		});
	});

	test('keeps only the data of a transport factory', async () => {
		const { locals } = await runHandle(createEvent(), {
			mode: hostedTransport({ backendURL: 'https://consent.example.com' }),
		});
		expect(locals.mode).toEqual(
			hosted({ backendURL: 'https://consent.example.com' })
		);
		expect(typeof locals.mode).toBe('object');
	});

	test('trims a trailing slash off the route prefix', async () => {
		const { locals } = await runHandle(createEvent(), {
			routePrefix: '/api/c15t/',
		});
		expect(locals.routePrefix).toBe('/api/c15t');
	});

	test('rejects a route prefix of / when the hook is created', () => {
		expect(() => c15tHandle({ routePrefix: '/' })).toThrow(
			"@c15t/svelte: `routePrefix` can't be '/': a consent route at the site root would catch every page. Use a path such as '/api/c15t'."
		);
	});

	test('rejects custom(), which cannot reach the browser as data', () => {
		const mode = custom({ init: () => Promise.resolve({}) });
		expect(() => c15tHandle({ mode: mode as never })).toThrow(
			/Pass custom\(\) to <ConsentRoot mode>/u
		);
	});
});

// The consent route never renders a page, and its manifest is public data a
// shared cache keeps: a subject cookie on it would reach every visitor the
// cache serves it to.
describe('c15tHandle on the consent route', () => {
	beforeEach(() => {
		clearManifestCache();
	});

	test.each([
		[
			'the configured routePrefix',
			'/api/self-host',
			{ routePrefix: '/api/self-host' },
		],
		['the default route', '/api/c15t', {}],
	] as const)(
		'the public manifest under %s gets no subject cookie',
		async (_, prefix, options) => {
			const setCookie = vi.fn();
			const event = createEvent({
				route: { id: `${prefix}/[...path]`, params: { path: 'manifest' } },
				setCookie,
				url: `https://shop.example${prefix}/manifest`,
			});
			const { GET } = createConsentRoute({
				backendURL: 'https://consent.example.com',
				fetch: vi.fn<typeof globalThis.fetch>().mockResolvedValue(
					Response.json(MANIFEST_FIXTURE, {
						headers: { 'cache-control': 'public, s-maxage=120' },
					})
				),
				reportSessions: false,
			});
			const response = await c15tHandle(options)({
				event,
				resolve: () => GET(event),
			});
			expect(setCookie).not.toHaveBeenCalled();
			expect(response.headers.get('cache-control')).toBe(
				'public, s-maxage=120'
			);
			expect(await response.json()).toEqual(MANIFEST_FIXTURE);
		}
	);

	test('a page whose path only starts like the route still gets one', async () => {
		const setCookie = vi.fn();
		await runHandle(
			createEvent({ setCookie, url: 'https://shop.example/api/c15t-docs' }),
			{ routePrefix: '/api/c15t' }
		);
		expect(setCookie).toHaveBeenCalledWith(
			'c15t-sid',
			expect.stringMatching(/^sub_/u),
			expect.anything()
		);
	});
});
