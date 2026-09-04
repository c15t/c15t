import { describe, expect, it } from 'vitest';

import { evaluateConsentRecord } from '../evaluate';
import { normalizeLegacyConsentRecord } from '../normalize';
import type { ExplicitChoice, NoticeDismissal } from '../types';
import { currentBasis, DAY, makeChoice, makePolicy, NOW } from './fixtures';

const allFalse = {
	experience: false,
	functionality: false,
	marketing: false,
	measurement: false,
	necessary: true,
};
const allTrue = {
	experience: true,
	functionality: true,
	marketing: true,
	measurement: true,
	necessary: true,
};

describe('evaluateConsentRecord: fresh subjects', () => {
	it('denies optional categories and requires a choice under opt-in', () => {
		const result = evaluateConsentRecord({
			choice: null,
			noticeDismissal: null,
			now: NOW,
			policy: makePolicy(),
		});
		expect(result.permissions).toEqual(allFalse);
		expect(result.restrictions).toEqual({});
		expect(result.promptRequirement).toEqual({
			kind: 'choice',
			reason: 'missing',
		});
		expect(result.nextDeadline).toBeNull();
	});

	it('follows the model default and the configured prompt under opt-out', () => {
		for (const prompt of ['choice', 'notice', 'none'] as const) {
			const result = evaluateConsentRecord({
				choice: null,
				noticeDismissal: null,
				now: NOW,
				policy: makePolicy({ model: 'opt-out', prompt }),
			});
			expect(result.permissions).toEqual(allTrue);
			expect(result.promptRequirement).toEqual(
				prompt === 'none'
					? { kind: 'none' }
					: { kind: prompt, reason: 'missing' }
			);
		}
	});

	it('treats an IAB policy like opt-in for category defaults', () => {
		const result = evaluateConsentRecord({
			choice: null,
			noticeDismissal: null,
			now: NOW,
			policy: makePolicy({ model: 'iab' }),
		});
		expect(result.permissions).toEqual(allFalse);
		expect(result.promptRequirement).toEqual({
			kind: 'choice',
			reason: 'missing',
		});
	});

	it('returns no prompt when the policy governs no optional category', () => {
		const result = evaluateConsentRecord({
			choice: null,
			noticeDismissal: null,
			now: NOW,
			policy: makePolicy({ scope: [], scopeMode: 'strict' }),
		});
		expect(result.promptRequirement).toEqual({ kind: 'none' });
		expect(result.permissions).toEqual(allFalse);
	});
});

describe('evaluateConsentRecord: legacy records', () => {
	const legacyRecord = {
		consentInfo: { subjectId: 'sub_2VZxR7YmNpKq3WfLs8TgHd', time: NOW - DAY },
		consents: {
			experience: false,
			functionality: true,
			marketing: true,
			measurement: false,
			necessary: true,
		},
	};

	const normalize = function normalize(fingerprint?: string) {
		const result = normalizeLegacyConsentRecord(
			{
				...legacyRecord,
				consentInfo: {
					...legacyRecord.consentInfo,
					materialPolicyFingerprint: fingerprint,
				},
			},
			{ encoding: 'json', now: NOW }
		);
		if (result.ok === false) {
			throw new Error('fixture must normalize');
		}
		return result.choice;
	};

	it('keeps a valid record without a material hash current and complete', () => {
		const result = evaluateConsentRecord({
			choice: normalize(),
			noticeDismissal: null,
			now: NOW,
			policy: makePolicy({ legacyMaterialFingerprint: 'material-a' }),
		});
		expect(result.permissions).toEqual({
			...allFalse,
			functionality: true,
			marketing: true,
		});
		expect(result.promptRequirement).toEqual({ kind: 'none' });
	});

	it('keeps a matching material hash current', () => {
		const result = evaluateConsentRecord({
			choice: normalize('material-a'),
			noticeDismissal: null,
			now: NOW,
			policy: makePolicy({ legacyMaterialFingerprint: 'material-a' }),
		});
		expect(result.promptRequirement).toEqual({ kind: 'none' });
		expect(result.permissions.marketing).toBe(true);
	});

	it('grandfathers a legacy hash when resolution cannot supply a comparable one', () => {
		const result = evaluateConsentRecord({
			choice: normalize('material-a'),
			noticeDismissal: null,
			now: NOW,
			policy: makePolicy({ legacyMaterialFingerprint: null }),
		});
		expect(result.promptRequirement).toEqual({ kind: 'none' });
	});

	it('stops positive authority on a known material mismatch but keeps denials', () => {
		const result = evaluateConsentRecord({
			choice: normalize('material-a'),
			noticeDismissal: null,
			now: NOW,
			policy: makePolicy({ legacyMaterialFingerprint: 'material-b' }),
		});
		expect(result.permissions).toEqual(allFalse);
		expect(result.restrictions).toEqual({
			experience: ['explicit-denial'],
			measurement: ['explicit-denial'],
		});
		expect(result.promptRequirement).toEqual({
			kind: 'choice',
			reason: 'policy-changed',
		});
	});

	it('never compares a legacy hash to the choice prompt fingerprint', () => {
		const policy = makePolicy();
		const choice = normalize(policy.choice.fingerprint);
		const result = evaluateConsentRecord({
			choice,
			noticeDismissal: null,
			now: NOW,
			policy: makePolicy({ legacyMaterialFingerprint: 'material-b' }),
		});
		expect(result.promptRequirement).toEqual({
			kind: 'choice',
			reason: 'policy-changed',
		});
	});
});

describe('evaluateConsentRecord: per-category grant expiry', () => {
	const policy = makePolicy({
		choice: { fingerprint: 'choice-fp-1', maxAgeMs: 30 * DAY },
	});
	const basis = currentBasis(policy);
	const choice: ExplicitChoice = {
		categories: {
			experience: { basis, confirmedAt: NOW, value: false },
			functionality: { basis, confirmedAt: NOW, value: false },
			marketing: { basis, confirmedAt: NOW, value: true },
			measurement: { basis, confirmedAt: NOW + 29 * DAY, value: true },
		},
		version: 3,
	};

	it('expires each grant on its own confirmation time', () => {
		const atDay30 = evaluateConsentRecord({
			choice,
			noticeDismissal: null,
			now: NOW + 30 * DAY,
			policy,
		});
		expect(atDay30.permissions.marketing).toBe(false);
		expect(atDay30.permissions.measurement).toBe(true);
		expect(atDay30.categories.marketing.authority).toBe('expired');
		expect(atDay30.promptRequirement).toEqual({
			kind: 'choice',
			reason: 'expired',
		});
		expect(atDay30.nextDeadline).toBe(NOW + 59 * DAY);

		const atDay59 = evaluateConsentRecord({
			choice,
			noticeDismissal: null,
			now: NOW + 59 * DAY,
			policy,
		});
		expect(atDay59.permissions.measurement).toBe(false);
		expect(atDay59.nextDeadline).toBeNull();
	});

	it('flips exactly at the deadline under opt-in', () => {
		const expiresAt = NOW + 30 * DAY;
		const permitted = (now: number) =>
			evaluateConsentRecord({ choice, noticeDismissal: null, now, policy })
				.permissions.marketing;
		expect(permitted(expiresAt - 1)).toBe(true);
		expect(permitted(expiresAt)).toBe(false);
		expect(permitted(expiresAt + 1)).toBe(false);
	});

	it('keeps the permission expiry deadline while required coverage is missing', () => {
		const partial: ExplicitChoice = {
			categories: { marketing: { basis, confirmedAt: NOW, value: true } },
			version: 3,
		};
		const result = evaluateConsentRecord({
			choice: partial,
			noticeDismissal: null,
			now: NOW,
			policy,
		});
		expect(result.promptRequirement).toEqual({
			kind: 'choice',
			reason: 'missing',
		});
		expect(result.nextDeadline).toBe(NOW + 30 * DAY);
	});

	it('falls back to the opt-out default at expiry without touching the raw choice', () => {
		const optOut = makePolicy({
			choice: { fingerprint: 'choice-fp-1', maxAgeMs: 30 * DAY },
			model: 'opt-out',
		});
		const optOutChoice = makeChoice(
			{ marketing: true },
			NOW,
			currentBasis(optOut)
		);
		const frozen = JSON.stringify(optOutChoice);
		const result = evaluateConsentRecord({
			choice: optOutChoice,
			noticeDismissal: null,
			now: NOW + 30 * DAY,
			policy: optOut,
		});
		expect(result.permissions.marketing).toBe(true);
		expect(result.categories.marketing.source).toBe('default');
		expect(result.categories.marketing.authority).toBe('expired');
		expect(JSON.stringify(optOutChoice)).toBe(frozen);
	});

	it('does not schedule a deadline that cannot change anything', () => {
		const optOutNone = makePolicy({
			choice: { fingerprint: 'choice-fp-1', maxAgeMs: 30 * DAY },
			model: 'opt-out',
			prompt: 'none',
		});
		const result = evaluateConsentRecord({
			choice: makeChoice({ marketing: true }, NOW, currentBasis(optOutNone)),
			noticeDismissal: null,
			now: NOW,
			policy: optOutNone,
		});
		expect(result.nextDeadline).toBeNull();
	});
});

describe('evaluateConsentRecord: denials', () => {
	it('does not re-prompt an aged full rejection and keeps every denial', () => {
		const policy = makePolicy({
			choice: { fingerprint: 'choice-fp-1', maxAgeMs: 30 * DAY },
		});
		const result = evaluateConsentRecord({
			choice: makeChoice(
				{
					experience: false,
					functionality: false,
					marketing: false,
					measurement: false,
				},
				NOW - 400 * DAY,
				currentBasis(policy)
			),
			noticeDismissal: null,
			now: NOW,
			policy,
		});
		expect(result.promptRequirement).toEqual({ kind: 'none' });
		expect(result.permissions).toEqual(allFalse);
		expect(Object.keys(result.restrictions)).toHaveLength(4);
	});

	it('re-prompts after a material change while denials stay effective', () => {
		const before = makePolicy();
		const after = makePolicy({
			choice: { fingerprint: 'choice-fp-2', maxAgeMs: null },
			model: 'opt-out',
		});
		const result = evaluateConsentRecord({
			choice: makeChoice(
				{
					experience: false,
					functionality: false,
					marketing: false,
					measurement: false,
				},
				NOW,
				currentBasis(before)
			),
			noticeDismissal: null,
			now: NOW,
			policy: after,
		});
		expect(result.promptRequirement).toEqual({
			kind: 'choice',
			reason: 'policy-changed',
		});
		expect(result.permissions).toEqual(allFalse);
	});

	it('reports missing when the confirmed keys are fresh but incomplete', () => {
		const policy = makePolicy();
		const result = evaluateConsentRecord({
			choice: makeChoice({ marketing: true }, NOW, currentBasis(policy)),
			noticeDismissal: null,
			now: NOW,
			policy,
		});
		expect(result.promptRequirement).toEqual({
			kind: 'choice',
			reason: 'missing',
		});
		expect(result.permissions.marketing).toBe(true);
	});
});

describe('evaluateConsentRecord: scope', () => {
	it('denies a strict excluded category despite a stored grant', () => {
		const policy = makePolicy({
			model: 'opt-out',
			scope: ['functionality'],
			scopeMode: 'strict',
		});
		const result = evaluateConsentRecord({
			choice: makeChoice({ marketing: true }, NOW, currentBasis(policy)),
			noticeDismissal: null,
			now: NOW,
			policy,
		});
		expect(result.permissions.marketing).toBe(false);
		expect(result.restrictions.marketing).toEqual(['strict-scope']);
		expect(result.categories.marketing.inScope).toBe(false);
	});

	it('lets a permissive excluded category default to allowed but never overrides a denial', () => {
		const policy = makePolicy({
			scope: ['functionality'],
			scopeMode: 'permissive',
		});
		const result = evaluateConsentRecord({
			choice: makeChoice({ marketing: false }, NOW, currentBasis(policy)),
			noticeDismissal: null,
			now: NOW,
			policy,
		});
		expect(result.permissions.measurement).toBe(true);
		expect(result.categories.measurement.source).toBe('default');
		expect(result.permissions.marketing).toBe(false);
		expect(result.restrictions.marketing).toEqual(['explicit-denial']);
	});

	it('does not require a choice for categories outside scope', () => {
		const policy = makePolicy({ scope: ['functionality'] });
		const result = evaluateConsentRecord({
			choice: makeChoice({ functionality: true }, NOW, currentBasis(policy)),
			noticeDismissal: null,
			now: NOW,
			policy,
		});
		expect(result.promptRequirement).toEqual({ kind: 'none' });
	});
});

describe('evaluateConsentRecord: privacy signals', () => {
	const policy = makePolicy({
		gpcDenyCategories: ['marketing', 'measurement'],
		model: 'opt-out',
	});

	it('masks an ordinary stored grant under an applicable signal', () => {
		const result = evaluateConsentRecord({
			choice: makeChoice(
				{ functionality: true, marketing: true, measurement: true },
				NOW,
				currentBasis(policy)
			),
			gpc: true,
			noticeDismissal: null,
			now: NOW,
			policy,
		});
		expect(result.permissions).toEqual({
			...allTrue,
			marketing: false,
			measurement: false,
		});
		expect(result.restrictions).toEqual({
			marketing: ['gpc'],
			measurement: ['gpc'],
		});
		expect(result.categories.marketing.authority).toBe('valid');
	});

	it('ignores the signal when the policy has no mapping', () => {
		const result = evaluateConsentRecord({
			choice: null,
			gpc: true,
			noticeDismissal: null,
			now: NOW,
			policy: makePolicy({ model: 'opt-out' }),
		});
		expect(result.permissions).toEqual(allTrue);
		expect(result.restrictions).toEqual({});
	});

	it('keeps a standing directive after the live signal disappears', () => {
		const result = evaluateConsentRecord({
			choice: makeChoice({ marketing: true }, NOW, currentBasis(policy)),
			gpc: false,
			noticeDismissal: null,
			now: NOW,
			optOuts: [
				{ categories: ['marketing'], recordedAt: NOW - DAY, source: 'gpc' },
			],
			policy,
		});
		expect(result.permissions.marketing).toBe(false);
		expect(result.permissions.measurement).toBe(true);
		expect(result.restrictions.marketing).toEqual(['opt-out-directive']);
	});

	it('does not acknowledge a required notice', () => {
		const notice = makePolicy({
			gpcDenyCategories: ['marketing'],
			model: 'opt-out',
			prompt: 'notice',
		});
		const result = evaluateConsentRecord({
			choice: null,
			gpc: true,
			noticeDismissal: null,
			now: NOW,
			policy: notice,
		});
		expect(result.promptRequirement).toEqual({
			kind: 'notice',
			reason: 'missing',
		});
	});
});

describe('evaluateConsentRecord: notices', () => {
	const policy = makePolicy({
		choice: { fingerprint: 'choice-fp-1', maxAgeMs: 10 * DAY },
		model: 'opt-out',
		notice: { fingerprint: 'notice-fp-1', maxAgeMs: 30 * DAY },
		prompt: 'notice',
	});
	const dismissal: NoticeDismissal = {
		dismissedAt: NOW,
		fingerprint: policy.notice.fingerprint,
		version: 1,
	};

	it('stays dismissed through category expiry and partial saves', () => {
		const choice = makeChoice({ marketing: true }, NOW, currentBasis(policy));
		const afterExpiry = evaluateConsentRecord({
			choice,
			noticeDismissal: dismissal,
			now: NOW + 11 * DAY,
			policy,
		});
		expect(afterExpiry.promptRequirement).toEqual({ kind: 'none' });
		expect(afterExpiry.nextDeadline).toBe(NOW + 30 * DAY);

		const withoutChoice = evaluateConsentRecord({
			choice: null,
			noticeDismissal: dismissal,
			now: NOW,
			policy,
		});
		expect(withoutChoice.promptRequirement).toEqual({ kind: 'none' });
		expect(withoutChoice.permissions).toEqual(allTrue);
	});

	it('returns as expired exactly at its own deadline', () => {
		const at = (now: number) =>
			evaluateConsentRecord({
				choice: null,
				noticeDismissal: dismissal,
				now,
				policy,
			}).promptRequirement;
		expect(at(NOW + 30 * DAY - 1)).toEqual({ kind: 'none' });
		expect(at(NOW + 30 * DAY)).toEqual({ kind: 'notice', reason: 'expired' });
	});

	it('reports policy-changed for a dismissal of a different notice', () => {
		const result = evaluateConsentRecord({
			choice: null,
			noticeDismissal: { ...dismissal, fingerprint: 'other-notice' },
			now: NOW,
			policy,
		});
		expect(result.promptRequirement).toEqual({
			kind: 'notice',
			reason: 'policy-changed',
		});
		expect(result.nextDeadline).toBeNull();
	});

	it('never lets a dismissal satisfy a choice prompt', () => {
		const choicePolicy = makePolicy({ model: 'opt-out' });
		const result = evaluateConsentRecord({
			choice: null,
			noticeDismissal: {
				dismissedAt: NOW,
				fingerprint: choicePolicy.notice.fingerprint,
				version: 1,
			},
			now: NOW,
			policy: choicePolicy,
		});
		expect(result.promptRequirement).toEqual({
			kind: 'choice',
			reason: 'missing',
		});
	});

	it('does not clear a notice requirement when a choice is saved', () => {
		const result = evaluateConsentRecord({
			choice: makeChoice(
				{
					experience: true,
					functionality: true,
					marketing: false,
					measurement: false,
				},
				NOW,
				currentBasis(policy)
			),
			noticeDismissal: null,
			now: NOW,
			policy,
		});
		expect(result.promptRequirement).toEqual({
			kind: 'notice',
			reason: 'missing',
		});
		expect(result.permissions.marketing).toBe(false);
	});
});

describe('evaluateConsentRecord: determinism', () => {
	it('returns equal results for equal inputs', () => {
		const policy = makePolicy({
			choice: { fingerprint: 'choice-fp-1', maxAgeMs: 30 * DAY },
		});
		const input = {
			choice: makeChoice({ marketing: true }, NOW - DAY, currentBasis(policy)),
			gpc: true,
			noticeDismissal: null,
			now: NOW,
			policy,
		};
		expect(evaluateConsentRecord(input)).toEqual(evaluateConsentRecord(input));
	});
});

describe('evaluateConsentRecord: meaningful deadlines', () => {
	const policy = makePolicy({
		choice: { fingerprint: 'current', maxAgeMs: 30 },
		gpcDenyCategories: ['marketing'],
		model: 'opt-out',
		scope: ['marketing', 'measurement'],
	});

	it.each(['missing', 'policy-changed', 'expired'] as const)(
		'ignores later opt-out expiry when the prompt remains %s',
		(reason) => {
			const choice = makeChoice({ marketing: true }, NOW, currentBasis(policy));
			if (reason !== 'missing') {
				choice.categories.measurement = {
					basis: {
						fingerprint: reason === 'policy-changed' ? 'old' : 'current',
						kind: 'choice-v1',
					},
					confirmedAt: NOW - 30,
					value: true,
				};
			}
			const at = (now: number) =>
				evaluateConsentRecord({
					choice,
					noticeDismissal: null,
					now,
					policy,
				});
			expect(at(NOW).promptRequirement).toEqual({ kind: 'choice', reason });
			expect(at(NOW).nextDeadline).toBeNull();
			expect(at(NOW + 30).permissions).toEqual(at(NOW).permissions);
			expect(at(NOW + 30).promptRequirement).toEqual(at(NOW).promptRequirement);
		}
	);

	it('schedules opt-out expiry when complete coverage will need a choice', () => {
		const choice = makeChoice(
			{ marketing: true, measurement: false },
			NOW,
			currentBasis(policy)
		);
		const at = (now: number) =>
			evaluateConsentRecord({
				choice,
				gpc: true,
				noticeDismissal: null,
				now,
				policy,
			});
		expect(at(NOW).promptRequirement).toEqual({ kind: 'none' });
		expect(at(NOW).nextDeadline).toBe(NOW + 30);
		expect(at(NOW + 30).promptRequirement).toEqual({
			kind: 'choice',
			reason: 'expired',
		});
	});

	it.each(['opt-in', 'iab'] as const)(
		'ignores masked %s expiry while coverage stays missing',
		(model) => {
			const choice = makeChoice({ marketing: true }, NOW, currentBasis(policy));
			const evaluation = evaluateConsentRecord({
				choice,
				gpc: true,
				noticeDismissal: null,
				now: NOW,
				policy: { ...policy, model },
			});
			expect(evaluation.permissions.marketing).toBe(false);
			expect(evaluation.nextDeadline).toBeNull();
		}
	);

	it('skips an earlier masked grant and schedules the first permission change', () => {
		const choice = makeChoice({ marketing: true }, NOW, currentBasis(policy));
		choice.categories.measurement = {
			basis: currentBasis(policy),
			confirmedAt: NOW + 10,
			value: true,
		};
		const scoped = makePolicy({
			choice: policy.choice,
			gpcDenyCategories: ['marketing'],
			scope: ['marketing', 'measurement', 'functionality'],
		});
		const evaluation = evaluateConsentRecord({
			choice,
			gpc: true,
			noticeDismissal: null,
			now: NOW + 10,
			policy: scoped,
		});
		expect(evaluation.promptRequirement).toEqual({
			kind: 'choice',
			reason: 'missing',
		});
		expect(evaluation.nextDeadline).toBe(NOW + 40);
	});
});
