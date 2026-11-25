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
	// The ID is stored only with a record, so a visitor who has not chosen
	// anything has none on the server, and no cookie is made for them.
	test('a first visit gets no ID and no cookie', () => {
		expect(resolve(undefined)).toBeNull();
		expect(resolve('theme=dark')).toBeNull();
	});

	test('a c15t 3.2 subject cookie on its own is not an ID', () => {
		expect(resolve('theme=dark; c15t-sid=sub_legacy')).toBeNull();
		expect(
			readRequestConsent({
				adapter: '@c15t/test',
				now: NOW,
				request: {
					cookie: 'c15t-sid=sub_legacy',
					headers: new Headers(),
				},
			}).state.initialRecords?.subject ?? null
		).toBeNull();
	});

	test('a returning visitor gets the ID their records carry, and the cookie header unchanged', () => {
		const cookie = `c15t-sid=sub_legacy; ${RECORDED}`;
		expect(resolve(cookie)).toEqual({
			cookie,
			setCookie: null,
			subjectId: 'sub_recorded',
		});
	});

	test('a custom storage key reads the records under that key', () => {
		const cookie = RECORDED.replace(/^c15t=/u, 'custom=');
		expect(resolve(cookie)).toBeNull();
		expect(
			resolve(cookie, { request: {}, storage: { storageKey: 'custom' } })
				?.subjectId
		).toBe('sub_recorded');
	});

	test.each(['Cookie', 'COOKIE', 'cOoKiE'])(
		'a Node header record with a %s header is read',
		(name) => {
			expect(
				resolveRequestSubject({
					now: NOW,
					request: { headers: { [name]: ['theme=dark', RECORDED] } },
				})
			).toEqual({
				cookie: `theme=dark; ${RECORDED}`,
				setCookie: null,
				subjectId: 'sub_recorded',
			});
		}
	);

	test('a shared render or a speculative request gets no subject', () => {
		expect(resolve(RECORDED, { request: {}, shared: true })).toBeNull();
		const speculative: Record<string, string>[] = [
			{ 'sec-purpose': 'prefetch' },
			{ purpose: 'prefetch' },
			{ 'sec-purpose': 'prefetch;prerender' },
			{ 'next-router-prefetch': '1' },
		];
		for (const headers of speculative) {
			expect(
				resolve(undefined, {
					request: { headers: new Headers({ ...headers, cookie: RECORDED }) },
				})
			).toBeNull();
		}
	});
});
