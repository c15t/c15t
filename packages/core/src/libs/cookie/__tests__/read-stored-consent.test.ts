/**
 * `readStoredRecords` is the hydration read path. It must never write:
 * no legacy-key migration, no cookie/localStorage mirroring, and no
 * deletion of v1.x records. See c15t/c15t#1025.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setCookie } from '..';
import { readStoredRecords } from '../../../modules/persistence/hydrate';
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

describe('readStoredRecords', () => {
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
		expect(readStoredRecords(undefined, ORIGINAL_TIME + 1).found).toBe(false);
	});

	it('reads localStorage without creating a cookie', () => {
		window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(stored()));

		const result = readStoredRecords(undefined, ORIGINAL_TIME + 1);

		expect(result.records.subject).toEqual({ subjectId: SUBJECT_ID });
		expect(result.records.choice?.categories.marketing?.confirmedAt).toBe(
			ORIGINAL_TIME
		);
		expect(result.records.choice?.categories.marketing?.value).toBe(true);
		// Partial JSON preserves absent category coverage.
		expect(result.records.choice?.categories.measurement).toBeUndefined();
		expect(document.cookie).toBe('');
		expect(window.localStorage.getItem(STORAGE_KEY_V2)).toBe(
			JSON.stringify(stored())
		);
	});

	it('prefers the cookie and leaves localStorage alone', () => {
		setCookie(STORAGE_KEY_V2, stored());
		const cookieBefore = document.cookie;

		const result = readStoredRecords(undefined, ORIGINAL_TIME + 1);

		expect(result.records.choice?.categories.marketing?.confirmedAt).toBe(
			ORIGINAL_TIME
		);
		expect(window.localStorage.getItem(STORAGE_KEY_V2)).toBeNull();
		expect(document.cookie).toBe(cookieBefore);
	});

	it('reads the legacy localStorage key without migrating it', () => {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored()));

		const result = readStoredRecords(undefined, ORIGINAL_TIME + 1);

		expect(result.records.choice?.categories.marketing?.confirmedAt).toBe(
			ORIGINAL_TIME
		);
		expect(window.localStorage.getItem(STORAGE_KEY)).toBe(
			JSON.stringify(stored())
		);
		expect(window.localStorage.getItem(STORAGE_KEY_V2)).toBeNull();
		expect(document.cookie).toBe('');
	});

	it('honours a custom storage key', () => {
		window.localStorage.setItem('custom-key', JSON.stringify(stored()));

		expect(readStoredRecords(undefined, ORIGINAL_TIME + 1).found).toBe(false);
		expect(
			readStoredRecords({ storageKey: 'custom-key' }, ORIGINAL_TIME + 1)
				?.records.choice?.categories.marketing?.confirmedAt
		).toBe(ORIGINAL_TIME);
	});

	it('treats a v1.x record as no consent but does not delete it', () => {
		const legacy = JSON.stringify({
			consentInfo: { id: 'server-id', time: ORIGINAL_TIME },
			consents: { necessary: true },
		});
		window.localStorage.setItem(STORAGE_KEY_V2, legacy);

		expect(readStoredRecords(undefined, ORIGINAL_TIME + 1).found).toBe(false);
		expect(window.localStorage.getItem(STORAGE_KEY_V2)).toBe(legacy);
	});

	it('rejects malformed subject identifiers without salvaging grants', () => {
		const payload = stored();
		payload.consentInfo.externalId = null;
		window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(payload));

		const result = readStoredRecords(undefined, ORIGINAL_TIME + 1);

		expect(result.found).toBe(false);
		expect(result.records.choice).toBeNull();
		expect(window.localStorage.getItem(STORAGE_KEY_V2)).toBe(
			JSON.stringify(payload)
		);
	});
});
