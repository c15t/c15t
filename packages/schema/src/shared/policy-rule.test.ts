import { describe, expect, test } from 'vitest';

import {
	collectResolvedPolicyRuleIssues,
	DEFAULT_CHOICE_VALIDITY_DAYS,
	DEFAULT_NOTICE_VALIDITY_DAYS,
	inspectPolicyRules,
	normalizePolicyRule,
	POLICY_MODEL_PROMPTS,
	POLICY_OPTIONAL_CATEGORIES,
	POLICY_PROMPTS,
	POLICY_RULE_MODELS,
	validatePolicyRules,
} from './policy-rule';
import type { PolicyRule, ResolvedPolicyRule } from './policy-rule';

const DAY_MS = 86_400_000;

const optOutNone: PolicyRule = {
	id: 'review',
	match: { isDefault: true },
	model: 'opt-out',
	prompt: 'none',
};

const optInChoice: PolicyRule = {
	...optOutNone,
	model: 'opt-in',
	prompt: 'choice',
};

const errorsFor = (rule: unknown, options?: { iabEnabled?: boolean }) =>
	inspectPolicyRules([rule], options).errors;

describe('normalizePolicyRule', () => {
	test('fills defaults and canonicalizes every set', () => {
		const rule = normalizePolicyRule({
			...optInChoice,
			actions: ['customize', 'reject', 'accept', 'accept'],
			categories: ['measurement', 'marketing', 'marketing', 'necessary'],
			copyRevision: '  2026-09  ',
			preselectedCategories: ['measurement', 'measurement'],
			privacySignals: { gpc: { denyCategories: ['measurement', 'marketing'] } },
			rights: ['opt-out', 'disclosure'],
		});

		expect(rule).toEqual({
			actions: {
				allowed: ['accept', 'customize', 'reject'],
				equivalent: [['accept', 'reject']],
				required: ['accept', 'reject'],
			},
			copyRevision: '2026-09',
			id: 'review',
			model: 'opt-in',
			preselectedCategories: ['measurement'],
			privacySignals: { gpc: { denyCategories: ['marketing', 'measurement'] } },
			prompt: 'choice',
			proof: { storeIp: false, storeLanguage: false, storeUserAgent: false },
			rights: ['disclosure', 'opt-out', 'preferences'],
			scope: ['marketing', 'measurement'],
			scopeMode: 'permissive',
			validity: {
				choiceMs: DEFAULT_CHOICE_VALIDITY_DAYS * DAY_MS,
				noticeMs: DEFAULT_NOTICE_VALIDITY_DAYS * DAY_MS,
			},
		} satisfies ResolvedPolicyRule);
	});

	test('expands an omitted or wildcard scope to every optional category', () => {
		expect(normalizePolicyRule(optInChoice).scope).toEqual([
			...POLICY_OPTIONAL_CATEGORIES,
		]);
		expect(
			normalizePolicyRule({ ...optInChoice, categories: ['*'] }).scope
		).toEqual([...POLICY_OPTIONAL_CATEGORIES]);
		expect(
			normalizePolicyRule({ ...optInChoice, categories: ['necessary'] }).scope
		).toEqual([...POLICY_OPTIONAL_CATEGORIES]);
	});

	test('derives notice and none action constraints', () => {
		expect(
			normalizePolicyRule({ ...optOutNone, prompt: 'notice' }).actions
		).toEqual({ allowed: ['dismiss'], equivalent: [], required: ['dismiss'] });
		expect(normalizePolicyRule(optOutNone).actions).toEqual({
			allowed: [],
			equivalent: [],
			required: [],
		});
	});

	test('keeps disclosure and preferences for every model and adds opt-out for opt-out', () => {
		expect(normalizePolicyRule(optOutNone).rights).toEqual([
			'disclosure',
			'opt-out',
			'preferences',
		]);
		expect(normalizePolicyRule(optInChoice).rights).toEqual([
			'disclosure',
			'preferences',
		]);
		expect(
			normalizePolicyRule({ ...optInChoice, model: 'iab' }).rights
		).toEqual(['disclosure', 'preferences']);
	});

	test('keeps an explicit IAB scope and scope mode', () => {
		const rule = normalizePolicyRule({
			...optInChoice,
			categories: ['marketing'],
			model: 'iab',
			scopeMode: 'strict',
		});
		expect(rule.scope).toEqual(['marketing']);
		expect(rule.scopeMode).toBe('strict');
		expect(rule.preselectedCategories).toEqual([]);
	});

	test('converts validity days to milliseconds and keeps them finite', () => {
		const rule = normalizePolicyRule({
			...optOutNone,
			validity: { choiceDays: 0.5, noticeDays: 30 },
		});
		expect(rule.validity).toEqual({
			choiceMs: 43_200_000,
			noticeMs: 30 * DAY_MS,
		});
		expect(
			Number.isFinite(normalizePolicyRule(optOutNone).validity.choiceMs)
		).toBe(true);
	});

	test('keeps i18n only when it carries a value', () => {
		expect(
			normalizePolicyRule({ ...optOutNone, i18n: {} }).i18n
		).toBeUndefined();
		expect(
			normalizePolicyRule({ ...optOutNone, i18n: { messageProfile: 'eu' } })
				.i18n
		).toEqual({ messageProfile: 'eu' });
	});

	test('throws the first validation error', () => {
		expect(() =>
			normalizePolicyRule({ ...optInChoice, prompt: 'notice' })
		).toThrow(/allows prompts \[choice\]/u);
		expect(() => validatePolicyRules([{ ...optInChoice, id: ' ' }])).toThrow(
			/non-empty id/u
		);
	});
});

describe('inspectPolicyRules model and prompt combinations', () => {
	test.each(
		POLICY_RULE_MODELS.flatMap((model) =>
			POLICY_PROMPTS.map((prompt) => ({ model, prompt }))
		)
	)('$model + $prompt', ({ model, prompt }) => {
		const errors = errorsFor(
			{ ...optOutNone, model, prompt },
			{ iabEnabled: true }
		);
		const allowed = POLICY_MODEL_PROMPTS[model].includes(prompt);
		expect(errors.length === 0).toBe(allowed);
	});

	test('rejects unknown models and prompts', () => {
		expect(errorsFor({ ...optOutNone, model: 'notice' })).toHaveLength(1);
		expect(errorsFor({ ...optOutNone, prompt: 'future' })).toHaveLength(1);
	});
});

describe('inspectPolicyRules field validation', () => {
	test('required rule fields cannot come from a prototype', () => {
		expect(errorsFor(Object.create(optOutNone)).length).toBeGreaterThan(0);
		expect(
			errorsFor({ ...optOutNone, match: Object.create({ isDefault: true }) })
				.length
		).toBeGreaterThan(0);
		const customPrototype = Object.assign(
			Object.create({ inherited: true }) as Record<string, unknown>,
			optOutNone
		);
		expect(errorsFor(customPrototype).length).toBeGreaterThan(0);
	});

	test.each([
		{ label: 'top-level', patch: { unknown: true } },
		{ label: 'privacySignals', patch: { privacySignals: { unknown: true } } },
		{
			label: 'privacySignals.gpc',
			patch: {
				privacySignals: {
					gpc: { denyCategories: [], informedException: true },
				},
			},
		},
		{ label: 'validity', patch: { validity: { unknown: 1 } } },
		{ label: 'match', patch: { match: { isDefault: true, unknown: true } } },
		{ label: 'i18n', patch: { i18n: { profile: 'eu' } } },
		{ label: 'proof', patch: { proof: { storeEmail: true } } },
		{ label: 'review', patch: { review: { legal: true, status: 'pending' } } },
	])('rejects unknown $label fields', ({ patch }) => {
		expect(errorsFor({ ...optOutNone, ...patch }).length).toBeGreaterThan(0);
	});

	test.each([
		Number.MAX_VALUE,
		Number.POSITIVE_INFINITY,
		Number.NaN,
		0,
		-1,
		'1',
	])('rejects validity %s', (choiceDays) => {
		expect(
			errorsFor({ ...optOutNone, validity: { choiceDays } }).length
		).toBeGreaterThan(0);
	});

	test.each([
		{ countries: [1] },
		{ regions: [null] },
		{ regions: [{ country: 'US' }] },
		{ regions: [{ country: 'US', extra: true, region: 'CA' }] },
		{ countries: 3, isDefault: true },
		{ isDefault: 'yes' },
		{ countries: [''] },
		{},
	])('rejects matcher %j', (match) => {
		expect(errorsFor({ ...optOutNone, match }).length).toBeGreaterThan(0);
	});

	test('rejects unknown categories and keeps necessary tolerated', () => {
		expect(
			errorsFor({ ...optOutNone, categories: ['analytics'] })
		).toHaveLength(1);
		expect(
			errorsFor({ ...optOutNone, categories: ['necessary'] })
		).toHaveLength(0);
	});

	test('rejects preselection outside scope, and any preselection for iab', () => {
		expect(
			errorsFor({
				...optInChoice,
				categories: ['marketing'],
				preselectedCategories: ['measurement'],
			})
		).toHaveLength(1);
		expect(
			errorsFor(
				{ ...optInChoice, model: 'iab', preselectedCategories: ['marketing'] },
				{ iabEnabled: true }
			)
		).toHaveLength(1);
		expect(
			errorsFor(
				{ ...optInChoice, model: 'iab', preselectedCategories: [] },
				{ iabEnabled: true }
			)
		).toHaveLength(1);
	});

	test('choice actions must keep accept and reject, and only choice takes actions', () => {
		expect(
			errorsFor({ ...optInChoice, actions: ['accept', 'customize'] })
		).toEqual([expect.stringContaining('must include "reject"')]);
		expect(
			errorsFor({ ...optInChoice, actions: ['accept', 'reject', 'dismiss'] })
		).toHaveLength(1);
		expect(
			errorsFor({ ...optOutNone, actions: ['accept', 'reject'] })
		).toHaveLength(1);
		expect(
			errorsFor({ ...optInChoice, actions: ['accept', 'reject'] })
		).toHaveLength(0);
	});

	test('rejects unknown rights', () => {
		expect(errorsFor({ ...optOutNone, rights: ['erasure'] })).toHaveLength(1);
	});

	test.each([
		['necessary'],
		['marketing', 'marketing'],
		['unknown'],
		['experience'],
	])('GPC rejects %j against a marketing-only scope', (denyCategories) => {
		expect(
			errorsFor({
				...optOutNone,
				categories: ['marketing'],
				privacySignals: { gpc: { denyCategories } },
			}).length
		).toBeGreaterThan(0);
	});

	test('GPC accepts an in-scope mapping', () => {
		expect(
			errorsFor({
				...optOutNone,
				privacySignals: {
					gpc: { denyCategories: ['marketing', 'measurement'] },
				},
			})
		).toHaveLength(0);
	});

	test('validates review metadata types', () => {
		expect(
			errorsFor({ ...optOutNone, review: { status: 'done' } })
		).toHaveLength(1);
		expect(
			errorsFor({
				...optOutNone,
				review: { sources: 'url', status: 'pending' },
			})
		).toHaveLength(1);
	});
});

describe('inspectPolicyRules pack validation', () => {
	test('reports duplicate ids, extra defaults and extra fallbacks', () => {
		const { errors } = inspectPolicyRules([
			optOutNone,
			{ ...optOutNone, match: { fallback: true } },
			{ ...optOutNone, id: 'other', match: { fallback: true } },
			{ ...optOutNone, id: 'third' },
		]);
		expect(errors).toEqual(
			expect.arrayContaining([
				'Only one default policy is allowed',
				'Only one fallback policy is allowed',
				expect.stringContaining("Duplicate id 'review'"),
			])
		);
	});

	test('requires IAB support for iab rules when the option is given', () => {
		const rule = { ...optInChoice, model: 'iab' as const };
		expect(errorsFor(rule, { iabEnabled: false })).toHaveLength(1);
		expect(errorsFor(rule, { iabEnabled: true })).toHaveLength(0);
		expect(errorsFor(rule)).toHaveLength(0);
	});

	test('warns about missing default and fallback matchers and overlaps', () => {
		const { warnings } = inspectPolicyRules([
			{ ...optInChoice, id: 'a', match: { countries: ['DE'] } },
			{ ...optInChoice, id: 'b', match: { countries: ['de'] } },
		]);
		expect(warnings).toEqual([
			expect.stringContaining('No default policy configured'),
			expect.stringContaining('No fallback policy configured'),
			expect.stringContaining(
				"Country matcher 'DE' appears in multiple policies"
			),
		]);
	});

	test('rejects non-array packs and non-object rules', () => {
		expect(inspectPolicyRules(null).errors).toHaveLength(1);
		expect(inspectPolicyRules(['x']).errors).toEqual([
			'Policy at index 0 must be a plain object.',
		]);
	});
});

describe('collectResolvedPolicyRuleIssues', () => {
	const base = normalizePolicyRule(optInChoice);

	test('accepts every normalized rule', () => {
		expect(collectResolvedPolicyRuleIssues(base)).toEqual([]);
		expect(
			collectResolvedPolicyRuleIssues(
				normalizePolicyRule({ ...optOutNone, prompt: 'notice' })
			)
		).toEqual([]);
	});

	test.each([
		{
			label: 'notice actions on a choice prompt',
			patch: {
				actions: {
					allowed: ['dismiss'],
					equivalent: [],
					required: ['dismiss'],
				},
			},
		},
		{
			label: 'missing required actions',
			patch: {
				actions: {
					allowed: ['accept', 'reject'],
					equivalent: [['accept', 'reject']],
					required: [],
				},
			},
		},
		{
			label: 'allowed without required',
			patch: {
				actions: {
					allowed: ['accept'],
					equivalent: [['accept', 'reject']],
					required: ['accept', 'reject'],
				},
			},
		},
		{
			label: 'missing equivalence group',
			patch: {
				actions: {
					allowed: ['accept', 'reject'],
					equivalent: [],
					required: ['accept', 'reject'],
				},
			},
		},
		{ label: 'missing preferences right', patch: { rights: ['disclosure'] } },
		{ label: 'missing disclosure right', patch: { rights: ['preferences'] } },
		{ label: 'invalid pairing', patch: { model: 'opt-in', prompt: 'notice' } },
		{
			label: 'duplicate GPC mapping',
			patch: {
				privacySignals: { gpc: { denyCategories: ['marketing', 'marketing'] } },
			},
		},
		{
			label: 'GPC outside scope',
			patch: {
				privacySignals: { gpc: { denyCategories: ['measurement'] } },
				scope: ['marketing'],
			},
		},
		{
			label: 'preselection outside scope',
			patch: { preselectedCategories: ['measurement'], scope: ['marketing'] },
		},
		{
			label: 'iab preselection',
			patch: { model: 'iab', preselectedCategories: ['marketing'] },
		},
		{
			label: 'unsafe validity',
			patch: { validity: { choiceMs: Number.MAX_VALUE, noticeMs: 1 } },
		},
		{ label: 'empty copy revision', patch: { copyRevision: '' } },
		{
			label: 'opt-out without opt-out right',
			patch: {
				actions: { allowed: [], equivalent: [], required: [] },
				model: 'opt-out',
				prompt: 'none',
			},
		},
	])('flags $label', ({ patch }) => {
		expect(
			collectResolvedPolicyRuleIssues({
				...base,
				...patch,
			} as ResolvedPolicyRule).length
		).toBeGreaterThan(0);
	});
});
