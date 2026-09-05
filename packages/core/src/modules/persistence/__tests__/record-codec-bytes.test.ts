/**
 * Cookie projection size baseline. These numbers are evidence for a
 * later budget decision, not a budget. They lock the encoding: a change
 * that alters the byte count must be deliberate.
 *
 * Bytes are UTF-8 lengths of the cookie value alone, without the
 * `c15t=` name or attributes. Fingerprints use 64-character SHA-256 hex,
 * matching `@c15t/schema` policy fingerprints.
 */
import { describe, expect, it } from 'vitest';

import type { ChoiceBasis } from '../../../consent-record/types';
import {
	flatToString,
	flattenObject,
	shortenFlatKeys,
} from '../../../libs/cookie';
import {
	encodeStoredConsentEnvelopeCompact,
	encodeStoredConsentEnvelopeJson,
} from '../record-codec';
import type { StoredConsentEnvelope } from '../record-codec';

const TIME = 1_756_857_600_000;
const SUBJECT_ID = 'sub_2VZxR7YmNpKq3WfLs8TgHd';
const CHOICE_FP =
	'9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';
const LEGACY_FP =
	'2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae';

const bytes = function bytes(value: string): number {
	return new TextEncoder().encode(value).length;
};

const v2Compact = function v2Compact(record: Record<string, unknown>): string {
	return flatToString(shortenFlatKeys(flattenObject(record)));
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
	it('v2 compact cookie values', () => {
		expect({
			acceptAll: bytes(v2Compact(v2.acceptAll)),
			acceptAllIdentified: bytes(v2Compact(v2.acceptAllIdentified)),
			rejectAll: bytes(v2Compact(v2.rejectAll)),
		}).toEqual({ acceptAll: 127, acceptAllIdentified: 249, rejectAll: 64 });
	});

	it('v2 JSON localStorage values', () => {
		expect({
			acceptAll: bytes(JSON.stringify(v2.acceptAll)),
			acceptAllIdentified: bytes(JSON.stringify(v2.acceptAllIdentified)),
			rejectAll: bytes(JSON.stringify(v2.rejectAll)),
		}).toEqual({ acceptAll: 184, acceptAllIdentified: 354, rejectAll: 188 });
	});

	it('v3 compact cookie values', () => {
		const measured = Object.fromEntries(
			Object.entries(v3).map(([name, envelope]) => [
				name,
				bytes(encodeStoredConsentEnvelopeCompact(envelope)),
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
