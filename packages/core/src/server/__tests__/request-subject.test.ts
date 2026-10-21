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

	test('the ID the stored choice carries wins over the subject cookie', () => {
		const subject = resolve(`c15t-sid=sub_other; ${RECORDED}`);
		expect(subject?.subjectId).toBe('sub_recorded');
		expect(subject?.setCookie?.value).toBe('sub_recorded');
		expect(subject?.cookie).toBe(`${RECORDED}; c15t-sid=sub_recorded`);
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
});
