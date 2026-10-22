import { describe, expect, test } from 'vitest';

import { readRequestConsent } from '../request-consent';
import { resolveRequestSubject } from '../request-subject';

const NOW = 1_780_000_000_000;
const RECORDED = `c15t=c.necessary:1,c.marketing:1,i.t:${NOW - 1000},i.sid:sub_recorded`;

const resolve = function resolve(
	cookie: string | undefined,
	extra: Parameters<typeof resolveRequestSubject>[0] = { request: {} }
) {
	return resolveRequestSubject({
		now: NOW,
		...extra,
		request: {
			headers: new Headers(cookie ? { cookie } : {}),
			url: 'https://app.example.com/pricing',
			...extra.request,
		},
	});
};

describe('resolveRequestSubject', () => {
	test('a first visit gets a new ID and the cookie that keeps it', () => {
		const subject = resolve('theme=dark');
		expect(subject?.subjectId).toMatch(/^sub_/u);
		expect(subject?.setCookie).toMatchObject({
			httpOnly: false,
			maxAge: 365 * 86_400,
			name: 'c15t-sid',
			path: '/',
			sameSite: 'lax',
			secure: true,
			value: subject?.subjectId,
		});
		expect(subject?.setCookie?.domain).toBeUndefined();
		expect(subject?.setCookie?.header).toBe(
			`c15t-sid=${subject?.subjectId}; Max-Age=31536000; Path=/; Secure; SameSite=Lax`
		);
		expect(subject?.cookie).toBe(`theme=dark; c15t-sid=${subject?.subjectId}`);
	});

	test('the render in the same request reads the new ID, and still shows the banner', () => {
		const subject = resolve(undefined);
		const { state } = readRequestConsent({
			adapter: '@c15t/test',
			now: NOW,
			request: { cookie: subject?.cookie, headers: new Headers() },
		});
		expect(state.initialRecords?.subject?.subjectId).toBe(subject?.subjectId);
		expect(state.initialRecords?.choice).toBeNull();
	});

	test('a returning visitor keeps their ID and gets no new cookie', () => {
		const first = resolve(undefined);
		const second = resolve(first?.cookie);
		expect(second).toEqual({
			cookie: first?.cookie,
			setCookie: null,
			subjectId: first?.subjectId,
		});
	});

	test('the ID the stored choice carries is stored when no subject cookie exists', () => {
		const subject = resolve(RECORDED);
		expect(subject?.subjectId).toBe('sub_recorded');
		expect(subject?.setCookie?.value).toBe('sub_recorded');
		expect(subject?.cookie).toBe(`${RECORDED}; c15t-sid=sub_recorded`);
	});

	// A record cookie can be stale after the browser dropped its rewrite,
	// while `c15t-sid` already holds the newer ID. Only the browser can
	// tell, so the server renders the records' ID and leaves the cookie.
	test('the ID the stored choice carries never replaces the subject cookie', () => {
		const cookie = `c15t-sid=sub_other; ${RECORDED}`;
		const subject = resolve(cookie);
		expect(subject).toEqual({
			cookie,
			setCookie: null,
			subjectId: 'sub_recorded',
		});
	});

	test('a shared render or a speculative request gets no subject', () => {
		expect(resolve(undefined, { request: {}, shared: true })).toBeNull();
		const speculative: Record<string, string>[] = [
			{ 'sec-purpose': 'prefetch' },
			{ purpose: 'prefetch' },
			{ 'sec-purpose': 'prefetch;prerender' },
			{ 'next-router-prefetch': '1' },
		];
		for (const headers of speculative) {
			expect(
				resolve(undefined, { request: { headers: new Headers(headers) } })
			).toBeNull();
		}
	});

	// A Headers implementation from a polyfill or another realm, such as an
	// edge runtime shim: not an instance of this realm's Headers, and with
	// no enumerable entries.
	class OtherHeaders {
		readonly #values = new Map<string, string>();

		constructor(init: Record<string, string>) {
			for (const [name, value] of Object.entries(init)) {
				this.#values.set(name.toLowerCase(), value);
			}
		}

		get(name: string): string | null {
			return this.#values.get(name.toLowerCase()) ?? null;
		}

		has(name: string): boolean {
			return this.#values.has(name.toLowerCase());
		}
	}
	const other = (init: Record<string, string>) =>
		new OtherHeaders(init) as unknown as Headers;

	test.each<Record<string, string>>([
		{ 'sec-purpose': 'prefetch' },
		{ purpose: 'prefetch' },
		{ 'next-router-prefetch': '1' },
	])(
		'a speculative request with another Headers implementation gets no subject: %o',
		(headers) => {
			expect(
				resolve(undefined, { request: { headers: other(headers) } })
			).toBeNull();
		}
	);

	test('another Headers implementation keeps the visitor ID and the request host', () => {
		expect(
			resolveRequestSubject({
				now: NOW,
				request: { headers: other({ cookie: 'c15t-sid=sub_existing' }) },
			})
		).toEqual({
			cookie: 'c15t-sid=sub_existing',
			setCookie: null,
			subjectId: 'sub_existing',
		});
		const first = resolveRequestSubject({
			request: { headers: other({ host: 'app.example.com' }) },
			storage: { crossSubdomain: true },
		});
		expect(first?.setCookie).toMatchObject({
			domain: '.example.com',
			secure: true,
			value: first?.subjectId,
		});
	});

	test('the cookie follows the storage configuration the browser uses', () => {
		const custom = resolve(undefined, {
			request: { url: 'http://app.example.com/' },
			storage: { defaultExpiryDays: 30, storageKey: 'consent' },
		});
		expect(custom?.setCookie).toMatchObject({
			maxAge: 30 * 86_400,
			name: 'consent-sid',
			secure: false,
		});
		expect(
			resolve(undefined, { request: {}, storage: { crossSubdomain: true } })
				?.setCookie?.domain
		).toBe('.example.com');
		expect(
			resolve(undefined, {
				request: {},
				storage: { crossSubdomain: true, defaultDomain: '.example.org' },
			})?.setCookie?.header
		).toContain('; Domain=.example.com;');
		expect(
			resolve(undefined, {
				request: {},
				storage: { defaultDomain: '.example.org' },
			})?.setCookie?.header
		).toContain('; Domain=.example.org;');
	});

	test('a Node header record works, and forwarded headers count only when trusted', () => {
		const headers = {
			host: 'internal:3000',
			'x-forwarded-host': 'app.example.com',
			'x-forwarded-proto': 'https',
		};
		const untrusted = resolveRequestSubject({ request: { headers } });
		expect(untrusted?.setCookie?.secure).toBe(false);
		const trusted = resolveRequestSubject({
			request: { headers },
			storage: { crossSubdomain: true },
			trustForwardedHeaders: true,
		});
		expect(trusted?.setCookie).toMatchObject({
			domain: '.example.com',
			secure: true,
		});
	});

	// Header names are case-insensitive, and some runtimes keep the casing
	// the client sent.
	test.each(['Cookie', 'COOKIE', 'cOoKiE'])(
		'a Node header record with a %s header keeps the visitor ID',
		(name) => {
			const existing = resolveRequestSubject({
				now: NOW,
				request: {
					headers: { [name]: ['theme=dark', 'c15t-sid=sub_existing'] },
				},
			});
			expect(existing).toEqual({
				cookie: 'theme=dark; c15t-sid=sub_existing',
				setCookie: null,
				subjectId: 'sub_existing',
			});
			const { state } = readRequestConsent({
				adapter: '@c15t/test',
				now: NOW,
				request: { cookie: existing?.cookie, headers: new Headers() },
			});
			expect(state.initialRecords?.subject?.subjectId).toBe('sub_existing');
			expect(state.initialRecords?.choice).toBeNull();

			const recorded = resolveRequestSubject({
				now: NOW,
				request: { headers: { [name]: `c15t-sid=sub_other; ${RECORDED}` } },
			});
			expect(recorded).toEqual({
				cookie: `c15t-sid=sub_other; ${RECORDED}`,
				setCookie: null,
				subjectId: 'sub_recorded',
			});
		}
	);

	test.each(['Host', 'HOST'])(
		'the subject cookie reads a %s header from a Node header record',
		(name) => {
			const subject = resolveRequestSubject({
				request: { headers: { [name]: 'app.example.com' } },
				storage: { crossSubdomain: true },
			});
			expect(subject?.setCookie).toMatchObject({
				domain: '.example.com',
				secure: true,
			});
		}
	);

	// A URL host may contain `;`, so a host the request names could add
	// cookie attributes through the derived `Domain`.
	test.each([
		['a Host header', { headers: { host: 'a.b;samesite=none' } }, false],
		[
			'a trusted forwarded host',
			{
				headers: {
					host: 'app.example.com',
					'x-forwarded-host': 'a.b;domain=evil.example',
				},
			},
			true,
		],
		['the request URL', { url: 'https://a.b;samesite=none/' }, false],
	] as const)(
		'%s with a cookie attribute in it gets a host-only cookie',
		(_, request, trustForwardedHeaders) => {
			const subject = resolveRequestSubject({
				request,
				storage: { crossSubdomain: true },
				trustForwardedHeaders,
			});
			expect(subject?.setCookie?.domain).toBeUndefined();
			expect(subject?.setCookie?.header).toBe(
				`c15t-sid=${subject?.subjectId}; Max-Age=31536000; Path=/; Secure; SameSite=Lax`
			);
		}
	);

	test.each([
		['app.example.com', '.example.com'],
		['APP.Example.COM', '.example.com'],
		['shop.bücher.example', '.xn--bcher-kva.example'],
		['localhost:3000', 'localhost'],
		['127.0.0.1:8080', '127.0.0.1'],
		['[::1]:3000', '[::1]'],
	])('crossSubdomain on host %s sets Domain=%s', (host, domain) => {
		const subject = resolveRequestSubject({
			request: { headers: { host } },
			storage: { crossSubdomain: true },
		});
		expect(subject?.setCookie?.domain).toBe(domain);
		expect(subject?.setCookie?.header).toContain(`; Domain=${domain};`);
	});

	test('a configured defaultDomain is kept whatever the host says', () => {
		const subject = resolveRequestSubject({
			request: { headers: { host: 'a.b;samesite=none' } },
			storage: { defaultDomain: '.example.org' },
		});
		expect(subject?.setCookie?.domain).toBe('.example.org');
		expect(subject?.setCookie?.header).toContain('; Domain=.example.org;');
	});
});
