import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchMock } from '../../../../vitest.setup';
import {
	type ConsentManagerInterface,
	configureConsentManager,
} from '../../../client/client-factory';
import { API_ENDPOINTS } from '../../../client/types';
import { createConsentManagerStore } from '../../../store';
import { STORAGE_KEY_V2 } from '../../../store/initial-state';
import {
	getConsentFromStorage,
	getCookie,
	saveConsentToStorage,
	setCookie,
} from '..';

// Written by c15t@3.2.2 after saving { measurement: true, marketing: false }.
const SUBJECT_ID = 'sub_111CtJne1yzZBEJZYfBn3a4KTP';
const CONFIRMED_AT = 1_793_652_799_094;
const V3_FINGERPRINT =
	'145fd951c0967e210d905acf5859a93cd03095c0291816b9c424d740048b7a47';
const V3_COOKIE = `v=3&sid=${SUBJECT_ID}&b=c${V3_FINGERPRINT}&me=1.${CONFIRMED_AT}.0&mk=0.${CONFIRMED_AT}.0`;
const V3_LOCAL_STORAGE = JSON.stringify({
	version: 3,
	subject: { subjectId: SUBJECT_ID },
	categories: {
		measurement: {
			basis: { fingerprint: V3_FINGERPRINT, kind: 'choice-v1' },
			confirmedAt: CONFIRMED_AT,
			value: true,
		},
		marketing: {
			basis: { fingerprint: V3_FINGERPRINT, kind: 'choice-v1' },
			confirmedAt: CONFIRMED_AT,
			value: false,
		},
	},
});

const EXPECTED = {
	consents: {
		experience: false,
		functionality: false,
		marketing: false,
		measurement: true,
		necessary: true,
	},
	consentInfo: { readFromV3: true, subjectId: SUBJECT_ID, time: CONFIRMED_AT },
};

const createMockConsentManager = (): ConsentManagerInterface => ({
	showConsentBanner: vi.fn(),
	setConsent: vi.fn(),
	verifyConsent: vi.fn(),
	identifyUser: vi.fn(),
	$fetch: vi.fn(),
});

describe('reading consent stored by c15t v3', () => {
	beforeEach(() => {
		document.cookie = '';
		window.localStorage.clear();
	});

	afterEach(() => {
		document.cookie = '';
		window.localStorage.clear();
	});

	it('reads the v3 cookie as a v2 record', () => {
		setCookie(STORAGE_KEY_V2, V3_COOKIE);

		expect(getConsentFromStorage()).toEqual(EXPECTED);
	});

	it('reads v3 localStorage JSON as a v2 record', () => {
		window.localStorage.setItem(STORAGE_KEY_V2, V3_LOCAL_STORAGE);

		expect(getConsentFromStorage()).toEqual(EXPECTED);
	});

	it('leaves the v3 records in place when reading them', () => {
		setCookie(STORAGE_KEY_V2, V3_COOKIE);
		window.localStorage.setItem(STORAGE_KEY_V2, V3_LOCAL_STORAGE);

		getConsentFromStorage();

		expect(getCookie(STORAGE_KEY_V2)).toBe(V3_COOKIE);
		expect(window.localStorage.getItem(STORAGE_KEY_V2)).toBe(V3_LOCAL_STORAGE);
	});

	it('starts the store with the v3 choice, so has() works', () => {
		setCookie(STORAGE_KEY_V2, V3_COOKIE);
		// The store's iframe blocker scans and watches the page on creation.
		vi.stubGlobal('document', { ...document, querySelectorAll: () => [] });
		vi.stubGlobal(
			'MutationObserver',
			class {
				disconnect() {}
				observe() {}
			}
		);

		const store = createConsentManagerStore(createMockConsentManager());

		expect(store.getState().consents).toEqual(EXPECTED.consents);
		expect(store.getState().consentInfo?.subjectId).toBe(SUBJECT_ID);
		expect(store.getState().has('measurement')).toBe(true);
		expect(store.getState().has('marketing')).toBe(false);
	});

	it('links options.user on load without rewriting the v3 record', async () => {
		setCookie(STORAGE_KEY_V2, V3_COOKIE);
		window.localStorage.setItem(STORAGE_KEY_V2, V3_LOCAL_STORAGE);
		vi.stubGlobal('document', { ...document, querySelectorAll: () => [] });
		vi.stubGlobal(
			'MutationObserver',
			class {
				disconnect() {}
				observe() {}
			}
		);
		fetchMock.mockImplementation((url: string) =>
			String(url).includes(API_ENDPOINTS.PATCH_SUBJECT)
				? Promise.resolve(new Response('{}', { status: 200 }))
				: Promise.reject(new Error('offline'))
		);

		createConsentManagerStore(
			configureConsentManager({ mode: 'hosted', backendURL: '/api/c15t' }),
			{ user: { id: 'user_1', identityProvider: 'clerk' } }
		);
		await vi.waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining(`${API_ENDPOINTS.PATCH_SUBJECT}/${SUBJECT_ID}`),
				expect.objectContaining({ method: 'PATCH' })
			)
		);

		expect(getCookie(STORAGE_KEY_V2)).toBe(V3_COOKIE);
		expect(window.localStorage.getItem(STORAGE_KEY_V2)).toBe(V3_LOCAL_STORAGE);
	});

	it('keeps the subject ID when v2 saves over a v3 record', () => {
		setCookie(STORAGE_KEY_V2, V3_COOKIE);
		const stored = getConsentFromStorage<typeof EXPECTED>();
		if (!stored) {
			throw new Error('expected the v3 record to be read');
		}

		saveConsentToStorage({
			consents: { ...stored.consents, marketing: true },
			consentInfo: { ...stored.consentInfo, time: CONFIRMED_AT + 1 },
		});

		const cookie =
			document.cookie.split(`${STORAGE_KEY_V2}=`)[1]?.split(';')[0] ?? '';
		expect(cookie).toContain('c.marketing:1');
		expect(cookie).toContain(`i.sid:${SUBJECT_ID}`);
		expect(cookie).not.toContain('v=3');
		expect(cookie).not.toContain('readFromV3');
		expect(getConsentFromStorage()).toEqual({
			consents: { ...EXPECTED.consents, marketing: true },
			consentInfo: { subjectId: SUBJECT_ID, time: CONFIRMED_AT + 1 },
		});
	});

	it('uses the latest decision time and denies undecided categories', () => {
		setCookie(
			STORAGE_KEY_V2,
			'v=3&sid=sub_a&b=cfp&fn=1.1000.0&ex=1.3000.0&me=0.2000.0'
		);

		expect(getConsentFromStorage()).toEqual({
			consents: {
				experience: true,
				functionality: true,
				marketing: false,
				measurement: false,
				necessary: true,
			},
			consentInfo: { readFromV3: true, subjectId: 'sub_a', time: 3000 },
		});
	});

	it('drops decisions confirmed before the clear epoch', () => {
		setCookie(STORAGE_KEY_V2, 'v=3&e=2000&b=cfp&fn=1.1000.0&me=1.3000.0');

		expect(getConsentFromStorage()).toMatchObject({
			consents: { functionality: false, measurement: true },
			consentInfo: { time: 3000 },
		});
	});

	it('reads no consent when every decision predates the clear epoch', () => {
		setCookie(STORAGE_KEY_V2, 'v=3&e=2000&b=cfp&fn=1.1000.0');

		expect(getConsentFromStorage()).toBeNull();
	});

	it('keeps the v2 policy fingerprint of choices v3 carried over from v2', () => {
		setCookie(STORAGE_KEY_V2, 'v=3&b=lmpf1&fn=1.1000.0&me=0.1000.0');

		expect(getConsentFromStorage()).toMatchObject({
			consentInfo: { materialPolicyFingerprint: 'mpf1' },
		});
	});

	it('does not pass the v3 policy fingerprint to v2', () => {
		setCookie(STORAGE_KEY_V2, V3_COOKIE);

		const stored = getConsentFromStorage<typeof EXPECTED>();

		expect(stored?.consentInfo).not.toHaveProperty('materialPolicyFingerprint');
	});

	it('checks v2 choices v3 kept next to its own decisions', () => {
		setCookie(STORAGE_KEY_V2, 'v=3&b=cfp|lmpf1&fn=1.1000.0&mk=1.900.1');

		expect(getConsentFromStorage()).toMatchObject({
			consentInfo: { materialPolicyFingerprint: 'mpf1' },
		});
	});

	// An older v2 release merged a v3 localStorage record into the v2 record it
	// saved, keeping the v3 fields next to the visitor's newer v2 choice.
	it.each([
		['localStorage', 'local'],
		['cookie', 'cookie'],
	])('reads a v2 record that kept v3 fields from %s as v2', (_name, where) => {
		const record = {
			...JSON.parse(V3_LOCAL_STORAGE),
			consents: { ...EXPECTED.consents, measurement: false },
			consentInfo: { subjectId: SUBJECT_ID, time: CONFIRMED_AT + 1 },
		};
		if (where === 'cookie') {
			setCookie(STORAGE_KEY_V2, record);
		} else {
			window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(record));
		}

		expect(getConsentFromStorage()).toMatchObject({
			consents: { measurement: false },
			consentInfo: { subjectId: SUBJECT_ID, time: CONFIRMED_AT + 1 },
		});
	});

	it('reads identity and IAB custom vendor maps', () => {
		window.localStorage.setItem(
			STORAGE_KEY_V2,
			JSON.stringify({
				version: 3,
				subject: {
					subjectId: 'sub_a',
					externalId: 'user_1',
					identityProvider: 'clerk',
				},
				categories: {
					marketing: {
						basis: { kind: 'choice-v1', fingerprint: 'fp' },
						confirmedAt: 1000,
						value: true,
					},
				},
				iab: {
					customVendorConsents: { vendor_a: true, vendor_b: false },
					customVendorLegitimateInterests: { vendor_a: false },
				},
			})
		);

		expect(getConsentFromStorage()).toMatchObject({
			consentInfo: {
				externalId: 'user_1',
				identityProvider: 'clerk',
				subjectId: 'sub_a',
			},
			iabCustomVendorConsents: { vendor_a: true, vendor_b: false },
			iabCustomVendorLegitimateInterests: { vendor_a: false },
		});
	});

	it('reads the compact IAB custom vendor maps', () => {
		setCookie(
			STORAGE_KEY_V2,
			'v=3&b=cfp&mk=1.1000.0&icv=0.vendor_b|1.vendor%2Fa&icvli=0.vendor_a'
		);

		expect(getConsentFromStorage()).toMatchObject({
			iabCustomVendorConsents: { 'vendor/a': true, vendor_b: false },
			iabCustomVendorLegitimateInterests: { vendor_a: false },
		});
	});

	it.each([
		['a compact record from a later version', 'cookie', 'v=4&fn=1.1000.0'],
		['a plain string', 'cookie', 'not-a-record'],
		['a JSON record from a later version', 'local', '{"version":4}'],
		['a JSON string', 'local', '"not-a-record"'],
	])('reads %s as no consent', (_name, where, value) => {
		if (where === 'cookie') {
			setCookie(STORAGE_KEY_V2, value);
		} else {
			window.localStorage.setItem(STORAGE_KEY_V2, value);
		}

		expect(getConsentFromStorage()).toBeNull();
	});
});
