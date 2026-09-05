import { resolvePolicyRules } from '@c15t/schema/types';
import { createConsentKernel, resolveConsentPresentation } from 'c15t';
import { describe, expect, it } from 'vitest';

import {
	demoScenarios,
	getScenarioById,
	getScenarioPolicyRules,
} from './scenarios';

describe('demo policy scenarios', () => {
	it.each(demoScenarios)(
		'$id resolves its authored rule and preserves preference access',
		(scenario) => {
			const resolution = resolvePolicyRules({
				countryCode: scenario.country,
				regionCode: scenario.region ?? null,
				rules: getScenarioPolicyRules(scenario.id),
			});
			expect(resolution.status).toBe('matched');
			if (resolution.status !== 'matched') {
				throw new Error('Scenario did not match');
			}
			expect(resolution.policy.id).toBe(scenario.policy.id);
			const preferences = resolveConsentPresentation({
				policy: resolution.policy,
				presentation: scenario.presentation,
				surface: 'preferences',
			});
			expect(preferences.orderedActions).toContain('save');
			expect(preferences.diagnostics).toEqual([]);
			expect(preferences.orderedActions).toContain('reject');
			const prompt = resolveConsentPresentation({
				policy: resolution.policy,
				presentation: scenario.presentation,
				surface: 'prompt',
			});
			if (resolution.policy.prompt === 'choice') {
				expect(prompt.orderedActions).toEqual(
					expect.arrayContaining(['accept', 'reject'])
				);
				expect(prompt.primaryActions.includes('accept')).toBe(
					prompt.primaryActions.includes('reject')
				);
			}
		}
	);
	it('preserves the Spanish split layout independently from policy rules', () => {
		const scenario = getScenarioById('custom-es-split-stack');
		expect(scenario.presentation?.prompt?.layout).toEqual([
			'customize',
			['reject', 'accept'],
		]);
		expect(scenario.policy).not.toHaveProperty('ui');
	});
	it('does not create a choice for the explicit no-prompt default', () => {
		const scenario = getScenarioById('preset-world-no-banner');
		const kernel = createConsentKernel({
			initialPolicyResolution: resolvePolicyRules({
				countryCode: scenario.country,
				regionCode: null,
				rules: getScenarioPolicyRules(scenario.id),
			}),
		});
		expect(kernel.getSnapshot().promptRequirement.kind).toBe('none');
		expect(kernel.getSnapshot().explicitChoice).toBeNull();
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(true);
		kernel.dispose();
	});
	it('keeps unknown scenario links usable', () => {
		expect(getScenarioById('unknown').id).toBe('preset-europe-opt-in');
		expect(getScenarioPolicyRules('unknown')).toHaveLength(2);
	});
	it('keeps the California receipt while GPC restricts marketing', async () => {
		const kernel = createConsentKernel({
			initialPolicyResolution: resolvePolicyRules({
				countryCode: 'US',
				regionCode: 'CA',
				rules: getScenarioPolicyRules('custom-ca-do-not-sell'),
			}),
		});
		await kernel.commands.save('all');
		const receipt = kernel.getSnapshot().explicitChoice;
		kernel.set.privacySignals({ gpc: true });
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(false);
		expect(kernel.getSnapshot().explicitChoice).toEqual(receipt);
		kernel.dispose();
	});
});
