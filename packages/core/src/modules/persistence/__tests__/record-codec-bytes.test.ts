/**
 * Cookie projection size baseline. These numbers are evidence for a
 * later budget decision, not a budget. They lock the encoding: a change
 * that alters the byte count must be deliberate.
 *
 * Bytes are UTF-8 lengths of the value actually stored in
 * `document.cookie` after the real write path (`setCookie` for v2,
 * `writeStoredConsentEnvelope` for v3), without the `c15t=` name or
 * attributes. Neither path adds an outer URI encoding, so the stored
 * value equals the codec string; the tests assert that equality rather
 * than assume it. Fingerprints use 64-character SHA-256 hex, matching
 * `@c15t/schema` policy fingerprints.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { ChoiceBasis } from '../../../consent-record/types';
import {
	flatToString,
	flattenObject,
	getRawCookieValue,
	setCookie,
	shortenFlatKeys,
} from '../../../libs/cookie';
import { STORAGE_KEY_V2 } from '../../../libs/storage-keys';
import {
	encodeStoredConsentEnvelopeCompact,
	encodeStoredConsentEnvelopeJson,
} from '../record-codec';
import type { StoredConsentEnvelope } from '../record-codec';
import { writeStoredConsentEnvelope } from '../record-storage';

const TIME = 1_756_857_600_000;
const SUBJECT_ID = 'sub_2VZxR7YmNpKq3WfLs8TgHd';
const CHOICE_FP =
	'9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';
const LEGACY_FP =
	'2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae';

const NOW = TIME + 86_400_000;

const bytes = function bytes(value: string): number {
	return new TextEncoder().encode(value).length;
};

const v2Compact = function v2Compact(record: Record<string, unknown>): string {
	return flatToString(shortenFlatKeys(flattenObject(record)));
};

/** Bytes of the value the browser actually holds after a v2 write. */
const storedV2Bytes = function storedV2Bytes(
	record: Record<string, unknown>
): number {
	setCookie(STORAGE_KEY_V2, record);
	const stored = getRawCookieValue(STORAGE_KEY_V2);
	expect(stored).toBe(v2Compact(record));
	return bytes(stored ?? '');
};

/** Bytes of the value the browser actually holds after a v3 write. */
const storedV3Bytes = function storedV3Bytes(
	envelope: StoredConsentEnvelope
): number {
	const result = writeStoredConsentEnvelope(envelope, { now: NOW });
	expect(result.ok).toBe(true);
	const stored = getRawCookieValue(STORAGE_KEY_V2);
	expect(stored).toBe(encodeStoredConsentEnvelopeCompact(envelope));
	return bytes(stored ?? '');
};

const choice: ChoiceBasis = { fingerprint: CHOICE_FP, kind: 'choice-v1' };
const legacyWithHash: ChoiceBasis = {
	kind: 'legacy-v2',
	materialFingerprint: LEGACY_FP,
};

const allTrue = {
	experience: true,
	functionality: true,
	marketing: true,
	measurement: true,
	necessary: true,
};
const allFalse = {
	experience: false,
	functionality: false,
	marketing: false,
	measurement: false,
	necessary: true,
};

const v2 = {
	acceptAll: {
		consentInfo: { subjectId: SUBJECT_ID, time: TIME },
		consents: allTrue,
	},
	acceptAllIdentified: {
		consentInfo: {
			externalId: 'user_2NNEqL2nrIRdJ194ndJqAHwEfxC',
			identityProvider: 'clerk',
			materialPolicyFingerprint: LEGACY_FP,
			subjectId: SUBJECT_ID,
			time: TIME,
		},
		consents: allTrue,
	},
	rejectAll: {
		consentInfo: { subjectId: SUBJECT_ID, time: TIME },
		consents: allFalse,
	},
};

const v3Categories = function v3Categories(
	value: boolean,
	basis: ChoiceBasis,
	confirmedAt = TIME
): StoredConsentEnvelope['categories'] {
	return {
		experience: { basis, confirmedAt, value },
		functionality: { basis, confirmedAt, value },
		marketing: { basis, confirmedAt, value },
		measurement: { basis, confirmedAt, value },
	};
};

const v3: Record<string, StoredConsentEnvelope> = {
	acceptAll: {
		categories: v3Categories(true, choice),
		subject: { subjectId: SUBJECT_ID },
		version: 3,
	},
	acceptAllIdentified: {
		categories: v3Categories(true, choice),
		subject: {
			externalId: 'user_2NNEqL2nrIRdJ194ndJqAHwEfxC',
			identityProvider: 'clerk',
			subjectId: SUBJECT_ID,
		},
		version: 3,
	},
	migratedLegacyNoHash: {
		categories: v3Categories(true, { kind: 'legacy-v2' }),
		subject: { subjectId: SUBJECT_ID },
		version: 3,
	},
	mixedLegacyAndCurrent: {
		categories: {
			experience: {
				basis: legacyWithHash,
				confirmedAt: TIME - 40 * 86_400_000,
				value: false,
			},
			functionality: {
				basis: legacyWithHash,
				confirmedAt: TIME - 40 * 86_400_000,
				value: true,
			},
			marketing: { basis: choice, confirmedAt: TIME, value: true },
			measurement: {
				basis: choice,
				confirmedAt: TIME - 86_400_000,
				value: false,
			},
		},
		subject: { subjectId: SUBJECT_ID },
		version: 3,
	},
	rejectAll: {
		categories: v3Categories(false, choice),
		subject: { subjectId: SUBJECT_ID },
		version: 3,
	},
	singleGrant: {
		categories: {
			marketing: { basis: choice, confirmedAt: TIME, value: true },
		},
		subject: { subjectId: SUBJECT_ID },
		version: 3,
	},
};

describe('cookie projection bytes (baseline evidence, not a budget)', () => {
	beforeEach(() => {
		document.cookie = '';
		window.localStorage.clear();
	});

	afterEach(() => {
		document.cookie = '';
		window.localStorage.clear();
	});

	it('v2 compact cookie values as stored in document.cookie', () => {
		expect({
			acceptAll: storedV2Bytes(v2.acceptAll),
			acceptAllIdentified: storedV2Bytes(v2.acceptAllIdentified),
			rejectAll: storedV2Bytes(v2.rejectAll),
		}).toEqual({ acceptAll: 127, acceptAllIdentified: 249, rejectAll: 64 });
	});

	it('v2 JSON localStorage values', () => {
		expect({
			acceptAll: bytes(JSON.stringify(v2.acceptAll)),
			acceptAllIdentified: bytes(JSON.stringify(v2.acceptAllIdentified)),
			rejectAll: bytes(JSON.stringify(v2.rejectAll)),
		}).toEqual({ acceptAll: 184, acceptAllIdentified: 354, rejectAll: 188 });
	});

	it('v3 compact cookie values as stored in document.cookie', () => {
		const measured = Object.fromEntries(
			Object.entries(v3).map(([name, envelope]) => [
				name,
				storedV3Bytes(envelope),
			])
		);
		expect(measured).toEqual({
			acceptAll: 186,
			acceptAllIdentified: 233,
			migratedLegacyNoHash: 122,
			mixedLegacyAndCurrent: 252,
			rejectAll: 186,
			singleGrant: 123,
		});
	});

	it('v3 JSON localStorage values', () => {
		const measured = Object.fromEntries(
			Object.entries(v3).map(([name, envelope]) => [
				name,
				bytes(encodeStoredConsentEnvelopeJson(envelope)),
			])
		);
		expect(measured).toEqual({
			acceptAll: 748,
			acceptAllIdentified: 823,
			migratedLegacyNoHash: 424,
			mixedLegacyAndCurrent: 766,
			rejectAll: 752,
			singleGrant: 246,
		});
	});
});
