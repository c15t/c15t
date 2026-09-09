import { describe, expect, it } from 'vitest';

import { normalizeLegacyConsentRecord } from '../normalize';
import { validateExplicitChoice, validateNoticeDismissal } from '../validation';
import { DAY, NOW } from './fixtures';

const SUBJECT_ID = 'sub_2VZxR7YmNpKq3WfLs8TgHd';

const legacy = function legacy(overrides: Record<string, unknown> = {}) {
	return {
		consentInfo: {
			materialPolicyFingerprint: 'material-a',
			subjectId: SUBJECT_ID,
			time: NOW - DAY,
			type: 'custom',
		},
		consents: {
			experience: false,
			functionality: true,
			marketing: true,
			measurement: false,
			necessary: true,
		},
		...overrides,
	};
};

describe('normalizeLegacyConsentRecord: valid records', () => {
	it('preserves values, time, identity and the legacy hash without mutating input', () => {
		const input = legacy();
		const frozen = JSON.stringify(input);
		const result = normalizeLegacyConsentRecord(input, {
			encoding: 'json',
			now: NOW,
		});
		expect(result).toEqual({
			choice: {
				categories: {
					experience: {
						basis: { kind: 'legacy-v2', materialFingerprint: 'material-a' },
						confirmedAt: NOW - DAY,
						value: false,
					},
					functionality: {
						basis: { kind: 'legacy-v2', materialFingerprint: 'material-a' },
						confirmedAt: NOW - DAY,
						value: true,
					},
					marketing: {
						basis: { kind: 'legacy-v2', materialFingerprint: 'material-a' },
						confirmedAt: NOW - DAY,
						value: true,
					},
					measurement: {
						basis: { kind: 'legacy-v2', materialFingerprint: 'material-a' },
						confirmedAt: NOW - DAY,
						value: false,
					},
				},
				version: 3,
			},
			ok: true,
			subject: { subjectId: SUBJECT_ID },
		});
		expect(JSON.stringify(input)).toBe(frozen);
	});

	it('keeps absent keys absent for a partial JSON record', () => {
		const result = normalizeLegacyConsentRecord(
			legacy({ consents: { marketing: true, necessary: true } }),
			{ encoding: 'json', now: NOW }
		);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(Object.keys(result.choice.categories)).toEqual(['marketing']);
		}
	});

	it('restores omitted false values for a compact record', () => {
		const result = normalizeLegacyConsentRecord(
			legacy({ consents: { marketing: true, necessary: true } }),
			{ encoding: 'compact', now: NOW }
		);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(
				Object.fromEntries(
					Object.entries(result.choice.categories).map(([key, value]) => [
						key,
						value.value,
					])
				)
			).toEqual({
				experience: false,
				functionality: false,
				marketing: true,
				measurement: false,
			});
			expect(result.choice.categories.experience?.confirmedAt).toBe(NOW - DAY);
		}
	});

	it('accepts an anonymous record and a record without a material hash', () => {
		const result = normalizeLegacyConsentRecord(
			legacy({ consentInfo: { time: NOW - DAY } }),
			{ encoding: 'json', now: NOW }
		);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.subject).toBeNull();
			expect(result.choice.categories.marketing?.basis).toEqual({
				kind: 'legacy-v2',
			});
		}
	});

	it('keeps a semantically old record structurally valid', () => {
		const result = normalizeLegacyConsentRecord(
			legacy({ consentInfo: { time: NOW - 900 * DAY } }),
			{ encoding: 'json', now: NOW }
		);
		expect(result.ok).toBe(true);
	});

	it('ignores custom keys that v2 preserved and reads a fresh cookie time', () => {
		const result = normalizeLegacyConsentRecord(
			legacy({
				consents: { custom: true, marketing: false, necessary: true },
			}),
			{ encoding: 'json', now: NOW }
		);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(Object.keys(result.choice.categories)).toEqual(['marketing']);
		}
	});
});

describe('normalizeLegacyConsentRecord: rejected records', () => {
	const expectRejected = function expectRejected(
		input: unknown,
		reason: string,
		code?: string
	) {
		const result = normalizeLegacyConsentRecord(input, {
			encoding: 'json',
			now: NOW,
		});
		expect(result.ok).toBe(false);
		if (result.ok === false) {
			expect(result.reason).toBe(reason);
			if (code) {
				expect(result.issues.map((issue) => issue.code)).toContain(code);
			}
		}
	};

	it('reports empty storage separately from malformed data', () => {
		expectRejected(null, 'empty');
		expectRejected(undefined, 'empty');
		expectRejected('c.marketing:1', 'malformed', 'not-an-object');
		expectRejected([], 'malformed');
	});

	it('rejects a non-boolean category without salvaging the others', () => {
		expectRejected(
			legacy({ consents: { marketing: 'yes', measurement: false } }),
			'malformed',
			'invalid-boolean'
		);
	});

	it('rejects a future time with no clock tolerance', () => {
		expectRejected(
			legacy({ consentInfo: { time: NOW + 1 } }),
			'malformed',
			'future-timestamp'
		);
	});

	it('rejects string, fractional, negative and out-of-range times', () => {
		for (const time of [
			String(NOW),
			'123junk',
			NOW + 0.5,
			-1,
			Number.NaN,
			9e15,
		]) {
			expectRejected(
				legacy({ consentInfo: { time } }),
				'malformed',
				'invalid-timestamp'
			);
		}
	});

	it('rejects malformed identity and fingerprint metadata', () => {
		expectRejected(
			legacy({ consentInfo: { subjectId: 42, time: NOW } }),
			'malformed',
			'invalid-identifier'
		);
		expectRejected(
			legacy({ consentInfo: { materialPolicyFingerprint: 7, time: NOW } }),
			'malformed',
			'invalid-fingerprint'
		);
	});

	it('does not read a versioned envelope as a v2 record', () => {
		expectRejected(legacy({ version: 3 }), 'unsupported-version');
		expectRejected(legacy({ version: 99 }), 'unsupported-version');
	});

	it('keeps the id-only v1 format unsupported', () => {
		expectRejected(
			legacy({ consentInfo: { id: 'cns_123', time: NOW } }),
			'unsupported-version'
		);
	});

	it('requires consentInfo and consents to be plain objects', () => {
		expectRejected(legacy({ consentInfo: undefined }), 'malformed');
		expectRejected(legacy({ consents: 'all' }), 'malformed');
	});

	it('rejects records whose fields live on a custom prototype', () => {
		const consents = Object.create({ marketing: true }) as Record<
			string,
			unknown
		>;
		consents.measurement = false;
		const consentInfo = Object.create({ time: NOW }) as Record<string, unknown>;
		expectRejected({ consentInfo, consents }, 'malformed', 'not-an-object');
		expectRejected(
			{ consentInfo: { time: NOW }, consents },
			'malformed',
			'not-an-object'
		);
		expectRejected(
			Object.assign(Object.create({ consents: { marketing: true } }), {
				consentInfo: { time: NOW },
			}),
			'malformed',
			'not-an-object'
		);
	});
});

describe('validateExplicitChoice', () => {
	const valid = {
		categories: {
			marketing: {
				basis: { fingerprint: 'fp', kind: 'choice-v1' },
				confirmedAt: NOW,
				value: true,
			},
		},
		version: 3,
	};

	it('accepts a well-formed record and copies it', () => {
		const result = validateExplicitChoice(valid, NOW);
		expect(result).toEqual({ ok: true, record: valid });
		if (result.ok) {
			expect(result.record).not.toBe(valid);
		}
	});

	it('rejects unknown versions, unknown keys and broken decisions', () => {
		const cases: unknown[] = [
			{ ...valid, version: 2 },
			{ ...valid, version: 4 },
			{ ...valid, categories: { analytics: valid.categories.marketing } },
			{
				...valid,
				categories: { marketing: { ...valid.categories.marketing, value: 1 } },
			},
			{
				...valid,
				categories: {
					marketing: { ...valid.categories.marketing, confirmedAt: NOW + 1 },
				},
			},
			{
				...valid,
				categories: {
					marketing: {
						...valid.categories.marketing,
						basis: { kind: 'other' },
					},
				},
			},
			{
				...valid,
				categories: {
					marketing: {
						...valid.categories.marketing,
						basis: { kind: 'choice-v1' },
					},
				},
			},
		];
		for (const input of cases) {
			expect(validateExplicitChoice(input, NOW).ok).toBe(false);
		}
	});

	it('does not let inherited decision fields become grants', () => {
		const inheritedDecision = Object.create({
			basis: { fingerprint: 'fp', kind: 'choice-v1' },
			confirmedAt: NOW,
			value: true,
		}) as Record<string, unknown>;
		expect(
			validateExplicitChoice(
				{ categories: { marketing: inheritedDecision }, version: 3 },
				NOW
			).ok
		).toBe(false);

		const inheritedBasis = Object.create({ fingerprint: 'fp' }) as Record<
			string,
			unknown
		>;
		inheritedBasis.kind = 'choice-v1';
		expect(
			validateExplicitChoice(
				{
					categories: {
						marketing: { basis: inheritedBasis, confirmedAt: NOW, value: true },
					},
					version: 3,
				},
				NOW
			).ok
		).toBe(false);

		const inheritedCategories = Object.create({
			marketing: valid.categories.marketing,
		}) as Record<string, unknown>;
		expect(
			validateExplicitChoice(
				{ categories: inheritedCategories, version: 3 },
				NOW
			).ok
		).toBe(false);

		const inheritedVersion = Object.assign(Object.create({ version: 3 }), {
			categories: valid.categories,
		}) as Record<string, unknown>;
		expect(validateExplicitChoice(inheritedVersion, NOW).ok).toBe(false);
	});

	it('rejects class instances posing as records', () => {
		class Decision {
			basis = { fingerprint: 'fp', kind: 'choice-v1' };
			confirmedAt = NOW;
			value = true;
		}
		expect(
			validateExplicitChoice(
				{ categories: { marketing: new Decision() }, version: 3 },
				NOW
			).ok
		).toBe(false);
	});
});

describe('validateNoticeDismissal', () => {
	it('accepts a well-formed dismissal', () => {
		expect(
			validateNoticeDismissal(
				{ dismissedAt: NOW, fingerprint: 'notice-fp', version: 1 },
				NOW
			)
		).toEqual({
			ok: true,
			record: { dismissedAt: NOW, fingerprint: 'notice-fp', version: 1 },
		});
	});

	it('rejects unknown versions, future times and empty fingerprints', () => {
		for (const input of [
			{ dismissedAt: NOW, fingerprint: 'notice-fp', version: 2 },
			{ dismissedAt: NOW + 1, fingerprint: 'notice-fp', version: 1 },
			{ dismissedAt: NOW, fingerprint: '', version: 1 },
			Object.assign(Object.create({ fingerprint: 'notice-fp' }), {
				dismissedAt: NOW,
				version: 1,
			}),
		]) {
			expect(validateNoticeDismissal(input, NOW).ok).toBe(false);
		}
	});
});
