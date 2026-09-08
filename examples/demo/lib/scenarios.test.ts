import { resolvePolicyRules } from '@c15t/schema/types';
import { createConsentKernel, resolveConsentPresentation } from 'c15t';
import { describe, expect, it } from 'vitest';

import { playgroundPresets, presentationForRule } from './policy-playground';
import {
	demoScenarios,
	getScenarioById,
	getScenarioPolicyRules,
} from './scenarios';

describe('demo policy scenarios', () => {
	it.each([
		['US', 'NY', 'none', true],
		['US', 'CO', 'none', true],
		['CN', null, 'choice', false],
		['MY', null, 'choice', false],
		['BR', null, 'choice', false],
		[null, null, 'choice', false],
	] as const)(
		'combined presets give %s/%s a %s prompt',
		(countryCode, regionCode, prompt, marketing) => {
			const rules = playgroundPresets
				.filter(
					({ id }) =>
						![
							'ukStatistics',
							'malaysiaStatistics',
							'australiaOptOut',
							'japanOptOut',
							'canadaOptIn',
						].includes(id) &&
						id !== 'europeIab' &&
						id !== 'usPrivacyStatesOptIn' &&
						id !== 'californiaOptIn' &&
						id !== 'californiaOptOut' &&
						id !== 'switzerlandOptOutNoPrompt'
				)
				.map(({ rule }) => rule);
			const kernel = createConsentKernel({
				initialPolicyResolution: resolvePolicyRules({
					countryCode,
					regionCode,
					rules,
				}),
			});
			expect(kernel.getSnapshot().promptRequirement.kind).toBe(prompt);
			expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(
				marketing
			);
			expect(kernel.getSnapshot().explicitChoice).toBeNull();
			kernel.dispose();
		}
	);
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
	it('offers notice dismissal and one button to open opt-out preferences', () => {
		const scenario = getScenarioById('custom-us-notice');
		const resolution = resolvePolicyRules({
			countryCode: scenario.country,
			regionCode: null,
			rules: getScenarioPolicyRules(scenario.id),
		});
		if (resolution.status !== 'matched') {
			throw new Error('Scenario did not match');
		}
		expect(resolution.policy.prompt).toBe('notice');
		const prompt = resolveConsentPresentation({
			policy: resolution.policy,
			surface: 'prompt',
		});
		expect(prompt.orderedActions).toEqual(['dismiss']);
		expect(prompt.preferenceControls).toEqual(['opt-out']);
	});
	it('covers the California opt-out with reject and adds a preferences link', () => {
		const scenario = getScenarioById('custom-ca-do-not-sell');
		expect(scenario.policy.model).toBe('opt-out');
		const resolution = resolvePolicyRules({
			countryCode: 'US',
			regionCode: 'CA',
			rules: getScenarioPolicyRules(scenario.id),
		});
		if (resolution.status !== 'matched') {
			throw new Error('Scenario did not match');
		}
		const prompt = resolveConsentPresentation({
			policy: resolution.policy,
			presentation: scenario.presentation,
			surface: 'prompt',
		});
		expect(prompt.orderedActions).toEqual(['accept', 'reject']);
		expect(prompt.preferenceControls).toEqual(['preferences']);
	});
	it('renders the US notice as a floating bottom-left card through the demo map', () => {
		const scenario = getScenarioById('custom-us-notice');
		expect(scenario.presentation).toBeUndefined();
		const demoPresentation = presentationForRule(scenario.policy);
		expect(demoPresentation).toEqual({
			position: 'bottom-left',
			variant: 'floating',
		});
		expect(scenario.runtimePresentation).toEqual({ prompt: demoPresentation });
		// Explicit presentation wins over the map.
		const wall = getScenarioById('custom-eu-wall');
		expect(wall.runtimePresentation).toBe(wall.presentation);
		const resolution = resolvePolicyRules({
			countryCode: scenario.country,
			regionCode: null,
			rules: getScenarioPolicyRules(scenario.id),
		});
		if (resolution.status !== 'matched') {
			throw new Error('Scenario did not match');
		}
		const prompt = resolveConsentPresentation({
			policy: resolution.policy,
			presentation: { prompt: demoPresentation },
			surface: 'prompt',
		});
		expect(prompt.variant).toBe('floating');
		expect(prompt.position).toBe('bottom-left');
		expect(prompt.positionSource).toBe('host');
		expect(prompt.blocking).toBe(false);
		expect(prompt.diagnostics).toEqual([]);
	});
	it('renders the EU wall as a centered blocking prompt', () => {
		const scenario = getScenarioById('custom-eu-wall');
		expect(scenario.policy.model).toBe('opt-in');
		const resolution = resolvePolicyRules({
			countryCode: scenario.country,
			regionCode: null,
			rules: getScenarioPolicyRules(scenario.id),
		});
		if (resolution.status !== 'matched') {
			throw new Error('Scenario did not match');
		}
		const prompt = resolveConsentPresentation({
			policy: resolution.policy,
			presentation: scenario.presentation,
			surface: 'prompt',
		});
		expect(prompt.variant).toBe('wall');
		expect(prompt.position).toBe('center');
		expect(prompt.blocking).toBe(true);
		expect(prompt.trapFocus).toBe(true);
		expect(prompt.scrollLock).toBe(true);
		expect(prompt.diagnostics).toEqual([]);
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
	it('the US opt-in variant blocks tracking before choice and honors GPC after accept', async () => {
		const kernel = createConsentKernel({
			initialPolicyResolution: resolvePolicyRules({
				countryCode: 'US',
				regionCode: 'CO',
				rules: getScenarioPolicyRules('preset-us-privacy-states-opt-in'),
			}),
		});
		expect(kernel.getSnapshot().promptRequirement.kind).toBe('choice');
		expect(kernel.getSnapshot().effectivePermissions).toMatchObject({
			marketing: false,
			measurement: false,
		});
		await kernel.commands.save('all');
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(true);
		kernel.set.privacySignals({ gpc: true });
		await kernel.commands.save('all');
		expect(kernel.getSnapshot().effectivePermissions).toMatchObject({
			marketing: false,
			measurement: false,
		});
		expect(kernel.getSnapshot().explicitChoice).not.toBeNull();
		kernel.dispose();
	});
	it('the US states preset preserves GPC restrictions when its notice is dismissed', async () => {
		const kernel = createConsentKernel({
			initialPolicyResolution: resolvePolicyRules({
				countryCode: 'US',
				regionCode: 'CO',
				rules: getScenarioPolicyRules('preset-us-privacy-states'),
			}),
		});
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(true);
		kernel.set.privacySignals({ gpc: true });
		await kernel.commands.dismissNotice();
		expect(kernel.getSnapshot().explicitChoice).toBeNull();
		expect(kernel.getSnapshot().effectivePermissions).toMatchObject({
			marketing: false,
			measurement: false,
		});
		expect(kernel.getSnapshot().promptRequirement.kind).toBe('none');
		kernel.dispose();
	});
});
