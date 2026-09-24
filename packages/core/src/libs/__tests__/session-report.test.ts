import { createConsentManifestPolicyPack } from '@c15t/schema/types';
import type { ConsentManifest } from '@c15t/schema/types';
import { describe, expect, test, vi } from 'vitest';

import { createManifestTransport } from '../../transports/manifest';
import {
	buildConsentSessionReport,
	forwardSessionReportHeaders,
	isSpeculativeRequest,
	reportConsentSession,
	resolveSessionReportBackendURL,
} from '../session-report';

const manifest: ConsentManifest = {
	branding: 'c15t',
	policyPacks: [
		createConsentManifestPolicyPack({
			categories: ['marketing'],
			id: 'eu-opt-in',
			match: { countries: ['DE'], fallback: true },
			model: 'opt-in',
			prompt: 'choice',
			scopeMode: 'strict',
			validity: { choiceDays: 365 },
		}),
	],
	revision: 'rev-1',
	schemaVersion: 2,
	tenantId: 'tenant_1',
	translations: {
		i18n: {
			defaultProfile: 'default',
			messages: {
				default: {
					fallbackLanguage: 'en',
					translations: { en: { common: { acceptAll: 'Accept all' } } },
				},
			},
		},
	},
};

const resolveInit = async (
	overrides: { country?: string; gpc?: boolean } = {}
) => {
	const transport = createManifestTransport({
		backendURL: 'https://consent.example.com',
		manifest,
	});
	const response = await transport.init({
		overrides: { country: 'DE', language: 'de', ...overrides },
		user: null,
	});
	return response;
};

const readBody = (call: unknown[] | undefined) => {
	if (!call) {
		throw new Error('expected a fetch call');
	}
	return JSON.parse((call[1] as RequestInit).body as string) as Record<
		string,
		unknown
	>;
};

describe('buildConsentSessionReport', () => {
	test('describes a matched resolution and the inputs it ran on', async () => {
		const init = await resolveInit();
		const report = buildConsentSessionReport({
			adapter: '@c15t/nextjs',
			init: init as never,
			inputs: { country: 'DE', gpc: true, region: null },
			manifest,
			source: 'route',
		});
		expect(report).toMatchObject({
			adapter: '@c15t/nextjs',
			country: 'DE',
			gpc: true,
			language: 'en',
			policy: { id: 'eu-opt-in', matchedBy: 'country', model: 'opt-in' },
			region: null,
			resolution: 'matched',
			revision: 'rev-1',
			source: 'route',
			tenantId: 'tenant_1',
		});
		expect(typeof report.policy?.fingerprint).toBe('string');
	});

	test('records no policy when nothing matched', () => {
		const report = buildConsentSessionReport({
			init: {
				jurisdiction: 'NONE',
				policyResolution: { policy: null, status: 'no-match', version: 1 },
				translations: { language: 'en' },
			} as never,
			manifest: { revision: 'rev-1' },
			source: 'render',
		});
		expect(report.policy).toBeNull();
		expect(report.resolution).toBe('no-match');
		expect(report.gpc).toBe(false);
		expect(Object.hasOwn(report, 'tenantId')).toBe(false);
	});
});

describe('resolveSessionReportBackendURL', () => {
	test('accepts only an explicit absolute backend', () => {
		expect(
			resolveSessionReportBackendURL({
				backendURL: 'https://consent.example.com/',
			})
		).toBe('https://consent.example.com');
		// A relative URL cannot be fetched from a server, and the app's own
		// proxy route would count the visitor twice on the way through.
		expect(resolveSessionReportBackendURL({ backendURL: '/api/c15t' })).toBe(
			undefined
		);
		expect(resolveSessionReportBackendURL({})).toBe(undefined);
	});
});

describe('forwardSessionReportHeaders', () => {
	test('ignores a caller-supplied x-c15t-client-ip', () => {
		// A visitor can send the report header to a public init route, so the
		// address always comes from the proxy chain.
		expect(
			forwardSessionReportHeaders(
				new Headers({
					'x-c15t-client-ip': '198.51.100.7',
					'x-forwarded-for': '203.0.113.42',
				})
			)
		).toEqual({ 'x-c15t-client-ip': '203.0.113.42' });
	});

	test('derives the client IP from the proxy chain and copies the user agent, never cookies', () => {
		const forwarded = forwardSessionReportHeaders(
			new Headers({
				cookie: 'session=secret',
				'user-agent': 'Mozilla/5.0',
				'x-forwarded-for': '203.0.113.42, 10.0.0.1',
			})
		);
		expect(forwarded).toEqual({
			'user-agent': 'Mozilla/5.0',
			'x-c15t-client-ip': '203.0.113.42',
		});
	});

	test('reads a Node-style header record regardless of casing', () => {
		expect(
			forwardSessionReportHeaders({
				Cookie: 'a=b',
				'User-Agent': ['UA'],
				'X-Forwarded-For': '203.0.113.42',
			})
		).toEqual({ 'user-agent': 'UA', 'x-c15t-client-ip': '203.0.113.42' });
	});
});

describe('reportConsentSession', () => {
	test('posts the report with the visitor headers and the protocol headers', async () => {
		const init = await resolveInit();
		const fetchSpy = vi
			.fn()
			.mockResolvedValue(new Response(null, { status: 204 }));
		const registered: Promise<void>[] = [];

		await reportConsentSession({
			adapter: '@c15t/svelte',
			backendURL: 'https://consent.example.com',
			fetch: fetchSpy,
			headers: new Headers({
				cookie: 'c15t=secret',
				'user-agent': 'UA',
				'x-forwarded-for': '203.0.113.42',
			}),
			init: init as never,
			inputs: { country: 'DE', gpc: false },
			manifest,
			source: 'route',
			waitUntil: (task) => {
				registered.push(task);
			},
		});

		expect(registered).toHaveLength(1);
		const [url, request] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(url).toBe('https://consent.example.com/sessions');
		expect(request.method).toBe('POST');
		const headers = request.headers as Record<string, string>;
		expect(headers['content-type']).toBe('application/json');
		expect(headers['x-c15t-client-ip']).toBe('203.0.113.42');
		expect(headers['user-agent']).toBe('UA');
		expect(headers).not.toHaveProperty('cookie');
		expect(typeof headers['x-c15t-version']).toBe('string');
		expect(readBody(fetchSpy.mock.calls[0])).toMatchObject({
			adapter: '@c15t/svelte',
			country: 'DE',
			revision: 'rev-1',
			source: 'route',
		});
	});

	test('never rejects, and never fetches without an absolute backend', async () => {
		const init = await resolveInit();
		const failing = vi.fn().mockRejectedValue(new Error('backend down'));
		await expect(
			reportConsentSession({
				backendURL: 'https://consent.example.com',
				fetch: failing,
				init: init as never,
				manifest,
				source: 'render',
			})
		).resolves.toBeUndefined();
		expect(failing).toHaveBeenCalledTimes(1);

		const unused = vi.fn();
		await reportConsentSession({
			backendURL: '/api/c15t',
			fetch: unused,
			init: init as never,
			manifest,
			source: 'render',
		});
		expect(unused).not.toHaveBeenCalled();
	});
});

describe('isSpeculativeRequest', () => {
	test('recognises prefetch and prerender signals from browsers, CDNs and Next', () => {
		const speculative: Record<string, string>[] = [
			{ 'sec-purpose': 'prefetch' },
			{ 'sec-purpose': 'prefetch;prerender' },
			{ purpose: 'prefetch' },
			{ 'x-moz': 'prefetch' },
			{ 'next-router-prefetch': '1' },
		];
		for (const headers of speculative) {
			expect(isSpeculativeRequest(new Headers(headers))).toBe(true);
		}
		expect(isSpeculativeRequest(new Headers({ accept: 'text/html' }))).toBe(
			false
		);
		expect(isSpeculativeRequest(undefined)).toBe(false);
	});

	test('a speculative request sends no report', async () => {
		const init = await resolveInit();
		const fetchSpy = vi.fn();
		await reportConsentSession({
			backendURL: 'https://consent.example.com',
			fetch: fetchSpy,
			headers: new Headers({ 'next-router-prefetch': '1' }),
			init: init as never,
			manifest,
			source: 'render',
		});
		expect(fetchSpy).not.toHaveBeenCalled();
	});
});

describe('reportConsentSession lifetime hook', () => {
	test('a throwing waitUntil never reaches the caller', async () => {
		const init = await resolveInit();
		const fetchSpy = vi
			.fn()
			.mockResolvedValue(new Response(null, { status: 204 }));
		await expect(
			reportConsentSession({
				backendURL: 'https://consent.example.com',
				fetch: fetchSpy,
				init: init as never,
				manifest,
				source: 'route',
				waitUntil: () => {
					throw new Error('after() called outside a request scope');
				},
			})
		).resolves.toBeUndefined();
		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});
});

describe('createManifestTransport report option', () => {
	test('never reports to the origin its manifest URL came from', async () => {
		// The transport derives a backend from its manifest URL for saves; a
		// report never uses that, since a manifest may live on a CDN that
		// exists only to hand out public policy data.
		const fetchSpy = vi
			.fn()
			.mockImplementation((url: string) =>
				Promise.resolve(
					url.endsWith('/tenant.json')
						? new Response(JSON.stringify(manifest))
						: new Response(null, { status: 204 })
				)
			);
		const transport = createManifestTransport({
			fetch: fetchSpy,
			manifestURL: 'https://cdn.example.com/tenant.json',
			report: { source: 'render' },
		});
		await transport.init({ overrides: { country: 'DE' }, user: null });
		await new Promise<void>((resolve) => {
			setTimeout(resolve, 0);
		});
		expect(
			fetchSpy.mock.calls.some(([url]) => String(url).includes('/sessions'))
		).toBe(false);
	});

	test('reports after each init with the transport backend and headers', async () => {
		const fetchSpy = vi
			.fn()
			.mockResolvedValue(new Response(null, { status: 204 }));
		const transport = createManifestTransport({
			backendURL: 'https://consent.example.com',
			fetch: fetchSpy,
			headers: { cookie: 'c15t=secret', 'x-forwarded-for': '203.0.113.42' },
			manifest,
			report: { adapter: '@c15t/nextjs', source: 'render' },
		});

		await transport.init({
			overrides: { country: 'DE', gpc: true, language: 'de' },
			user: null,
		});
		// The report is detached; let it land.
		await new Promise<void>((resolve) => {
			setTimeout(resolve, 0);
		});

		const call = fetchSpy.mock.calls.find(
			([url]) => url === 'https://consent.example.com/sessions'
		);
		expect(call).toBeDefined();
		const headers = ((call as unknown[])[1] as RequestInit).headers as Record<
			string,
			string
		>;
		expect(headers['x-c15t-client-ip']).toBe('203.0.113.42');
		expect(headers).not.toHaveProperty('cookie');
		expect(readBody(call)).toMatchObject({
			adapter: '@c15t/nextjs',
			country: 'DE',
			gpc: true,
			policy: { id: 'eu-opt-in' },
			source: 'render',
		});
	});

	test('sends nothing without the option', async () => {
		const fetchSpy = vi.fn();
		const transport = createManifestTransport({
			backendURL: 'https://consent.example.com',
			fetch: fetchSpy,
			manifest,
		});
		await transport.init({ overrides: { country: 'DE' }, user: null });
		expect(fetchSpy).not.toHaveBeenCalled();
	});
});
