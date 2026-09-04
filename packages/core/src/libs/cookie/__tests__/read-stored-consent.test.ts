/**
 * `readStoredConsent` is the hydration read path. It must never write:
 * no legacy-key migration, no cookie/localStorage mirroring, and no
 * deletion of v1.x records. See c15t/c15t#1025.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { readStoredConsent, setCookie } from '..';
import { STORAGE_KEY, STORAGE_KEY_V2 } from '../../storage-keys';

const SUBJECT_ID = 'sub_2VZxR7YmNpKq3WfLs8TgHd';
const ORIGINAL_TIME = 1_700_000_000_000;

interface StoredConsentRecord {
	consents: Record<string, boolean>;
	consentInfo: {
		subjectId?: string;
		id?: string;
		time: number;
		externalId?: string | null;
	};
}

const stored = function stored(): StoredConsentRecord {
	return {
		consentInfo: { subjectId: SUBJECT_ID, time: ORIGINAL_TIME },
		consents: { marketing: true, necessary: true },
	};
};

describe('readStoredConsent', () => {
	beforeEach(() => {
		document.cookie = '';
		window.localStorage.clear();
	});

	afterEach(() => {
		document.cookie = '';
		window.localStorage.clear();
		vi.restoreAllMocks();
	});

	it('returns null when nothing is stored', () => {
		expect(readStoredConsent()).toBeNull();
	});

	it('reads localStorage without creating a cookie', () => {
		window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(stored()));

		const result = readStoredConsent<StoredConsentRecord>();

		expect(result?.consentInfo).toEqual(stored().consentInfo);
		expect(result?.consents.marketing).toBe(true);
		// Normalized: every known category is an explicit boolean.
		expect(result?.consents.measurement).toBe(false);
		expect(document.cookie).toBe('');
		expect(window.localStorage.getItem(STORAGE_KEY_V2)).toBe(
			JSON.stringify(stored())
		);
	});

	it('prefers the cookie and leaves localStorage alone', () => {
		setCookie(STORAGE_KEY_V2, stored());
		const cookieBefore = document.cookie;

		const result = readStoredConsent<StoredConsentRecord>();

		expect(result?.consentInfo.time).toBe(ORIGINAL_TIME);
		expect(window.localStorage.getItem(STORAGE_KEY_V2)).toBeNull();
		expect(document.cookie).toBe(cookieBefore);
	});

	it('reads the legacy localStorage key without migrating it', () => {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored()));

		const result = readStoredConsent<StoredConsentRecord>();

		expect(result?.consentInfo.time).toBe(ORIGINAL_TIME);
		expect(window.localStorage.getItem(STORAGE_KEY)).toBe(
			JSON.stringify(stored())
		);
		expect(window.localStorage.getItem(STORAGE_KEY_V2)).toBeNull();
		expect(document.cookie).toBe('');
	});

	it('honours a custom storage key', () => {
		window.localStorage.setItem('custom-key', JSON.stringify(stored()));

		expect(readStoredConsent()).toBeNull();
		expect(
			readStoredConsent<StoredConsentRecord>({ storageKey: 'custom-key' })
				?.consentInfo.time
		).toBe(ORIGINAL_TIME);
	});

	it('treats a v1.x record as no consent but does not delete it', () => {
		const legacy = JSON.stringify({
			consentInfo: { id: 'server-id', time: ORIGINAL_TIME },
			consents: { necessary: true },
		});
		window.localStorage.setItem(STORAGE_KEY_V2, legacy);

		expect(readStoredConsent()).toBeNull();
		expect(window.localStorage.getItem(STORAGE_KEY_V2)).toBe(legacy);
	});

	it('drops nullish subject identifiers from the result', () => {
		const payload = stored();
		payload.consentInfo.externalId = null;
		window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(payload));

		const result = readStoredConsent<StoredConsentRecord>();

		expect(result?.consentInfo).not.toHaveProperty('externalId');
	});
});
