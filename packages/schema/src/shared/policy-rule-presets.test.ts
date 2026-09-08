import { describe, expect, test } from 'vitest';

import { resolvePolicyRules } from './policy-resolution';
import { inspectPolicyRules, normalizePolicyRule } from './policy-rule';
import { createPolicyRuleFingerprints } from './policy-rule-fingerprint';
import { policyRulePresets } from './policy-rule-presets';

const presetNames = Object.keys(
	policyRulePresets
) as (keyof typeof policyRulePresets)[];

describe('policyRulePresets', () => {
	test.each(presetNames)('%s normalizes with a dated source review', (name) => {
		const rule = policyRulePresets[name]();
		expect(() => normalizePolicyRule(rule)).not.toThrow();
		expect(rule.review?.status).toBe('reviewed');
		expect(rule.review?.reviewedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
		expect(rule.review?.reviewBy).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
		expect(Date.parse(rule.review?.reviewBy ?? '')).toBeGreaterThan(
			Date.parse(rule.review?.reviewedOn ?? '')
		);
		if (name !== 'worldOptOutNoPrompt') {
			expect(rule.review?.sources?.length).toBeGreaterThan(0);
		}
		expect(rule.review?.assumptions?.length).toBeGreaterThan(0);
		expect(rule.model).not.toBe('none');
	});

	test('each Europe variant validates with the regional presets as one pack', () => {
		for (const europe of ['europeOptIn', 'europeIab'] as const) {
			const { errors, warnings } = inspectPolicyRules(
				[
					policyRulePresets[europe](),
					policyRulePresets.californiaOptIn(),
					policyRulePresets.quebecOptIn(),
					policyRulePresets.worldOptOutNoPrompt(),
				],
				{ iabEnabled: true }
			);
			expect(errors).toEqual([]);
			expect(warnings).toEqual([]);
		}
		expect(
			inspectPolicyRules(
				[policyRulePresets.europeOptIn(), policyRulePresets.europeIab()],
				{ iabEnabled: true }
			).errors
		).toEqual(['Only one fallback policy is allowed']);
	});

	test('opt-in and IAB presets require a choice', () => {
		for (const name of [
			'europeOptIn',
			'europeIab',
			'californiaOptIn',
			'quebecOptIn',
		] as const) {
			expect(policyRulePresets[name]().prompt).toBe('choice');
		}
		expect(policyRulePresets.europeIab().model).toBe('iab');
	});

	test('californiaOptOut is an explicit no-prompt opt-out with persistent rights and GPC', () => {
		const rule = normalizePolicyRule(policyRulePresets.californiaOptOut());
		expect(rule).toMatchObject({
			model: 'opt-out',
			privacySignals: { gpc: { denyCategories: ['marketing', 'measurement'] } },
			prompt: 'none',
			rights: ['disclosure', 'opt-out', 'preferences'],
		});
		expect(rule.actions.required).toEqual([]);
	});

	test('worldOptOutNoPrompt replaces worldNoBanner as an explicit default', () => {
		const rule = policyRulePresets.worldOptOutNoPrompt();
		expect(rule.match).toEqual({ isDefault: true });
		expect([rule.model, rule.prompt]).toEqual(['opt-out', 'none']);
		expect(rule.privacySignals).toBeUndefined();
		expect(normalizePolicyRule(rule).rights).toEqual([
			'disclosure',
			'opt-out',
			'preferences',
		]);
		expect('worldNoBanner' in policyRulePresets).toBe(false);
	});

	test('europe presets keep the EEA, UK and geo fallback matcher', () => {
		const rule = policyRulePresets.europeOptIn();
		expect(rule.match.fallback).toBe(true);
		expect(rule.match.countries).toEqual(
			expect.arrayContaining(['DE', 'GB', 'NO'])
		);
	});

	test.each(['AX', 'GF', 'GP', 'MQ', 'MF', 'RE', 'YT', 'GI'])(
		'covers %s before the global allow-by-default rule',
		(countryCode) => {
			for (const name of ['europeOptIn', 'europeIab'] as const) {
				const europe = policyRulePresets[name]();
				expect(
					resolvePolicyRules({
						countryCode,
						regionCode: null,
						rules: [policyRulePresets.worldOptOutNoPrompt(), europe],
					})
				).toMatchObject({
					matchedBy: 'country',
					policy: { model: europe.model, prompt: 'choice' },
					policyId: europe.id,
					status: 'matched',
				});
			}
		}
	);

	test.each([
		'europeOptIn',
		'europeIab',
		'californiaOptIn',
		'californiaOptOut',
		'quebecOptIn',
		'worldOptOutNoPrompt',
	] as const)(
		'%s retains frozen receipt compatibility without exposing legacy runtime fields',
		(name) => {
			const rule = policyRulePresets[name]();
			const normalized = normalizePolicyRule(rule);
			const current = createPolicyRuleFingerprints(
				normalized,
				rule.legacyMaterial
			);
			expect(current.legacyMaterial).toMatch(/^[0-9a-f]{64}$/u);
			expect(normalized).not.toHaveProperty('legacyMaterial');
			expect(normalized).not.toHaveProperty('ui');
			expect(
				createPolicyRuleFingerprints(
					{ ...normalized, copyRevision: 'changed' },
					rule.legacyMaterial
				).legacyMaterial
			).not.toBe(current.legacyMaterial);
		}
	);
});

const countryPresets = [
	['chinaOptIn', 'CN'],
	['malaysiaOptIn', 'MY'],
	['thailandOptIn', 'TH'],
	['indonesiaOptIn', 'ID'],
	['philippinesOptIn', 'PH'],
	['vietnamOptIn', 'VN'],
	['bruneiOptIn', 'BN'],
	['laosOptIn', 'LA'],
	['brazilOptIn', 'BR'],
	['switzerlandOptIn', 'CH'],
	['turkeyOptIn', 'TR'],

	['australiaOptIn', 'AU'],
	['singaporeOptIn', 'SG'],
	['japanOptIn', 'JP'],
	['southKoreaOptIn', 'KR'],
	['indiaOptIn', 'IN'],
	['uaeOptIn', 'AE'],
	['saudiArabiaOptIn', 'SA'],
] as const;

describe('regional starter coverage', () => {
	test.each(countryPresets)(
		'%s selects only its country and asks for choice',
		(name, country) => {
			const rule = policyRulePresets[name]();
			expect(
				resolvePolicyRules({
					countryCode: country,
					regionCode: null,
					rules: [rule],
				})
			).toMatchObject({
				policy: { model: 'opt-in', prompt: 'choice' },
				policyId: rule.id,
				status: 'matched',
			});
			expect(
				resolvePolicyRules({
					countryCode: 'NZ',
					regionCode: null,
					rules: [rule],
				})
			).toMatchObject({ status: 'no-match' });
			expect(rule.match).toEqual({ countries: [country] });
			expect(rule.legacyMaterial).toBeUndefined();
		}
	);

	test.each(
		'CA CO CT DE FL IA IN KY MD MN MT NE NH NJ OR RI TN TX UT VA'.split(' ')
	)('US-%s has no automatic prompt and keeps GPC opt-out', (region) => {
		expect(
			resolvePolicyRules({
				countryCode: 'US',
				regionCode: region,
				rules: [policyRulePresets.usPrivacyStatesOptOut()],
			})
		).toMatchObject({
			policy: {
				actions: { required: [] },
				model: 'opt-out',
				privacySignals: {
					gpc: { denyCategories: ['marketing', 'measurement'] },
				},
				prompt: 'none',
				rights: ['disclosure', 'opt-out', 'preferences'],
			},
			policyId: 'us_privacy_states_opt_out',
			status: 'matched',
		});
	});

	test.each(['NY', 'AL', 'OK', null])(
		'does not extend US coverage to %s',
		(region) => {
			expect(
				resolvePolicyRules({
					countryCode: 'US',
					regionCode: region,
					rules: [policyRulePresets.usPrivacyStatesOptOut()],
				}).status
			).not.toBe('matched');
		}
	);
	test.each(
		'CA CO CT DE FL IA IN KY MD MN MT NE NH NJ OR RI TN TX UT VA'.split(' ')
	)(
		'US-%s can select an opt-in choice with the same GPC restrictions',
		(region) => {
			const optIn = policyRulePresets.usPrivacyStatesOptIn();
			const optOut = policyRulePresets.usPrivacyStatesOptOut();
			expect(optIn.match).toEqual(optOut.match);
			expect(optIn.privacySignals).toEqual(optOut.privacySignals);
			expect(
				resolvePolicyRules({
					countryCode: 'US',
					regionCode: region,
					rules: [optIn],
				})
			).toMatchObject({
				policy: { model: 'opt-in', prompt: 'choice' },
				policyId: 'us_privacy_states_opt_in',
				status: 'matched',
			});
		}
	);

	test.each(['NY', 'AL', 'OK'])(
		'the US opt-in variant keeps %s on the no-prompt default',
		(regionCode) => {
			expect(
				resolvePolicyRules({
					countryCode: 'US',
					regionCode,
					rules: [
						policyRulePresets.usPrivacyStatesOptIn(),
						policyRulePresets.worldOptOutNoPrompt(),
					],
				})
			).toMatchObject({
				policy: { prompt: 'none' },
				policyId: 'world_opt_out_no_prompt',
			});
		}
	);

	test('new presets compose with Europe and allow an earlier state override', () => {
		const rules = [
			policyRulePresets.europeOptIn(),
			policyRulePresets.californiaOptIn(),
			policyRulePresets.usPrivacyStatesOptOut(),
			...countryPresets.map(([name]) => policyRulePresets[name]()),
			policyRulePresets.worldOptOutNoPrompt(),
		];
		expect(inspectPolicyRules(rules).errors).toEqual([]);
		for (const [countryCode, regionCode, policyId] of [
			['DE', null, 'europe_opt_in'],
			['US', 'CA', 'california_opt_in'],
			['US', 'CO', 'us_privacy_states_opt_out'],
			['JP', null, 'japan_opt_in'],
			['US', 'NY', 'world_opt_out_no_prompt'],
			['US', 'AL', 'world_opt_out_no_prompt'],
		] as const) {
			expect(
				resolvePolicyRules({ countryCode, regionCode, rules })
			).toMatchObject({ policyId, status: 'matched' });
		}
		expect(
			resolvePolicyRules({ countryCode: null, regionCode: null, rules })
		).toMatchObject({ policyId: 'europe_opt_in' });
	});

	test('Switzerland can use no prompt while keeping preferences and disclosure', () => {
		const rules = [
			policyRulePresets.switzerlandOptOutNoPrompt(),
			policyRulePresets.worldOptOutNoPrompt(),
		];
		expect(
			resolvePolicyRules({ countryCode: 'CH', regionCode: null, rules })
		).toMatchObject({
			policy: {
				model: 'opt-out',
				prompt: 'none',
				rights: ['disclosure', 'opt-out', 'preferences'],
			},
			policyId: 'switzerland_opt_out_no_prompt',
			status: 'matched',
		});
		expect(
			resolvePolicyRules({ countryCode: 'US', regionCode: 'NY', rules })
		).toMatchObject({
			policy: { prompt: 'none' },
			policyId: 'world_opt_out_no_prompt',
		});
	});

	test('customizing a regional preset does not mutate later instances', () => {
		const first = policyRulePresets.usPrivacyStatesOptOut();
		first.match.regions?.pop();
		first.privacySignals?.gpc?.denyCategories?.pop();
		expect(
			policyRulePresets.usPrivacyStatesOptOut().match.regions
		).toHaveLength(20);
		expect(
			policyRulePresets.usPrivacyStatesOptOut().privacySignals?.gpc
				?.denyCategories
		).toEqual(['marketing', 'measurement']);
		const country = policyRulePresets.singaporeOptIn();
		country.review?.assumptions?.push('Local amendment');
		expect(
			policyRulePresets.singaporeOptIn().review?.assumptions
		).not.toContain('Local amendment');
	});
});

describe('reviewed opt-out and statistics profiles', () => {
	test.each([
		['australiaOptOut', 'AU'],
		['japanOptOut', 'JP'],
	] as const)(
		'%s keeps no prompt and generic persistent controls',
		(name, countryCode) => {
			const rule = policyRulePresets[name]();
			expect(
				resolvePolicyRules({ countryCode, regionCode: null, rules: [rule] })
			).toMatchObject({
				policy: {
					i18n: { messageProfile: 'preferences' },
					model: 'opt-out',
					prompt: 'none',
				},
				status: 'matched',
			});
			expect(rule.privacySignals).toBeUndefined();
		}
	);

	test.each(['canadaOptIn', 'canadaOptOut'] as const)(
		'%s excludes Quebec and an unknown province',
		(name) => {
			const rule = policyRulePresets[name]();
			for (const regionCode of [
				'AB',
				'BC',
				'MB',
				'NB',
				'NL',
				'NS',
				'NT',
				'NU',
				'ON',
				'PE',
				'SK',
				'YT',
			]) {
				expect(
					resolvePolicyRules({ countryCode: 'CA', regionCode, rules: [rule] })
				).toMatchObject({ policyId: rule.id, status: 'matched' });
			}
			for (const regionCode of ['QC', null]) {
				expect(
					resolvePolicyRules({ countryCode: 'CA', regionCode, rules: [rule] })
						.status
				).not.toBe('matched');
			}
		}
	);

	test('Canadian notice is optional and Quebec keeps its own choice', () => {
		const canada = policyRulePresets.canadaOptOut();
		const rules = [
			canada,
			policyRulePresets.quebecOptIn(),
			policyRulePresets.europeOptIn(),
			policyRulePresets.worldOptOutNoPrompt(),
		];
		expect(
			resolvePolicyRules({ countryCode: 'CA', regionCode: 'ON', rules })
		).toMatchObject({ policy: { prompt: 'notice' } });
		expect(
			resolvePolicyRules({ countryCode: 'CA', regionCode: 'QC', rules })
		).toMatchObject({ policyId: 'quebec_opt_in' });
		expect(
			resolvePolicyRules({ countryCode: 'CA', regionCode: null, rules })
		).toMatchObject({ matchedBy: 'fallback', policyId: 'europe_opt_in' });
		expect(normalizePolicyRule({ ...canada, prompt: 'none' }).prompt).toBe(
			'none'
		);
	});

	test.each(['ukStatistics', 'malaysiaStatistics'] as const)(
		'%s permits only reviewed measurement',
		(name) => {
			const rule = normalizePolicyRule(policyRulePresets[name]());
			expect(rule).toMatchObject({
				model: 'opt-out',
				prompt: 'none',
				scope: ['measurement'],
				scopeMode: 'strict',
			});
		}
	);
});
