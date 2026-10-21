import { describe, expect, test, vi } from 'vitest';

import { consentRequestMiddleware } from '../middleware';
import { resolveConsent } from '../server';

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

/** What the route handler returns: the page and its request. */
const pageResult = function pageResult(request: Request) {
	return {
		context: {},
		pathname: '/',
		request,
		response: new Response('page', { headers: { 'set-cookie': 'session=1' } }),
	};
};

const run = async function run(
	middleware: ReturnType<typeof consentRequestMiddleware>,
	headers: Record<string, string>
) {
	const request = new Request('https://app.example.com/', { headers });
	const next = vi.fn().mockResolvedValue(pageResult(request));
	const result = (await serverHandlerOf(middleware)({
		context: {},
		next,
		pathname: '/',
		request,
	})) as { response: Response };
	return { next, request, response: result.response };
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
	test('overrides still reach resolveConsent when headers cannot be written', async () => {
		const request = new Request('https://app.example.com/', {
			headers: { 'accept-language': 'de', 'x-vercel-ip-country': 'DE' },
		});
		vi.spyOn(request.headers, 'set').mockImplementation(() => {
			throw new TypeError('immutable');
		});
		const next = vi.fn().mockResolvedValue(pageResult(request));
		await serverHandlerOf(
			consentRequestMiddleware({ country: 'FR', language: 'fr' })
		)({
			context: {},
			next,
			pathname: '/',
			request,
		});

		expect(request.headers.get('x-c15t-country')).toBeNull();
		const state = await resolveConsent({ request });
		expect(state.initialOverrides).toMatchObject({
			country: 'FR',
			language: 'fr',
		});
	});
});

describe('consentRequestMiddleware: subject ID', () => {
	test('a first visit gets a c15t-sid cookie, and resolveConsent reads the same ID', async () => {
		const { request, response } = await run(consentRequestMiddleware(), {
			cookie: 'theme=dark',
		});
		const subjectId = /c15t-sid=(?<id>sub_\w+);/u.exec(
			response.headers.getSetCookie().join('\n')
		)?.groups?.id;
		expect(subjectId).toBeDefined();
		expect(response.headers.getSetCookie()).toEqual([
			'session=1',
			`c15t-sid=${subjectId}; Max-Age=31536000; Path=/; Secure; SameSite=Lax`,
		]);
		expect(await response.text()).toBe('page');

		const state = await resolveConsent({ request });
		expect(state.initialRecords?.subject?.subjectId).toBe(subjectId);
		expect(state.initialRecords?.choice).toBeNull();
	});

	test('a returning visitor keeps their ID and gets no new cookie', async () => {
		const { request, response } = await run(consentRequestMiddleware(), {
			cookie: 'c15t-sid=sub_returning',
		});
		expect(response.headers.getSetCookie()).toEqual(['session=1']);
		const state = await resolveConsent({ request });
		expect(state.initialRecords?.subject?.subjectId).toBe('sub_returning');
	});

	test('a prefetch or a prerender gets no subject', async () => {
		const prefetch = await run(consentRequestMiddleware(), {
			'sec-purpose': 'prefetch',
		});
		expect(prefetch.response.headers.getSetCookie()).toEqual(['session=1']);

		vi.stubEnv('TSS_PRERENDERING', 'true');
		try {
			const prerender = await run(consentRequestMiddleware(), {});
			expect(prerender.response.headers.getSetCookie()).toEqual(['session=1']);
		} finally {
			vi.unstubAllEnvs();
		}
	});

	test('subjectCookie: false sets no cookie and resolveConsent finds no subject', async () => {
		const { request, response } = await run(
			consentRequestMiddleware({ subjectCookie: false }),
			{}
		);
		expect(response.headers.getSetCookie()).toEqual(['session=1']);
		const state = await resolveConsent({ request });
		expect(state.initialRecords?.subject?.subjectId).toBeUndefined();
	});

	test('the storage option names the cookie', async () => {
		const { response } = await run(
			consentRequestMiddleware({ storage: { storageKey: 'consent' } }),
			{}
		);
		expect(response.headers.getSetCookie()[1]).toMatch(/^consent-sid=sub_/u);
	});
});
