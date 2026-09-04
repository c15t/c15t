import { describe, expect, it } from 'vitest';

import { evaluateConsentRecord } from '../evaluate';
import { recordCategoryPatch } from '../record';
import type { ExplicitChoice } from '../types';
import { currentBasis, DAY, makeChoice, makePolicy, NOW } from './fixtures';

const policy = makePolicy({
	choice: { fingerprint: 'fp-a', maxAgeMs: 30 * DAY },
});

const expectOk = function expectOk(
	result: ReturnType<typeof recordCategoryPatch>
): Extract<ReturnType<typeof recordCategoryPatch>, { ok: true }> {
	if (result.ok === false) {
		throw new Error(`expected success, got ${JSON.stringify(result.issues)}`);
	}
	return result;
};

describe('recordCategoryPatch: coverage', () => {
	it('refreshes only supplied keys and leaves omitted decisions untouched', () => {
		const previous = makeChoice(
			{ marketing: true, measurement: false },
			NOW,
			currentBasis(policy)
		);
		const result = expectOk(
			recordCategoryPatch(
				previous,
				{ functionality: true },
				{
					actionAt: NOW + 5 * DAY,
					policy,
				}
			)
		);
		expect(result.confirmed).toEqual(['functionality']);
		expect(result.choice.categories.functionality).toEqual({
			basis: { fingerprint: 'fp-a', kind: 'choice-v1' },
			confirmedAt: NOW + 5 * DAY,
			value: true,
		});
		expect(result.choice.categories.marketing).toBe(
			previous.categories.marketing
		);
		expect(result.choice.categories.measurement).toBe(
			previous.categories.measurement
		);
		expect(previous.categories.functionality).toBeUndefined();
	});

	it('treats an unchanged value as reconfirmation of that key only', () => {
		const previous = makeChoice(
			{ marketing: true, measurement: true },
			NOW,
			currentBasis(policy)
		);
		const result = expectOk(
			recordCategoryPatch(
				previous,
				{ marketing: true },
				{
					actionAt: NOW + DAY,
					policy,
				}
			)
		);
		expect(result.confirmed).toEqual(['marketing']);
		expect(result.choice.categories.marketing?.confirmedAt).toBe(NOW + DAY);
		expect(result.choice.categories.measurement?.confirmedAt).toBe(NOW);
	});

	it('keeps an omitted grant on a denial patch', () => {
		const previous = makeChoice({ marketing: true }, NOW, currentBasis(policy));
		const result = expectOk(
			recordCategoryPatch(
				previous,
				{ measurement: false },
				{
					actionAt: NOW + DAY,
					policy,
				}
			)
		);
		expect(result.choice.categories.marketing).toEqual(
			previous.categories.marketing
		);
		expect(result.choice.categories.measurement?.value).toBe(false);
	});

	it('is a no-op success for an empty object', () => {
		const previous = makeChoice({ marketing: true }, NOW, currentBasis(policy));
		const result = expectOk(
			recordCategoryPatch(previous, {}, { actionAt: NOW + DAY, policy })
		);
		expect(result.choice).toBe(previous);
		expect(result.confirmed).toEqual([]);
	});

	it('starts a fresh record from null', () => {
		const result = expectOk(
			recordCategoryPatch(null, { marketing: false }, { actionAt: NOW, policy })
		);
		expect(result.choice).toEqual({
			categories: {
				marketing: {
					basis: { fingerprint: 'fp-a', kind: 'choice-v1' },
					confirmedAt: NOW,
					value: false,
				},
			},
			version: 3,
		});
	});

	it('gives each grant its own lifetime across successive saves', () => {
		const day0 = expectOk(
			recordCategoryPatch(null, { marketing: true }, { actionAt: NOW, policy })
		).choice;
		const day29 = expectOk(
			recordCategoryPatch(
				day0,
				{ measurement: true },
				{ actionAt: NOW + 29 * DAY, policy }
			)
		).choice;
		const day31 = expectOk(
			recordCategoryPatch(
				day29,
				{ functionality: true },
				{ actionAt: NOW + 31 * DAY, policy }
			)
		).choice;

		const at = (choice: ExplicitChoice, now: number) =>
			evaluateConsentRecord({ choice, noticeDismissal: null, now, policy })
				.permissions;
		expect(at(day29, NOW + 30 * DAY).marketing).toBe(false);
		expect(at(day29, NOW + 30 * DAY).measurement).toBe(true);
		expect(at(day31, NOW + 31 * DAY).marketing).toBe(false);
		expect(at(day31, NOW + 58 * DAY).measurement).toBe(true);
		expect(at(day31, NOW + 59 * DAY).measurement).toBe(false);
		expect(at(day31, NOW + 60 * DAY).functionality).toBe(true);
	});
});

describe('recordCategoryPatch: material changes', () => {
	it('binds only the patched key to the new basis and keeps the old one invalid', () => {
		const policyB = makePolicy({
			choice: { fingerprint: 'fp-b', maxAgeMs: 30 * DAY },
		});
		const underA = makeChoice(
			{ marketing: true, measurement: true },
			NOW,
			currentBasis(policy)
		);
		const mixed = expectOk(
			recordCategoryPatch(
				underA,
				{ measurement: true },
				{ actionAt: NOW + DAY, policy: policyB }
			)
		).choice;
		expect(mixed.categories.measurement?.basis).toEqual({
			fingerprint: 'fp-b',
			kind: 'choice-v1',
		});
		expect(mixed.categories.marketing?.basis).toEqual({
			fingerprint: 'fp-a',
			kind: 'choice-v1',
		});

		const evaluate = (choice: ExplicitChoice) =>
			evaluateConsentRecord({
				choice,
				noticeDismissal: null,
				now: NOW + DAY,
				policy: policyB,
			});
		const first = evaluate(mixed);
		expect(first.permissions.measurement).toBe(true);
		expect(first.permissions.marketing).toBe(false);
		expect(first.categories.marketing.authority).toBe('policy-changed');
		expect(first.promptRequirement).toEqual({
			kind: 'choice',
			reason: 'policy-changed',
		});
		// A reload of the same mixed record evaluates identically.
		expect(evaluate(JSON.parse(JSON.stringify(mixed)))).toEqual(first);
	});
});

describe('recordCategoryPatch: validation', () => {
	const previous = makeChoice({ marketing: true }, NOW, currentBasis(policy));

	it('rejects a positive value outside the selectable scope atomically', () => {
		const narrow = makePolicy({
			choice: { fingerprint: 'fp-a', maxAgeMs: null },
			scope: ['functionality'],
		});
		const result = recordCategoryPatch(
			previous,
			{ functionality: true, marketing: true },
			{ actionAt: NOW + DAY, policy: narrow }
		);
		expect(result.ok).toBe(false);
		if (result.ok === false) {
			expect(result.issues).toEqual([
				{ code: 'out-of-scope', path: 'marketing' },
			]);
		}
		expect(previous.categories.marketing?.confirmedAt).toBe(NOW);
	});

	it('accepts an explicit denial outside scope', () => {
		const narrow = makePolicy({
			choice: { fingerprint: 'fp-a', maxAgeMs: null },
			scope: ['functionality'],
		});
		const result = expectOk(
			recordCategoryPatch(
				previous,
				{ marketing: false },
				{
					actionAt: NOW + DAY,
					policy: narrow,
				}
			)
		);
		expect(result.choice.categories.marketing?.value).toBe(false);
	});

	it('rejects unknown keys, non-boolean values and necessary: false', () => {
		for (const patch of [
			{ analytics: true },
			{ marketing: 'true' },
			{ necessary: false },
			[],
			null,
			'all',
		]) {
			expect(
				recordCategoryPatch(previous, patch, { actionAt: NOW, policy }).ok
			).toBe(false);
		}
	});

	it('tolerates necessary: true as inert', () => {
		const result = expectOk(
			recordCategoryPatch(
				previous,
				{ necessary: true },
				{
					actionAt: NOW,
					policy,
				}
			)
		);
		expect(result.confirmed).toEqual([]);
		expect(result.choice).toBe(previous);
	});

	it('rejects a patch with a custom prototype instead of reading inherited keys', () => {
		const patch = Object.create({ marketing: false }) as Record<
			string,
			unknown
		>;
		patch.measurement = true;
		const result = recordCategoryPatch(previous, patch, {
			actionAt: NOW + DAY,
			policy,
		});
		expect(result.ok).toBe(false);
		expect(previous.categories.marketing?.value).toBe(true);
	});

	it('rejects a future or malformed action time', () => {
		expect(
			recordCategoryPatch(
				previous,
				{ marketing: true },
				{
					actionAt: NOW + 1,
					now: NOW,
					policy,
				}
			).ok
		).toBe(false);
		expect(
			recordCategoryPatch(
				previous,
				{ marketing: true },
				{
					actionAt: Number.NaN,
					policy,
				}
			).ok
		).toBe(false);
	});
});
