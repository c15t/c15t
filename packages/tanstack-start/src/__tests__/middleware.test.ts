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

// The consent route never renders a page, and its manifest is public data a
// shared cache keeps: a subject cookie on it would reach every visitor the
// cache serves it to.
describe('consentRequestMiddleware: consent route', () => {
	beforeEach(() => {
		clearManifestCache();
	});

	const through = async function through(path: string, response: Response) {
		const request = new Request(`https://app.example.com${path}`);
		const result = (await serverHandlerOf(consentRequestMiddleware())({
			context: {},
			next: () =>
				Promise.resolve({ context: {}, pathname: path, request, response }),
			pathname: path,
			request,
		})) as { response: Response };
		return result.response;
	};

	test('the public manifest gets no subject cookie', async () => {
		const { GET } = createConsentRoute({
			backendURL: 'https://consent.example.com',
			fetch: vi.fn<typeof globalThis.fetch>().mockResolvedValue(
				Response.json(MANIFEST_FIXTURE, {
					headers: { 'cache-control': 'public, s-maxage=120' },
				})
			),
			reportSessions: false,
		});
		const request = new Request('https://app.example.com/api/c15t/manifest');
		const response = await through(
			'/api/c15t/manifest',
			await GET({ params: { _splat: 'manifest' }, request })
		);
		expect(response.headers.get('cache-control')).toBe('public, s-maxage=120');
		expect(response.headers.getSetCookie()).toEqual([]);
		expect(await response.json()).toEqual(MANIFEST_FIXTURE);
	});

	test('a page whose path only starts like the route still gets one', async () => {
		const response = await through('/api/c15t-docs', new Response('page'));
		expect(response.headers.getSetCookie()[0]).toMatch(/^c15t-sid=sub_/u);
	});

	test('the public manifest from a route mounted elsewhere gets no subject cookie', async () => {
		const { GET } = createConsentRoute({
			backendURL: 'https://consent.example.com',
			fetch: vi.fn<typeof globalThis.fetch>().mockResolvedValue(
				Response.json(MANIFEST_FIXTURE, {
					headers: { 'cache-control': 'public, s-maxage=120' },
				})
			),
			reportSessions: false,
		});
		const request = new Request('https://app.example.com/api/consent/manifest');
		const response = await through(
			'/api/consent/manifest',
			await GET({ params: { _splat: 'manifest' }, request })
		);
		expect(response.headers.get('cache-control')).toBe('public, s-maxage=120');
		expect(response.headers.getSetCookie()).toEqual([]);
		expect(await response.json()).toEqual(MANIFEST_FIXTURE);
	});

	test.each([
		['public, s-maxage=60', 0],
		['s-maxage=60', 0],
		['max-age=60', 0],
		['max-age=0', 0],
		['no-cache', 0],
		['private, no-store', 1],
		['public, no-store', 1],
		[null, 1],
	] as const)(
		'a page with Cache-Control %s gets %i subject cookies',
		async (cacheControl, cookies) => {
			const response = await through(
				'/pricing',
				new Response('page', {
					headers: cacheControl ? { 'cache-control': cacheControl } : {},
				})
			);
			expect(response.headers.getSetCookie()).toHaveLength(cookies);
		}
	);
});

// A page whose render read the visitor's cookies holds that visitor's
// consent state and subject ID, so a shared cache must not keep it.
describe('consentRequestMiddleware: rendered pages a shared cache may keep', () => {
	const renderPage = async function renderPage(
		headers: Record<string, string>,
		cacheControl: string | null,
		shared?: boolean
	) {
		const request = new Request('https://app.example.com/pricing', {
			headers,
		});
		let rendered: string | undefined;
		const result = (await serverHandlerOf(consentRequestMiddleware())({
			context: {},
			next: async () => {
				const state = await resolveConsent({ request, shared });
				rendered = state.initialRecords?.subject?.subjectId;
				return {
					context: {},
					pathname: '/pricing',
					request,
					response: new Response(`<html>${rendered ?? ''}</html>`, {
						headers: cacheControl ? { 'cache-control': cacheControl } : {},
					}),
				};
			},
			pathname: '/pricing',
			request,
		})) as { response: Response };
		return { rendered, response: result.response };
	};

	const cookieID = (response: Response) =>
		/c15t-sid=(?<id>sub_\w+);/u.exec(response.headers.getSetCookie().join('\n'))
			?.groups?.id;

	test('a first visit to a public page is sent private, with the cookie the page holds', async () => {
		const { rendered, response } = await renderPage({}, 'public, s-maxage=60');
		expect(rendered).toMatch(/^sub_/u);
		expect(response.headers.get('cache-control')).toBe('private');
		expect(cookieID(response)).toBe(rendered);
		expect(await response.text()).toBe(`<html>${rendered}</html>`);
	});

	test('a returning visitor on a public page is sent private, with no new cookie', async () => {
		const { rendered, response } = await renderPage(
			{ cookie: 'c15t-sid=sub_returning' },
			's-maxage=60'
		);
		expect(rendered).toBe('sub_returning');
		expect(response.headers.get('cache-control')).toBe('private');
		expect(response.headers.getSetCookie()).toEqual([]);
	});

	test('a shared render of a public page holds no subject and stays public', async () => {
		const { rendered, response } = await renderPage(
			{ cookie: 'c15t-sid=sub_returning' },
			'public, s-maxage=60',
			true
		);
		expect(rendered).toBeUndefined();
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
		'a page rendered for the visitor with Cache-Control %s is sent with %s and the cookie its render holds',
		async (cacheControl, sent) => {
			const { rendered, response } = await renderPage({}, cacheControl);
			expect(response.headers.get('cache-control')).toBe(sent);
			expect(cookieID(response)).toBe(rendered);
		}
	);
});

// A shared cache may store a response with Expires and no Cache-Control
// (RFC 9111, section 3).
describe('consentRequestMiddleware: Expires', () => {
	const expires = 'Wed, 21 Oct 2037 07:28:00 GMT';

	test('a shared resource with Expires gets no cookie and keeps its headers', async () => {
		const request = new Request('https://app.example.com/feed.xml');
		const result = (await serverHandlerOf(consentRequestMiddleware())({
			context: {},
			next: () =>
				Promise.resolve({
					context: {},
					pathname: '/feed.xml',
					request,
					response: new Response('feed', { headers: { expires } }),
				}),
			pathname: '/feed.xml',
			request,
		})) as { response: Response };
		expect(result.response.headers.getSetCookie()).toEqual([]);
		expect(result.response.headers.get('cache-control')).toBeNull();
		expect(result.response.headers.get('expires')).toBe(expires);
	});

	test('a page rendered for the visitor with Expires is made private, with its cookie', async () => {
		const request = new Request('https://app.example.com/pricing');
		let rendered: string | undefined;
		const result = (await serverHandlerOf(consentRequestMiddleware())({
			context: {},
			next: async () => {
				rendered = (await resolveConsent({ request })).initialRecords?.subject
					?.subjectId;
				return {
					context: {},
					pathname: '/pricing',
					request,
					response: new Response(`<html>${rendered}</html>`, {
						headers: { expires },
					}),
				};
			},
			pathname: '/pricing',
			request,
		})) as { response: Response };
		expect(result.response.headers.get('cache-control')).toBe('private');
		expect(result.response.headers.get('expires')).toBe(expires);
		expect(result.response.headers.getSetCookie()[0]).toContain(
			`c15t-sid=${rendered};`
		);
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
				'c15t-sid=sub_returning',
				'public, s-maxage=60',
				input
			);
			expect(rendered).toBe('sub_returning');
			expect(response.headers.get('cache-control')).toBe('private');
			expect(response.headers.getSetCookie()).toEqual([]);
		}
	);

	test('a new visitor rendered from a clone gets the ID its cookie holds', async () => {
		const { rendered, response } = await serve(
			undefined,
			'no-store',
			(request) => request.clone()
		);
		expect(rendered).toMatch(/^sub_/u);
		expect(response.headers.getSetCookie()[0]).toContain(
			`c15t-sid=${rendered};`
		);
	});

	test('a shared render from a clone stays public with no cookie', async () => {
		const { rendered, response } = await serve(
			'c15t-sid=sub_returning',
			'public, s-maxage=60',
			(request) => request.clone(),
			true
		);
		expect(rendered).toBeUndefined();
		expect(response.headers.get('cache-control')).toBe('public, s-maxage=60');
		expect(response.headers.getSetCookie()).toEqual([]);
	});

	test('concurrent requests keep their own render', async () => {
		const [personal, shared] = await Promise.all([
			serve('c15t-sid=sub_a', 'public, s-maxage=60', (r) => r.clone()),
			serve('c15t-sid=sub_b', 'public, s-maxage=60', (r) => r.clone(), true),
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
	const serve = async function serve(
		cookie: string | undefined,
		cacheControl: string,
		render: boolean
	) {
		const request = new Request('https://app.example.com/pricing', {
			headers: cookie ? { cookie } : {},
		});
		let rendered: string | undefined;
		const result = (await serverHandlerOf(consentRequestMiddleware())({
			context: {},
			next: async () => {
				if (render) {
					rendered = (await resolveConsent({ request })).initialRecords?.subject
						?.subjectId;
				}
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
		return { rendered, response: result.response };
	};

	test('a returning visitor render with private="Set-Cookie" is made private', async () => {
		const { rendered, response } = await serve(
			'c15t-sid=sub_returning',
			'private="Set-Cookie", max-age=60',
			true
		);
		expect(rendered).toBe('sub_returning');
		expect(response.headers.get('cache-control')).toBe('private, max-age=60');
		expect(response.headers.getSetCookie()).toEqual([]);
	});

	test('a returning visitor render with unqualified private keeps its headers', async () => {
		const { response } = await serve(
			'c15t-sid=sub_returning',
			'private, max-age=60',
			true
		);
		expect(response.headers.get('cache-control')).toBe('private, max-age=60');
	});

	test('a shared response with private="Set-Cookie" keeps its headers and gets no cookie', async () => {
		const { response } = await serve(
			undefined,
			'public, max-age=60, private="Set-Cookie"',
			false
		);
		expect(response.headers.get('cache-control')).toBe(
			'public, max-age=60, private="Set-Cookie"'
		);
		expect(response.headers.getSetCookie()).toEqual([]);
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

	test('the route served inside a Start request keeps its headers and gets no cookie', async () => {
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

	test('a page next to a custom mount still gets a cookie', async () => {
		const request = new Request('https://app.example.com/api/consent-docs');
		const result = (await serverHandlerOf(consentRequestMiddleware())({
			context: {},
			next: () =>
				Promise.resolve({
					context: {},
					pathname: '/api/consent-docs',
					request,
					response: new Response('page'),
				}),
			pathname: '/api/consent-docs',
			request,
		})) as { response: Response };
		expect(result.response.headers.getSetCookie()[0]).toMatch(
			/^c15t-sid=sub_/u
		);
		expect(result.response.headers.get('cache-control')).toBe('private');
	});
});

// A CDN reads the cache field targeted at it, such as `CDN-Cache-Control`
// (RFC 9213), in place of `Cache-Control`, so `private` there does not keep
// a response out of that CDN.
describe('consentRequestMiddleware: targeted cache fields', () => {
	const serve = async function serve(
		cookie: string | undefined,
		headers: Record<string, string>,
		render: boolean
	) {
		const request = new Request('https://app.example.com/pricing', {
			headers: cookie ? { cookie } : {},
		});
		let rendered: string | undefined;
		const result = (await serverHandlerOf(consentRequestMiddleware())({
			context: {},
			next: async () => {
				if (render) {
					rendered = (await resolveConsent({ request })).initialRecords?.subject
						?.subjectId;
				}
				return {
					context: {},
					pathname: '/pricing',
					request,
					response: new Response(`<html>${rendered ?? ''}</html>`, {
						headers,
					}),
				};
			},
			pathname: '/pricing',
			request,
		})) as { response: Response };
		return { rendered, response: result.response };
	};

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
			const { rendered, response } = await serve(
				'c15t-sid=sub_returning',
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

	test('a new visitor render keeps no targeted cache field and gets its cookie', async () => {
		const { rendered, response } = await serve(
			undefined,
			{ 'cache-control': 'private', 'cdn-cache-control': 'max-age=60' },
			true
		);
		expect(response.headers.get('cdn-cache-control')).toBeNull();
		expect(response.headers.get('cache-control')).toBe('private');
		expect(response.headers.getSetCookie()[0]).toContain(
			`c15t-sid=${rendered};`
		);
	});

	test.each([
		[{ 'cache-control': 'no-store', 'cdn-cache-control': 'max-age=60' }],
		[
			{
				'cache-control': 'private',
				'cdn-cache-control': 'public, s-maxage=60',
			},
		],
		[{ 'cdn-cache-control': 'max-age=60' }],
	])(
		'a response with no visitor render and %o is shared: no cookie, headers kept',
		async (headers) => {
			const { response } = await serve(undefined, headers, false);
			expect(response.headers.getSetCookie()).toEqual([]);
			for (const [name, value] of Object.entries(headers)) {
				expect(response.headers.get(name)).toBe(value);
			}
		}
	);

	test('a response with no visitor render and any Surrogate-Control is shared: no cookie', async () => {
		const { response } = await serve(
			undefined,
			{ 'cache-control': 'no-store', 'surrogate-control': 'no-store' },
			false
		);
		expect(response.headers.getSetCookie()).toEqual([]);
		expect(response.headers.get('surrogate-control')).toBe('no-store');
	});

	test.each(['cdn-cache-control', 'vercel-cdn-cache-control'])(
		'a response with no visitor render whose %s is private gets the cookie',
		async (field) => {
			const { response } = await serve(
				undefined,
				{ 'cache-control': 'no-store', [field]: 'private' },
				false
			);
			expect(response.headers.getSetCookie()[0]).toMatch(/^c15t-sid=sub_/u);
			expect(response.headers.get(field)).toBe('private');
		}
	);

	test('a response with no visitor render whose targeted field is private gets the cookie', async () => {
		const { response } = await serve(
			undefined,
			{ 'cache-control': 'no-store', 'cdn-cache-control': 'private' },
			false
		);
		expect(response.headers.getSetCookie()[0]).toMatch(/^c15t-sid=sub_/u);
		expect(response.headers.get('cache-control')).toBe('no-store');
		expect(response.headers.get('cdn-cache-control')).toBe('private');
	});
});
