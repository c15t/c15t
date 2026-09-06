import { describe, expect, test, vi } from 'vitest';

import { consentRequestMiddleware } from '../middleware';
import { readInitialConsentConfig } from '../server';

type ServerHandler = (input: {
	context: Record<string, never>;
	next: (options?: { context?: unknown }) => Promise<unknown>;
	pathname: string;
	request: Request;
}) => Promise<unknown> | unknown;

const serverHandlerOf = function serverHandlerOf(
	middleware: ReturnType<typeof consentRequestMiddleware>
): ServerHandler {
	return (middleware as unknown as { options: { server: ServerHandler } })
		.options.server;
};

const run = async function run(
	middleware: ReturnType<typeof consentRequestMiddleware>,
	headers: Record<string, string>
) {
	const request = new Request('https://app.example.com/', { headers });
	const next = vi.fn().mockResolvedValue({ ok: true });
	await serverHandlerOf(middleware)({
		context: {},
		next,
		pathname: '/',
		request,
	});
	return { next, request };
};

describe('consentRequestMiddleware', () => {
	test('is a request middleware', () => {
		const middleware = consentRequestMiddleware() as unknown as {
			options: { type: string };
		};
		expect(middleware.options.type).toBe('request');
	});

	test('normalizes CDN geo and GPC onto canonical request headers', async () => {
		const { next, request } = await run(consentRequestMiddleware(), {
			'cf-ipcountry': 'DE',
			'cf-region-code': 'BE',
			'sec-gpc': '1',
		});

		expect(request.headers.get('x-c15t-country')).toBe('DE');
		expect(request.headers.get('x-c15t-region')).toBe('BE');
		expect(request.headers.get('sec-gpc')).toBe('1');
		expect(next).toHaveBeenCalledWith({
			context: {
				consent: expect.objectContaining({
					country: 'DE',
					gpc: true,
					region: 'BE',
				}),
			},
		});
	});

	test('applies explicit overrides before headers', async () => {
		const { next, request } = await run(
			consentRequestMiddleware({ country: 'FR', language: 'fr' }),
			{ 'accept-language': 'de', 'x-vercel-ip-country': 'DE' }
		);

		expect(request.headers.get('x-c15t-country')).toBe('FR');
		expect(next).toHaveBeenCalledWith({
			context: {
				consent: expect.objectContaining({ country: 'FR', language: 'fr' }),
			},
		});
	});

	test('leaves headers untouched when normalization is disabled', async () => {
		const { next, request } = await run(
			consentRequestMiddleware({ normalizeHeaders: false }),
			{ 'cf-ipcountry': 'DE' }
		);

		expect(request.headers.get('x-c15t-country')).toBeNull();
		expect(next).toHaveBeenCalledWith({
			context: { consent: expect.objectContaining({ country: 'DE' }) },
		});
	});
});

describe('consentRequestMiddleware: language override', () => {
	test('writes the language override onto accept-language', async () => {
		const { request } = await run(
			consentRequestMiddleware({ language: 'fr' }),
			{
				'accept-language': 'de-DE,de;q=0.9',
			}
		);
		expect(request.headers.get('accept-language')).toBe('fr');
	});

	test('leaves accept-language alone without an override', async () => {
		const { request } = await run(consentRequestMiddleware(), {
			'accept-language': 'de-DE,de;q=0.9',
		});
		expect(request.headers.get('accept-language')).toBe('de-DE,de;q=0.9');
	});
});

describe('consentRequestMiddleware: immutable request headers', () => {
	test('overrides still reach readInitialConsentConfig when headers cannot be written', async () => {
		const request = new Request('https://app.example.com/', {
			headers: { 'accept-language': 'de', 'x-vercel-ip-country': 'DE' },
		});
		vi.spyOn(request.headers, 'set').mockImplementation(() => {
			throw new TypeError('immutable');
		});
		const next = vi.fn().mockResolvedValue({ ok: true });
		await serverHandlerOf(
			consentRequestMiddleware({ country: 'FR', language: 'fr' })
		)({
			context: {},
			next,
			pathname: '/',
			request,
		});

		expect(request.headers.get('x-c15t-country')).toBeNull();
		const config = await readInitialConsentConfig({ request });
		expect(config.initialOverrides).toMatchObject({
			country: 'FR',
			language: 'fr',
		});
	});
});
