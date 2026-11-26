import { clearManifestCache } from '@c15t/core/server';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { createConsentRoute } from '../api';
import { consentRequestMiddleware } from '../middleware';
import { resolveConsent } from '../server';
import { MANIFEST_FIXTURE } from './manifest-fixture';

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

/** A consent cookie that carries a choice under `subjectId`. */
const consentCookie = function consentCookie(subjectId: string): string {
	const envelope = {
		categories: {
			measurement: {
				basis: { fingerprint: 'a'.repeat(64), kind: 'choice-v1' },
				confirmedAt: Date.now() - 1000,
				value: true,
			},
		},
		subject: { subjectId },
		version: 3,
	};
	return `c15t=${encodeURIComponent(JSON.stringify(envelope))}`;
};

// A visitor who has not chosen gets nothing stored: the server reads a
// subject ID only from the consent records a save wrote.
describe('consentRequestMiddleware: no subject cookie', () => {
	test('a first visit gets no c15t-sid cookie, and resolveConsent finds no subject', async () => {
		const { request, response } = await run(consentRequestMiddleware(), {
			cookie: 'theme=dark',
		});
		expect(response.headers.getSetCookie()).toEqual(['session=1']);
		expect(request.headers.get('cookie')).toBe('theme=dark');
		expect(await response.text()).toBe('page');

		const state = await resolveConsent({ request });
		expect(state.initialRecords?.subject?.subjectId).toBeUndefined();
		expect(state.initialRecords?.choice).toBeNull();
	});

	test('a returning visitor keeps the ID their records carry', async () => {
		const { request, response } = await run(consentRequestMiddleware(), {
			cookie: consentCookie('sub_returning'),
		});
		expect(response.headers.getSetCookie()).toEqual(['session=1']);
		const state = await resolveConsent({ request });
		expect(state.initialRecords?.subject?.subjectId).toBe('sub_returning');
	});

	test('the deprecated subject options set no cookie', async () => {
		const { response } = await run(
			consentRequestMiddleware({
				storage: { storageKey: 'consent' },
				subjectCookie: true,
				trustForwardedHeaders: true,
			}),
			{}
		);
		expect(response.headers.getSetCookie()).toEqual(['session=1']);
	});
});

/** Runs the middleware around a page that may render consent. */
const servePage = async function servePage(
	headers: Record<string, string>,
	responseHeaders: Record<string, string>,
	render: boolean | { shared: boolean }
) {
	const request = new Request('https://app.example.com/pricing', { headers });
	let rendered: string | undefined;
	const result = (await serverHandlerOf(consentRequestMiddleware())({
		context: {},
		next: async () => {
			if (render) {
				const state = await resolveConsent({
					request,
					shared: typeof render === 'object' ? render.shared : undefined,
				});
				rendered = state.initialRecords?.subject?.subjectId;
			}
			return {
				context: {},
				pathname: '/pricing',
				request,
				response: new Response(`<html>${rendered ?? ''}</html>`, {
					headers: responseHeaders,
				}),
			};
		},
		pathname: '/pricing',
		request,
	})) as { response: Response };
	return { rendered, response: result.response };
};

// A page whose render read the visitor's cookies holds that visitor's
// consent state, so a shared cache must not keep it.
describe('consentRequestMiddleware: rendered pages a shared cache may keep', () => {
	test('a returning visitor on a public page is sent private', async () => {
		const { rendered, response } = await servePage(
			{ cookie: consentCookie('sub_returning') },
			{ 'cache-control': 's-maxage=60' },
			true
		);
		expect(rendered).toBe('sub_returning');
		expect(response.headers.get('cache-control')).toBe('private');
		expect(response.headers.getSetCookie()).toEqual([]);
	});

	test('a shared render of a public page holds no subject and stays public', async () => {
		const { rendered, response } = await servePage(
			{ cookie: consentCookie('sub_returning') },
			{ 'cache-control': 'public, s-maxage=60' },
			{ shared: true }
		);
		expect(rendered).toBeUndefined();
		expect(response.headers.get('cache-control')).toBe('public, s-maxage=60');
	});

	test('a page that renders no consent keeps its headers', async () => {
		const { response } = await servePage(
			{},
			{ 'cache-control': 'public, s-maxage=60' },
			false
		);
		expect(response.headers.get('cache-control')).toBe('public, s-maxage=60');
		expect(response.headers.getSetCookie()).toEqual([]);
	});

	test.each([
		['private, no-store', 'private, no-store'],
		['no-store', 'no-store'],
		[null, 'private'],
		['max-age=60', 'private, max-age=60'],
		['max-age=0', 'private, max-age=0'],
		['no-cache', 'private, no-cache'],
		[
			'public, max-age=60, s-maxage=300, must-revalidate',
			'private, max-age=60, must-revalidate',
		],
		['private="Set-Cookie", max-age=60', 'private, max-age=60'],
		['private="Set-Cookie, X-Id", max-age=60', 'private, max-age=60'],
	] as const)(
		'a page rendered for the visitor with Cache-Control %s is sent with %s',
		async (cacheControl, sent) => {
			const { response } = await servePage(
				{},
				cacheControl ? { 'cache-control': cacheControl } : {},
				true
			);
			expect(response.headers.get('cache-control')).toBe(sent);
			expect(response.headers.getSetCookie()).toEqual([]);
		}
	);

	test('a page rendered for the visitor with Expires is made private', async () => {
		const expires = 'Wed, 21 Oct 2037 07:28:00 GMT';
		const { response } = await servePage({}, { expires }, true);
		expect(response.headers.get('cache-control')).toBe('private');
		expect(response.headers.get('expires')).toBe(expires);
	});
});

// resolveConsent may read a clone or another Request, while the middleware
// decides for the request TanStack Start handles. Both run in one Start
// request scope.
describe('consentRequestMiddleware: a render from another Request object', () => {
	const serve = async function serve(
		cookie: string | undefined,
		cacheControl: string,
		input: (request: Request) => Request,
		shared?: boolean
	) {
		const { createServerEntry } = await import('@tanstack/react-start/server');
		let rendered: string | undefined;
		const entry = createServerEntry({
			fetch: async (request: Request) => {
				const result = (await serverHandlerOf(consentRequestMiddleware())({
					context: {},
					next: async () => {
						const state = await resolveConsent({
							request: input(request),
							shared,
						});
						rendered = state.initialRecords?.subject?.subjectId;
						return {
							context: {},
							pathname: '/pricing',
							request,
							response: new Response(`<html>${rendered ?? ''}</html>`, {
								headers: { 'cache-control': cacheControl },
							}),
						};
					},
					pathname: '/pricing',
					request,
				})) as { response: Response };
				return result.response;
			},
		});
		const response = await entry.fetch(
			new Request('https://app.example.com/pricing', {
				headers: cookie ? { cookie } : {},
			})
		);
		return { rendered, response };
	};

	test.each([
		['a clone', (request: Request) => request.clone()],
		[
			'a new Request with the same headers',
			(request: Request) =>
				new Request(request.url, { headers: request.headers }),
		],
	] as const)(
		'a returning visitor rendered from %s on a public page is sent private',
		async (_, input) => {
			const { rendered, response } = await serve(
				consentCookie('sub_returning'),
				'public, s-maxage=60',
				input
			);
			expect(rendered).toBe('sub_returning');
			expect(response.headers.get('cache-control')).toBe('private');
			expect(response.headers.getSetCookie()).toEqual([]);
		}
	);

	test('a new visitor rendered from a clone gets no cookie', async () => {
		const { rendered, response } = await serve(
			undefined,
			'no-store',
			(request) => request.clone()
		);
		expect(rendered).toBeUndefined();
		expect(response.headers.getSetCookie()).toEqual([]);
	});

	test('concurrent requests keep their own render', async () => {
		const [personal, shared] = await Promise.all([
			serve(consentCookie('sub_a'), 'public, s-maxage=60', (r) => r.clone()),
			serve(
				consentCookie('sub_b'),
				'public, s-maxage=60',
				(r) => r.clone(),
				true
			),
		]);
		expect(personal.response.headers.get('cache-control')).toBe('private');
		expect(shared.response.headers.get('cache-control')).toBe(
			'public, s-maxage=60'
		);
	});
});

// A qualified `private` lets a shared cache store the response without the
// listed fields (RFC 9111, section 5.2.2.7), so it doesn't protect a body.
describe('consentRequestMiddleware: qualified private', () => {
	test('a returning visitor render with unqualified private keeps its headers', async () => {
		const { response } = await servePage(
			{ cookie: consentCookie('sub_returning') },
			{ 'cache-control': 'private, max-age=60' },
			true
		);
		expect(response.headers.get('cache-control')).toBe('private, max-age=60');
	});

	test('a response with no visitor render and private="Set-Cookie" keeps its headers', async () => {
		const { response } = await servePage(
			{},
			{ 'cache-control': 'public, max-age=60, private="Set-Cookie"' },
			false
		);
		expect(response.headers.get('cache-control')).toBe(
			'public, max-age=60, private="Set-Cookie"'
		);
	});
});

// The consent route renders no page: its manifest is public data a shared
// cache keeps, and init is private to one request. It is mounted at any
// path, and the bundled snapshot manifest has no cache headers, so the
// route itself tells the middleware it served the request.
describe('consentRequestMiddleware: consent route at any mount', () => {
	beforeEach(() => {
		clearManifestCache();
	});

	const serve = async function serve(path: string, splat: string) {
		const { GET } = createConsentRoute({
			backendURL: 'https://consent.example.com',
			reportSessions: false,
			snapshot: MANIFEST_FIXTURE,
		});
		const request = new Request(`https://app.example.com${path}`, {
			headers: { 'cf-ipcountry': 'DE' },
		});
		const result = (await serverHandlerOf(consentRequestMiddleware())({
			context: {},
			next: async () => ({
				context: {},
				pathname: path,
				request,
				response: await GET({ params: { _splat: splat }, request }),
			}),
			pathname: path,
			request,
		})) as { response: Response };
		return result.response;
	};

	test.each(['/api/c15t', '/api/consent', '/consent'])(
		'the bundled manifest at %s/manifest keeps its headers and gets no cookie',
		async (prefix) => {
			const response = await serve(`${prefix}/manifest`, 'manifest');
			expect(response.headers.getSetCookie()).toEqual([]);
			expect(response.headers.get('cache-control')).toBeNull();
			expect(await response.json()).toEqual(MANIFEST_FIXTURE);
		}
	);

	test.each(['/api/c15t', '/api/consent', '/consent'])(
		'init at %s/init stays private, no-store with no cookie',
		async (prefix) => {
			const response = await serve(`${prefix}/init`, 'init');
			expect(response.status).toBe(200);
			expect(response.headers.getSetCookie()).toEqual([]);
			expect(response.headers.get('cache-control')).toBe('private, no-store');
		}
	);

	test('the route served inside a Start request keeps its headers', async () => {
		const { createServerEntry } = await import('@tanstack/react-start/server');
		const { GET } = createConsentRoute({
			backendURL: 'https://consent.example.com',
			reportSessions: false,
			snapshot: MANIFEST_FIXTURE,
		});
		const entry = createServerEntry({
			fetch: async (request: Request) => {
				const result = (await serverHandlerOf(consentRequestMiddleware())({
					context: {},
					next: async () => ({
						context: {},
						pathname: '/api/consent/manifest',
						request,
						// A handler may see a copy of the request.
						response: await GET({
							params: { _splat: 'manifest' },
							request: request.clone(),
						}),
					}),
					pathname: '/api/consent/manifest',
					request,
				})) as { response: Response };
				return result.response;
			},
		});
		const response = await entry.fetch(
			new Request('https://app.example.com/api/consent/manifest')
		);
		expect(response.headers.getSetCookie()).toEqual([]);
		expect(response.headers.get('cache-control')).toBeNull();
	});
});

// A CDN reads the cache field targeted at it, such as `CDN-Cache-Control`
// (RFC 9213), in place of `Cache-Control`, so `private` there does not keep
// a response out of that CDN.
describe('consentRequestMiddleware: targeted cache fields', () => {
	test.each([
		[{ 'cache-control': 'private', 'cdn-cache-control': 'public, max-age=60' }],
		[{ 'cache-control': 'no-store', 'cdn-cache-control': 'max-age=60' }],
		[{ 'cdn-cache-control': 'max-age=60' }],
		[
			{
				'cache-control': 'private',
				'vercel-cdn-cache-control': 'max-age=60',
			},
		],
		[{ 'cache-control': 'private', 'surrogate-control': 'max-age=60' }],
	])(
		'a returning visitor render with %o keeps no targeted cache field',
		async (headers) => {
			const { rendered, response } = await servePage(
				{ cookie: consentCookie('sub_returning') },
				headers,
				true
			);
			expect(rendered).toBe('sub_returning');
			expect(response.headers.get('cdn-cache-control')).toBeNull();
			expect(response.headers.get('vercel-cdn-cache-control')).toBeNull();
			expect(response.headers.get('surrogate-control')).toBeNull();
			expect(response.headers.get('cache-control')).toBe(
				headers['cache-control'] ?? 'private'
			);
		}
	);

	test.each([
		[{ 'cache-control': 'no-store', 'cdn-cache-control': 'max-age=60' }],
		[
			{
				'cache-control': 'private',
				'cdn-cache-control': 'public, s-maxage=60',
			},
		],
		[{ 'cdn-cache-control': 'max-age=60' }],
		[{ 'cache-control': 'no-store', 'surrogate-control': 'no-store' }],
	])(
		'a response with no visitor render and %o keeps its headers',
		async (headers) => {
			const { response } = await servePage({}, headers, false);
			expect(response.headers.getSetCookie()).toEqual([]);
			for (const [name, value] of Object.entries(headers)) {
				expect(response.headers.get(name)).toBe(value);
			}
		}
	);
});

// A subject ID with no URI encoding, such as one with a lone surrogate. The
// request still renders with the ID and account its records carry.
describe('consentRequestMiddleware: a recorded ID with no URI encoding', () => {
	test('the page renders with the recorded ID and account, and sets no cookie', async () => {
		const envelope = {
			categories: {
				measurement: {
					basis: { fingerprint: 'a'.repeat(64), kind: 'choice-v1' },
					confirmedAt: Date.now() - 1000,
					value: true,
				},
			},
			subject: {
				externalId: 'account-a',
				identityProvider: 'app',
				subjectId: 'sub_\uD800',
			},
			version: 3,
		};
		const request = new Request('https://app.example.com/pricing', {
			headers: {
				cookie: `c15t=${encodeURIComponent(JSON.stringify(envelope))}`,
			},
		});
		let rendered: unknown;
		const result = (await serverHandlerOf(consentRequestMiddleware())({
			context: {},
			next: async () => {
				rendered = (await resolveConsent({ request })).initialRecords?.subject;
				return {
					context: {},
					pathname: '/pricing',
					request,
					response: new Response('<html></html>'),
				};
			},
			pathname: '/pricing',
			request,
		})) as { response: Response };
		expect(rendered).toEqual(envelope.subject);
		expect(result.response.headers.getSetCookie()).toEqual([]);
		expect(result.response.headers.get('cache-control')).toBe('private');
	});
});
