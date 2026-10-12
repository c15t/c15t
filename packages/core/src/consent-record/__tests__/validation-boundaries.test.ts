import { describe, expect, it } from 'vitest';

import { evaluateConsentRecord } from '../evaluate';
import { normalizeLegacyConsentRecord } from '../normalize';
import { recordCategoryPatch } from '../record';
import { validateExplicitChoice } from '../validation';
import { currentBasis, makeChoice, makePolicy, NOW } from './fixtures';

const policy = makePolicy({
	choice: { fingerprint: 'current', maxAgeMs: 30 },
	scope: ['marketing'],
});

const evaluate = (
	choice: Parameters<typeof evaluateConsentRecord>[0]['choice']
) =>
	evaluateConsentRecord({
		choice,
		noticeDismissal: null,
		now: NOW + 1,
		policy,
	});

describe('validated field copies', () => {
	it.each([
		{ fingerprint: 'previous', kind: 'choice-v1' },
		{ kind: 'legacy-v2', materialFingerprint: 'previous' },
	])('preserves a non-enumerable $kind basis and its mismatch', (basis) => {
		const inputBasis = Object.fromEntries(Object.entries(basis));
		for (const key of Object.keys(inputBasis)) {
			Object.defineProperty(inputBasis, key, { enumerable: false });
		}
		const result = validateExplicitChoice(
			{
				categories: {
					marketing: { basis: inputBasis, confirmedAt: NOW, value: true },
				},
				version: 3,
			},
			NOW
		);
		expect(result.ok).toBe(true);
		if (!result.ok) {
			throw new Error('Expected valid own basis fields');
		}
		expect(result.record.categories.marketing?.basis).toEqual(basis);
		const evaluation = evaluateConsentRecord({
			choice: result.record,
			noticeDismissal: null,
			now: NOW,
			policy: makePolicy({
				choice: policy.choice,
				legacyMaterialFingerprint: 'current-legacy',
				scope: ['marketing'],
			}),
		});
		expect(evaluation.permissions.marketing).toBe(false);
		expect(evaluation.promptRequirement).toEqual({
			kind: 'choice',
			reason: 'policy-changed',
		});
	});

	it('preserves non-enumerable choice validity through exact expiry', () => {
		const validity = { fingerprint: 'current', maxAgeMs: 30 };
		Object.defineProperty(validity, 'maxAgeMs', { enumerable: false });
		Object.defineProperty(validity, 'fingerprint', { enumerable: false });
		const bounded = makePolicy({ choice: validity, scope: ['marketing'] });
		const choice = makeChoice({ marketing: true }, NOW, currentBasis(bounded));
		const at = (now: number) =>
			evaluateConsentRecord({
				choice,
				noticeDismissal: null,
				now,
				policy: bounded,
			});
		expect(at(NOW + 29).permissions.marketing).toBe(true);
		expect(at(NOW + 29).nextDeadline).toBe(NOW + 30);
		expect(at(NOW + 30).permissions.marketing).toBe(false);
		expect(at(NOW + 30).promptRequirement).toEqual({
			kind: 'choice',
			reason: 'expired',
		});
	});

	it('preserves non-enumerable notice validity through exact expiry', () => {
		const validity = { fingerprint: 'notice', maxAgeMs: 30 };
		Object.defineProperty(validity, 'maxAgeMs', { enumerable: false });
		Object.defineProperty(validity, 'fingerprint', { enumerable: false });
		const noticePolicy = makePolicy({
			model: 'opt-out',
			notice: validity,
			prompt: 'notice',
		});
		const at = (now: number) =>
			evaluateConsentRecord({
				choice: null,
				noticeDismissal: {
					dismissedAt: NOW,
					fingerprint: 'notice',
					version: 1,
				},
				now,
				policy: noticePolicy,
			});
		expect(at(NOW + 29).promptRequirement).toEqual({ kind: 'none' });
		expect(at(NOW + 29).nextDeadline).toBe(NOW + 30);
		expect(at(NOW + 30).promptRequirement).toEqual({
			kind: 'notice',
			reason: 'expired',
		});
	});
});

describe('non-enumerable own category fields', () => {
	it('records a non-enumerable denial instead of leaving a grant unchanged', () => {
		const previous = makeChoice({ marketing: true }, NOW, currentBasis(policy));
		const patch = Object.defineProperty({}, 'marketing', { value: false });
		const result = recordCategoryPatch(previous, patch, {
			actionAt: NOW + 1,
			policy,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) {
			throw new Error('Expected a valid denial patch');
		}
		expect(result.confirmed).toEqual(['marketing']);
		expect(result.choice.categories.marketing).toEqual({
			basis: currentBasis(policy),
			confirmedAt: NOW + 1,
			value: false,
		});
		expect(evaluate(result.choice).permissions.marketing).toBe(false);
		expect(previous.categories.marketing?.value).toBe(true);
	});

	it.each([
		['marketing', 'false'],
		['unknown', true],
		['necessary', false],
		['measurement', true],
	])(
		'rejects a non-enumerable invalid patch field %s atomically',
		(key, value) => {
			const previous = makeChoice(
				{ marketing: true },
				NOW,
				currentBasis(policy)
			);
			const patch = Object.defineProperty({ marketing: false }, key, { value });
			expect(
				recordCategoryPatch(previous, patch, { actionAt: NOW, policy }).ok
			).toBe(false);
			expect(previous.categories.marketing?.value).toBe(true);
		}
	);

	it('keeps a non-enumerable v3 denial effective under opt-out', () => {
		const denial = makeChoice({ marketing: false }, NOW, currentBasis(policy));
		Object.defineProperty(denial.categories, 'marketing', {
			enumerable: false,
		});
		const result = validateExplicitChoice(denial, NOW);
		expect(result.ok).toBe(true);
		if (!result.ok) {
			throw new Error('Expected a valid denial record');
		}
		const evaluation = evaluateConsentRecord({
			choice: result.record,
			noticeDismissal: null,
			now: NOW + 100,
			policy: makePolicy({ choice: policy.choice, model: 'opt-out' }),
		});
		expect(evaluation.permissions.marketing).toBe(false);
		expect(evaluation.restrictions.marketing).toEqual(['explicit-denial']);
	});

	it.each(['json', 'compact'] as const)(
		'preserves a non-enumerable legacy %s denial',
		(encoding) => {
			const result = normalizeLegacyConsentRecord(
				{
					consentInfo: { time: NOW },
					consents: Object.defineProperty({}, 'marketing', { value: false }),
				},
				{ encoding, now: NOW }
			);
			expect(result.ok).toBe(true);
			if (!result.ok) {
				throw new Error('Expected a valid legacy denial');
			}
			const evaluation = evaluateConsentRecord({
				choice: result.choice,
				noticeDismissal: null,
				now: NOW,
				policy: makePolicy({ model: 'opt-out' }),
			});
			expect(evaluation.permissions.marketing).toBe(false);
			expect(result.choice.categories.marketing?.value).toBe(false);
		}
	);

	it.each(['unknown', 'marketing'])(
		'rejects non-enumerable invalid v3 field %s without salvaging grants',
		(key) => {
			const choice = makeChoice(
				{ measurement: true },
				NOW,
				currentBasis(policy)
			);
			Object.defineProperty(choice.categories, key, { value: 'invalid' });
			expect(validateExplicitChoice(choice, NOW).ok).toBe(false);
		}
	);
});

describe('policy union validation', () => {
	it.each([
		{ model: 'unknown' },
		{ model: 'opt-out', prompt: 'unknown' },
		{ scopeMode: 'unknown' },
		{ legacyMaterialFingerprint: '' },
		{ legacyMaterialFingerprint: 123 },
	])('rejects unsupported policy input %j', (overrides) => {
		// @ts-expect-error Exercise invalid JavaScript inputs at the runtime boundary.
		expect(() => makePolicy(overrides)).toThrow(TypeError);
	});

	it.each([
		{ model: 'opt-in', prompt: 'choice' },
		{ model: 'iab', prompt: 'choice' },
		{ model: 'opt-out', prompt: 'choice' },
		{ model: 'opt-out', prompt: 'notice' },
		{ model: 'opt-out', prompt: 'none' },
	] as const)('accepts the supported $model/$prompt pairing', (overrides) => {
		expect(makePolicy(overrides)).toMatchObject(overrides);
	});

	it.each([undefined, null, 'legacy'])(
		'accepts legacy fingerprint %s',
		(legacyMaterialFingerprint) => {
			expect(
				makePolicy({ legacyMaterialFingerprint }).legacyMaterialFingerprint
			).toBe(legacyMaterialFingerprint ?? null);
		}
	);
});
