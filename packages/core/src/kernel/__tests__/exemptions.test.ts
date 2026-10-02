import {
	resolvePolicyRules,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import type { PolicyRule } from '@c15t/schema/types';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { evaluateConsentRecord } from '../../consent-record/evaluate';
import { validateExemptionPreferences } from '../../consent-record/validation';
import { createConsentKernel } from '../../kernel';
import { getEffectiveGateState, evaluateConsent } from '../../modules/has';
import { getCategoryPreference } from '../../policy';
import type { SavePayload } from '../../types';

const NOW = 1_700_000_000_000;
const ukRule: PolicyRule = {
	categories: ['measurement', 'marketing'],
	exemptions: { measurement: { kind: 'uk-statistics', revision: '1' } },
	id: 'uk-mixed',
	match: { countries: ['GB'] },
	model: 'opt-in',
	prompt: 'choice',
	scopeMode: 'strict',
};
const euRule: PolicyRule = {
	categories: ['measurement', 'marketing'],
	id: 'fallback',
	match: { isDefault: true },
	model: 'opt-in',
	prompt: 'choice',
	scopeMode: 'strict',
};
const resolution = (countryCode = 'GB', rules = [ukRule, euRule]) =>
	resolvePolicyRules({ countryCode, regionCode: null, rules });
const policyByKernel = new WeakMap<
	ReturnType<typeof createConsentKernel>,
	ReturnType<typeof resolution>
>();
const makeKernel = () => {
	const kernel = createConsentKernel({
		initialPolicyResolution: resolution(),
		now: NOW,
		transport: {
			init: () =>
				Promise.resolve({
					policyResolution: writePolicyResolutionWire(
						policyByKernel.get(kernel) ?? resolution()
					),
				}),
		},
	});
	return kernel;
};
const changePolicy = async (
	kernel: ReturnType<typeof createConsentKernel>,
	next: ReturnType<typeof resolution>
) => {
	policyByKernel.set(kernel, next);
	await kernel.commands.init();
};
beforeEach(() => {
	vi.spyOn(Date, 'now').mockReturnValue(NOW);
});
const kernels: ReturnType<typeof createConsentKernel>[] = [];
const kernelForTest = () => {
	const kernel = makeKernel();
	kernels.push(kernel);
	return kernel;
};
afterEach(() => {
	for (const kernel of kernels.splice(0)) {
		kernel.dispose();
	}
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe('mixed exemptions and consent', () => {
	test('allows declared statistics without a consent receipt and still asks for advertising', () => {
		const snapshot = kernelForTest().getSnapshot();
		expect(snapshot.explicitChoice).toBeNull();
		expect(snapshot.exemptionPreferences).toBeNull();
		expect(snapshot.effectivePermissions).toMatchObject({
			marketing: false,
			measurement: true,
		});
		expect(snapshot.promptRequirement).toEqual({
			kind: 'choice',
			reason: 'missing',
		});
		expect(getCategoryPreference(snapshot, 'measurement')).toBe(true);
		const evaluated = evaluateConsentRecord({
			choice: null,
			noticeDismissal: null,
			now: NOW,
			policy: snapshot.evaluationPolicy,
		});
		expect(evaluated.categories.measurement.source).toBe('exemption');
		expect(evaluated.categories.measurement.authority).toBe('absent');
	});

	test('an objection alone does not satisfy the advertising consent prompt', async () => {
		const kernel = kernelForTest();
		await kernel.commands.save({ measurement: false });
		expect(
			kernel.getSnapshot().explicitChoice?.categories.measurement
		).toBeUndefined();
		expect(
			kernel.getSnapshot().exemptionPreferences?.categories.measurement?.value
		).toBe(false);
		expect(kernel.getSnapshot().effectivePermissions.measurement).toBe(false);
		expect(kernel.getSnapshot().promptRequirement.kind).toBe('choice');
	});

	test('accepting all consent-required processing preserves an existing statistics objection', async () => {
		const kernel = kernelForTest();
		await kernel.commands.save({ measurement: false });
		const objection = kernel.getSnapshot().exemptionPreferences;
		await kernel.commands.save('all');
		expect(kernel.getSnapshot().exemptionPreferences).toBe(objection);
		expect(kernel.getSnapshot().effectivePermissions).toMatchObject({
			marketing: true,
			measurement: false,
		});
		expect(kernel.getSnapshot().promptRequirement.kind).toBe('none');
		expect(
			kernel.getSnapshot().explicitChoice?.categories.measurement
		).toBeUndefined();
	});

	test('reject all objects to exempt processing too, and reversing it never creates consent', async () => {
		const kernel = kernelForTest();
		await kernel.commands.save('none');
		expect(kernel.getSnapshot().effectivePermissions).toMatchObject({
			marketing: false,
			measurement: false,
		});
		await kernel.commands.save({ measurement: true });
		expect(kernel.getSnapshot().effectivePermissions.measurement).toBe(true);
		expect(
			kernel.getSnapshot().explicitChoice?.categories.measurement
		).toBeUndefined();
		await changePolicy(kernel, resolution('DE'));
		expect(kernel.getSnapshot().effectivePermissions.measurement).toBe(false);
	});

	test('removing or revising an exemption never promotes its preference into consent', async () => {
		const kernel = kernelForTest();
		await kernel.commands.save({ marketing: true, measurement: true });
		await changePolicy(
			kernel,
			resolution('GB', [
				{
					...ukRule,
					exemptions: { measurement: { kind: 'uk-statistics', revision: '2' } },
				},
				euRule,
			])
		);
		expect(kernel.getSnapshot().effectivePermissions.measurement).toBe(true);
		const { exemptions: _removed, ...ordinaryUk } = ukRule;
		await changePolicy(kernel, resolution('GB', [ordinaryUk, euRule]));
		expect(kernel.getSnapshot().effectivePermissions.measurement).toBe(false);
		expect(kernel.getSnapshot().promptRequirement.kind).toBe('choice');
	});

	test('reload preserves an objection without a consent expiry', async () => {
		const kernel = kernelForTest();
		await kernel.commands.save({ marketing: true, measurement: false });
		const snapshot = kernel.getSnapshot();
		const reloaded = createConsentKernel({
			initialPolicyResolution: resolution(),
			initialRecords: {
				choice: snapshot.explicitChoice,
				exemptionPreferences: snapshot.exemptionPreferences,
			},
			now: NOW + 40_000_000_000,
		});
		kernels.push(reloaded);
		expect(reloaded.getSnapshot().effectivePermissions.measurement).toBe(false);
		expect(reloaded.getSnapshot().effectivePermissions.marketing).toBe(false);
		expect(
			getEffectiveGateState(snapshot, NOW + 40_000_000_000).effectivePermissions
				.measurement
		).toBe(false);
	});

	test('old explicit refusals survive exemptions until deliberately reversed', async () => {
		const kernel = kernelForTest();
		kernel.hydrate({
			choice: {
				categories: {
					measurement: {
						basis: { kind: 'legacy-v2' },
						confirmedAt: NOW - 1,
						value: false,
					},
				},
				version: 3,
			},
		});
		expect(kernel.getSnapshot().effectivePermissions.measurement).toBe(false);
		await kernel.commands.save({ measurement: true });
		expect(kernel.getSnapshot().effectivePermissions.measurement).toBe(true);
		expect(
			kernel.getSnapshot().explicitChoice?.categories.measurement
		).toBeUndefined();
	});

	test('a newer explicit consent choice can reverse an objection after a region switch', async () => {
		const kernel = kernelForTest();
		await kernel.commands.save({ measurement: false });
		await changePolicy(kernel, resolution('DE'));
		vi.mocked(Date.now).mockReturnValue(NOW + 1);
		await kernel.commands.save({ measurement: true });
		expect(kernel.getSnapshot().effectivePermissions.measurement).toBe(true);
	});

	test('unknown and EU geography stay opt-in', () => {
		for (const country of ['DE', 'ZZ']) {
			const kernel = createConsentKernel({
				initialPolicyResolution: resolution(country),
				now: NOW,
			});
			kernels.push(kernel);
			expect(kernel.getSnapshot().effectivePermissions.measurement).toBe(false);
		}
	});

	test('GPC can further restrict exempt processing', () => {
		const kernel = createConsentKernel({
			initialPolicyResolution: resolution('GB', [
				{
					...ukRule,
					privacySignals: { gpc: { denyCategories: ['measurement'] } },
				},
				euRule,
			]),
			now: NOW,
		});
		kernels.push(kernel);
		kernel.set.privacySignals({ gpc: true });
		expect(kernel.getSnapshot().effectivePermissions.measurement).toBe(false);
		kernel.set.privacySignals({ gpc: false });
		expect(
			evaluateConsent({ category: 'measurement' }, kernel.getSnapshot())
		).toBe(true);
	});

	test('sends preference evidence separately and emits no choice event for an exemption-only save', async () => {
		const save = vi.fn((_payload: SavePayload) =>
			Promise.resolve({ ok: true as const })
		);
		const kernel = createConsentKernel({
			initialPolicyResolution: resolution(),
			now: NOW,
			transport: { save },
		});
		kernels.push(kernel);
		const choice = vi.fn();
		const preference = vi.fn();
		kernel.events.on('choice:recorded', choice);
		kernel.events.on('exemption:recorded', preference);
		await kernel.commands.save({ measurement: false });
		expect(choice).not.toHaveBeenCalled();
		expect(preference).toHaveBeenCalledOnce();
		expect(save).toHaveBeenCalledWith(
			expect.objectContaining({
				confirmed: { actionAt: NOW, categories: {} },
				exemptionPreferences: {
					categories: { measurement: { confirmedAt: NOW, value: false } },
					version: 1,
				},
			})
		);
	});

	test('accept all preserves objections to vendors in exempt categories', async () => {
		const kernel = createConsentKernel({
			initialPolicyResolution: resolution(),
			initialRecords: {
				vendorChoice: {
					confirmedAt: NOW - 1,
					denied: ['ads', 'stats'],
					version: 1,
				},
			},
			initialVendors: {
				declared: [
					{
						category: 'measurement',
						id: 'stats',
						name: 'Service statistics',
						presentable: true,
						source: 'config',
					},
					{
						category: 'marketing',
						id: 'ads',
						name: 'Advertising',
						presentable: true,
						source: 'config',
					},
				],
				listVersion: null,
			},
			now: NOW,
		});
		kernels.push(kernel);
		await kernel.commands.save('all');
		expect(kernel.getSnapshot().vendorChoice?.denied).toEqual(['stats']);
		expect(
			evaluateConsent(
				{ category: 'measurement', vendor: 'stats' },
				kernel.getSnapshot()
			)
		).toBe(false);
		expect(
			evaluateConsent(
				{ category: 'marketing', vendor: 'ads' },
				kernel.getSnapshot()
			)
		).toBe(true);
		expect(kernel.getSnapshot().exemptionPreferences).toBeNull();
	});

	test('invalid partial selection makes no preference or consent changes', async () => {
		const kernel = kernelForTest();
		const before = kernel.getSnapshot();
		const result = await kernel.commands.save({
			marketing: 'yes',
			measurement: false,
		} as never);
		expect(result.ok).toBe(false);
		expect(kernel.getSnapshot()).toBe(before);
	});

	test('all-exempt scope requires no consent acknowledgement', () => {
		const kernel = createConsentKernel({
			initialPolicyResolution: resolution('GB', [
				{ ...ukRule, categories: ['measurement'] },
			]),
			now: NOW,
		});
		kernels.push(kernel);
		expect(kernel.getSnapshot().promptRequirement.kind).toBe('none');
	});
});

test('rejects invalid exemption preference records', () => {
	expect(
		validateExemptionPreferences(
			{
				categories: { measurement: { confirmedAt: NOW + 1, value: false } },
				version: 1,
			},
			NOW
		).ok
	).toBe(false);
	expect(
		validateExemptionPreferences(
			{
				categories: {
					measurement: { basis: 'consent', confirmedAt: NOW, value: true },
				},
				version: 1,
			},
			NOW
		).ok
	).toBe(false);
});
