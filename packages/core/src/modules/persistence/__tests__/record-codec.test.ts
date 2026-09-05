/**
 * v3 envelope codec: JSON and compact forms must round-trip every
 * per-category receipt exactly, keep `false` distinct from absence, and
 * never coerce string fingerprints or identifiers.
 */
import { describe, expect, it } from 'vitest';

import type { ChoiceBasis, PrivacyOptOut } from '../../../consent-record/types';
import {
	decodeNoticeDismissal,
	decodePrivacyOptOuts,
	decodeStoredConsentEnvelopeCompact,
	encodeNoticeDismissal,
	encodePrivacyOptOuts,
	encodeStoredConsentEnvelopeCompact,
	encodeStoredConsentEnvelopeJson,
	isCompactStoredConsentEnvelope,
	validateStoredConsentEnvelope,
} from '../record-codec';
import type { StoredConsentEnvelope } from '../record-codec';

const NOW = 1_800_000_000_000;
const DAY = 86_400_000;
const SUBJECT_ID = 'sub_2VZxR7YmNpKq3WfLs8TgHd';
const CHOICE_FP =
	'9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';
const LEGACY_FP =
	'2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae';

const choice = function choice(fingerprint = CHOICE_FP): ChoiceBasis {
	return { fingerprint, kind: 'choice-v1' };
};

const legacy = function legacy(materialFingerprint?: string): ChoiceBasis {
	return materialFingerprint === undefined
		? { kind: 'legacy-v2' }
		: { kind: 'legacy-v2', materialFingerprint };
};

const roundTrip = function roundTrip(envelope: StoredConsentEnvelope) {
	const json = validateStoredConsentEnvelope(
		JSON.parse(encodeStoredConsentEnvelopeJson(envelope)),
		NOW
	);
	const compact = decodeStoredConsentEnvelopeCompact(
		encodeStoredConsentEnvelopeCompact(envelope),
		NOW
	);
	return { compact, json };
};

describe('v3 envelope round trip', () => {
	it('keeps all four booleans, mixed times and both hash domains', () => {
		const envelope: StoredConsentEnvelope = {
			categories: {
				experience: {
					basis: legacy(),
					confirmedAt: NOW - 40 * DAY,
					value: false,
				},
				functionality: {
					basis: legacy(LEGACY_FP),
					confirmedAt: NOW - 40 * DAY,
					value: true,
				},
				marketing: { basis: choice(), confirmedAt: NOW - DAY, value: true },
				measurement: {
					basis: choice(),
					confirmedAt: NOW - 2 * DAY,
					value: false,
				},
			},
			subject: {
				externalId: 'user_123',
				identityProvider: 'clerk',
				subjectId: SUBJECT_ID,
			},
			version: 3,
		};

		const { compact, json } = roundTrip(envelope);

		expect(json).toEqual({ ok: true, record: envelope });
		expect(compact).toEqual({ ok: true, record: envelope });
	});

	it('distinguishes explicit false from an absent category', () => {
		const envelope: StoredConsentEnvelope = {
			categories: {
				marketing: { basis: choice(), confirmedAt: NOW - DAY, value: false },
			},
			version: 3,
		};

		const { compact, json } = roundTrip(envelope);

		expect(json.ok && json.record.categories.marketing?.value).toBe(false);
		expect(compact.ok && compact.record.categories.marketing?.value).toBe(
			false
		);
		expect(json.ok && 'measurement' in json.record.categories).toBe(false);
		expect(compact.ok && 'measurement' in compact.record.categories).toBe(
			false
		);
		expect(encodeStoredConsentEnvelopeCompact(envelope)).not.toContain('me=');
	});

	it('does not coerce fingerprints or identifiers that look like booleans or numbers', () => {
		const envelope: StoredConsentEnvelope = {
			categories: {
				functionality: {
					basis: legacy('0'),
					confirmedAt: NOW - DAY,
					value: true,
				},
				marketing: { basis: choice('1'), confirmedAt: NOW - DAY, value: true },
			},
			iab: { customVendorConsents: { '0': false, '1': true, '42': false } },
			subject: { externalId: '0', subjectId: '1' },
			version: 3,
		};

		const { compact, json } = roundTrip(envelope);

		expect(json).toEqual({ ok: true, record: envelope });
		expect(compact).toEqual({ ok: true, record: envelope });
		expect(compact.ok && compact.record.subject?.subjectId).toBe('1');
		expect(
			compact.ok &&
				compact.record.categories.marketing?.basis.kind === 'choice-v1'
				? compact.record.categories.marketing.basis.fingerprint
				: null
		).toBe('1');
	});

	it('escapes delimiter characters inside free-text components', () => {
		const envelope: StoredConsentEnvelope = {
			categories: {
				marketing: {
					basis: choice('a&b=c|d.e;f,g:h'),
					confirmedAt: NOW - DAY,
					value: true,
				},
			},
			iab: { customVendorLegitimateInterests: { 'v.1|x&y': true } },
			subject: { externalId: 'id&=|.', subjectId: SUBJECT_ID },
			version: 3,
		};

		const compactText = encodeStoredConsentEnvelopeCompact(envelope);

		expect(compactText).not.toMatch(/[,:;]/u);
		expect(decodeStoredConsentEnvelopeCompact(compactText, NOW)).toEqual({
			ok: true,
			record: envelope,
		});
	});

	it('writes the subject once and each distinct basis once', () => {
		const envelope: StoredConsentEnvelope = {
			categories: {
				experience: { basis: choice(), confirmedAt: NOW - DAY, value: true },
				functionality: {
					basis: choice(),
					confirmedAt: NOW - DAY,
					value: true,
				},
				marketing: { basis: choice(), confirmedAt: NOW - DAY, value: true },
				measurement: { basis: choice(), confirmedAt: NOW - DAY, value: true },
			},
			subject: { subjectId: SUBJECT_ID },
			version: 3,
		};

		const compactText = encodeStoredConsentEnvelopeCompact(envelope);

		expect(compactText.split(CHOICE_FP)).toHaveLength(2);
		expect(compactText.split(SUBJECT_ID)).toHaveLength(2);
		expect(isCompactStoredConsentEnvelope(compactText)).toBe(true);
	});

	it('is stable across repeated encode/decode cycles', () => {
		const envelope: StoredConsentEnvelope = {
			categories: {
				functionality: {
					basis: legacy(LEGACY_FP),
					confirmedAt: NOW - 100 * DAY,
					value: true,
				},
				marketing: { basis: choice(), confirmedAt: NOW - DAY, value: false },
			},
			subject: { subjectId: SUBJECT_ID },
			version: 3,
		};

		const first = encodeStoredConsentEnvelopeCompact(envelope);
		const decoded = decodeStoredConsentEnvelopeCompact(first, NOW);
		expect(decoded.ok).toBe(true);
		const second = encodeStoredConsentEnvelopeCompact(
			decoded.ok ? decoded.record : envelope
		);
		expect(second).toBe(first);
		expect(encodeStoredConsentEnvelopeJson(envelope)).toBe(
			encodeStoredConsentEnvelopeJson(decoded.ok ? decoded.record : envelope)
		);
	});
});

describe('v3 envelope rejection', () => {
	it('rejects an unknown version in both encodings without legacy fallthrough', () => {
		expect(
			validateStoredConsentEnvelope({ categories: {}, version: 4 }, NOW)
		).toEqual({
			issues: [{ code: 'unsupported-version', path: 'version' }],
			ok: false,
		});
		expect(decodeStoredConsentEnvelopeCompact('v=4&mk=1.1.0', NOW).ok).toBe(
			false
		);
		expect(isCompactStoredConsentEnvelope('v=4&mk=1.1.0')).toBe(false);
	});

	it('rejects a future timestamp, a bad value slot, a dangling basis and unknown fields', () => {
		const future = `v=3&b=c${CHOICE_FP}&mk=1.${NOW + 1}.0`;
		const badValue = `v=3&b=c${CHOICE_FP}&mk=2.${NOW - DAY}.0`;
		const dangling = `v=3&b=c${CHOICE_FP}&mk=1.${NOW - DAY}.1`;
		const unknown = `v=3&b=c${CHOICE_FP}&mk=1.${NOW - DAY}.0&zz=1`;
		const duplicate = `v=3&b=c${CHOICE_FP}&mk=1.${NOW - DAY}.0&mk=0.${NOW - DAY}.0`;
		const fractional = `v=3&b=c${CHOICE_FP}&mk=1.${NOW - DAY}.5.0`;

		for (const text of [
			future,
			badValue,
			dangling,
			unknown,
			duplicate,
			fractional,
		]) {
			const result = decodeStoredConsentEnvelopeCompact(text, NOW);
			expect(result.ok, text).toBe(false);
		}
	});

	it('rejects a malformed subject or IAB block instead of salvaging grants', () => {
		const base = {
			categories: {
				marketing: { basis: choice(), confirmedAt: NOW - DAY, value: true },
			},
			version: 3,
		};
		expect(
			validateStoredConsentEnvelope({ ...base, subject: { subjectId: 1 } }, NOW)
				.ok
		).toBe(false);
		expect(
			validateStoredConsentEnvelope(
				{ ...base, iab: { customVendorConsents: { v1: '1' } } },
				NOW
			).ok
		).toBe(false);
		expect(
			validateStoredConsentEnvelope({ ...base, extra: true }, NOW).ok
		).toBe(false);
	});
});

describe('IAB metadata own keys', () => {
	it('keeps an own __proto__ vendor denial in JSON and compact forms', () => {
		const parsed = JSON.parse(
			`{"version":3,"categories":{},"iab":{"customVendorConsents":{"__proto__":false,"vendor":true}}}`
		) as unknown;

		const json = validateStoredConsentEnvelope(parsed, NOW);
		expect(json.ok).toBe(true);
		const map = json.ok ? json.record.iab?.customVendorConsents : undefined;
		expect(map && Object.hasOwn(map, '__proto__')).toBe(true);
		expect(
			map && Object.getOwnPropertyDescriptor(map, '__proto__')?.value
		).toBe(false);
		expect(Object.getPrototypeOf(map)).toBe(Object.prototype);

		const compact = decodeStoredConsentEnvelopeCompact(
			'v=3&icv=0.__proto__|1.vendor',
			NOW
		);
		expect(compact.ok).toBe(true);
		const compactMap = compact.ok
			? compact.record.iab?.customVendorConsents
			: undefined;
		expect(
			compactMap &&
				Object.getOwnPropertyDescriptor(compactMap, '__proto__')?.value
		).toBe(false);
		expect(compactMap?.vendor).toBe(true);
		expect(
			compact.ok && encodeStoredConsentEnvelopeCompact(compact.record)
		).toBe('v=3&icv=0.__proto__|1.vendor');
	});
});

describe('notice dismissal and privacy opt-out codecs', () => {
	it('round-trips a notice dismissal and rejects other versions', () => {
		const record = {
			dismissedAt: NOW - DAY,
			fingerprint: 'notice-fp-1',
			version: 1 as const,
		};
		const decoded = decodeNoticeDismissal(
			JSON.parse(encodeNoticeDismissal(record)),
			NOW
		);
		expect(decoded).toEqual({ ok: true, record });
		expect(decodeNoticeDismissal({ ...record, version: 2 }, NOW).ok).toBe(
			false
		);
	});

	it('round-trips standing GPC directives with sorted categories', () => {
		const directives: PrivacyOptOut[] = [
			{
				categories: ['marketing', 'measurement'],
				recordedAt: NOW - DAY,
				source: 'gpc',
			},
		];
		const decoded = decodePrivacyOptOuts(
			JSON.parse(encodePrivacyOptOuts({ directives, version: 1 })),
			NOW
		);
		expect(decoded).toEqual({
			ok: true,
			record: {
				directives: [
					{
						categories: ['marketing', 'measurement'],
						recordedAt: NOW - DAY,
						source: 'gpc',
					},
				],
				version: 1,
			},
		});
	});

	it('rejects directives with necessary, duplicates, unknown sources or future times', () => {
		const bad = [
			{ categories: ['necessary'], recordedAt: NOW - DAY, source: 'gpc' },
			{
				categories: ['marketing', 'marketing'],
				recordedAt: NOW - DAY,
				source: 'gpc',
			},
			{ categories: ['marketing'], recordedAt: NOW - DAY, source: 'dnt' },
			{ categories: ['marketing'], recordedAt: NOW + 1, source: 'gpc' },
		];
		for (const directive of bad) {
			expect(
				decodePrivacyOptOuts({ directives: [directive], version: 1 }, NOW).ok
			).toBe(false);
		}
	});
});
