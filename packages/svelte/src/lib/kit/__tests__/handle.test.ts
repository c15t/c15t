import { beforeEach, describe, expect, test, vi } from 'vitest';

import { c15tHandle } from '../handle';
import type { C15tLocals } from '../types';
import { CONSENTED_COOKIE, createEvent } from './event';

const runHandle = async function runHandle(
	event: ReturnType<typeof createEvent>,
	options?: Parameters<typeof c15tHandle>[0]
) {
	const resolve = vi.fn(() => Promise.resolve(new Response('ok')));
	const response = await c15tHandle(options)({ event, resolve });
	return { locals: (event.locals as { c15t: C15tLocals }).c15t, resolve, response };
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
		expect(locals.config.initialOverrides?.gpc).toBe(true);
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

	test('parses the consent cookie into the kernel config', async () => {
		const event = createEvent({ headers: { cookie: CONSENTED_COOKIE } });
		const { locals } = await runHandle(event);

		expect(locals.config.initialHasConsented).toBe(true);
		expect(locals.config.initialConsents?.marketing).toBe(true);
	});

	test('leaves the config empty when there is no request context', async () => {
		const event = createEvent();
		const { locals } = await runHandle(event);

		expect(locals.config).toEqual({});
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

		expect(resolve).toHaveBeenCalledWith(event);
		expect(await response.text()).toBe('ok');
	});
});
