import { policyRulePresets } from '@c15t/schema/types';
import { describe, expect, it } from 'vitest';

import {
	autoVariantFor,
	buildBackendSnippet,
	buildProviderSnippet,
	DEFAULT_PRESENTATION_FORM,
	DEMO_NOTICE_PRESENTATION,
	DEMO_PRESENTATION_BY_RULE,
	defaultVariantFor,
	describeMatch,
	fromPolicyRule,
	getPlaygroundPreset,
	inspectPlaygroundRule,
	playgroundPresets,
	positionOptionsFor,
	presentationForRule,
	resolvePlaygroundPresentation,
	setPresentationVariant,
	toConsentPresentation,
	toPolicyRule,
} from './policy-playground';

describe('policy playground helpers', () => {
	it('lists every shipped preset with a location that matches it', () => {
		expect(playgroundPresets.map((preset) => preset.id).sort()).toEqual(
			Object.keys(policyRulePresets).sort()
		);
		for (const preset of playgroundPresets) {
			const { resolution, errors } = inspectPlaygroundRule(preset.rule, {
				country: preset.country,
				region: preset.region ?? '',
			});
			expect(errors, preset.id).toEqual([]);
			expect(resolution.status, preset.id).toBe('matched');
		}
	});

	it('round-trips a preset through the form without changing behavior', () => {
		for (const preset of playgroundPresets) {
			const rebuilt = toPolicyRule(fromPolicyRule(preset.rule), preset.rule);
			const original = inspectPlaygroundRule(preset.rule, {
				country: preset.country,
				region: preset.region ?? '',
			});
			const roundTrip = inspectPlaygroundRule(rebuilt, {
				country: preset.country,
				region: preset.region ?? '',
			});
			expect(roundTrip.errors, preset.id).toEqual([]);
			expect(roundTrip.fingerprints?.policy, preset.id).toBe(
				original.fingerprints?.policy
			);
			expect(roundTrip.fingerprints?.choice, preset.id).toBe(
				original.fingerprints?.choice
			);
		}
	});

	it('reports an invalid prompt for the model instead of throwing', () => {
		const form = fromPolicyRule(policyRulePresets.europeOptIn());
		const rule = toPolicyRule({ ...form, prompt: 'none' });
		const inspection = inspectPlaygroundRule(rule, {
			country: 'GB',
			region: '',
		});
		expect(inspection.errors.length).toBeGreaterThan(0);
		expect(inspection.resolved).toBeNull();
		expect(inspection.resolution.status).toBe('failed');
	});

	it('changes the choice fingerprint when validity or copy revision change', () => {
		const base = getPlaygroundPreset('europeOptIn');
		const form = fromPolicyRule(base.rule);
		const before = inspectPlaygroundRule(toPolicyRule(form, base.rule), {
			country: 'GB',
			region: '',
		});
		const bumped = inspectPlaygroundRule(
			toPolicyRule({ ...form, copyRevision: 'v2' }, base.rule),
			{ country: 'GB', region: '' }
		);
		expect(bumped.fingerprints?.choice).not.toBe(before.fingerprints?.choice);
	});

	it('resolves regions before countries and falls back for unknown locations', () => {
		const california = toPolicyRule(
			fromPolicyRule(policyRulePresets.californiaOptOut())
		);
		expect(
			inspectPlaygroundRule(california, { country: 'US', region: 'CA' })
				.resolution.status
		).toBe('matched');
		expect(
			inspectPlaygroundRule(california, { country: 'US', region: 'NY' })
				.resolution.status
		).toBe('no-match');
		const europe = toPolicyRule(
			fromPolicyRule(policyRulePresets.europeOptIn())
		);
		const unknown = inspectPlaygroundRule(europe, { country: '', region: '' });
		expect(unknown.resolution.status).toBe('matched');
		expect(
			unknown.resolution.status === 'matched' && unknown.resolution.matchedBy
		).toBe('fallback');
	});

	it('describes match blocks for humans', () => {
		expect(describeMatch({ regions: [{ country: 'US', region: 'CA' }] })).toBe(
			'regions US-CA'
		);
		expect(describeMatch({ isDefault: true })).toBe(
			'default when nothing else matches'
		);
		expect(describeMatch({})).toBe('matches nothing');
	});

	it('narrows position options to the variant and drops invalid positions', () => {
		expect(positionOptionsFor('auto', 'choice')).toEqual(
			positionOptionsFor('floating', 'choice')
		);
		expect(defaultVariantFor('notice')).toBe('floating');
		expect(positionOptionsFor('auto', 'notice')).toEqual(
			positionOptionsFor('floating', 'notice')
		);
		expect(positionOptionsFor('auto', 'notice', 'bar')).toEqual([
			'top',
			'bottom',
		]);
		expect(positionOptionsFor('wall', 'choice')).toEqual(['center']);
		const floating = setPresentationVariant(
			{ ...DEFAULT_PRESENTATION_FORM, position: 'bottom-right' },
			'floating',
			'choice'
		);
		expect(floating.position).toBe('bottom-right');
		const bar = setPresentationVariant(floating, 'bar', 'choice');
		expect(bar.variant).toBe('bar');
		expect(bar.position).toBe('auto');
		const widget = setPresentationVariant(floating, 'widget', 'choice');
		expect(widget.position).toBe('bottom-right');
	});

	it('turns the presentation form into host presentation only when set', () => {
		expect(toConsentPresentation(DEFAULT_PRESENTATION_FORM)).toBeUndefined();
		expect(
			toConsentPresentation({
				blocking: true,
				position: 'top',
				variant: 'bar',
			})
		).toEqual({ prompt: { blocking: true, position: 'top', variant: 'bar' } });
	});

	it('maps each shipped preset to a demo presentation by rule id', () => {
		const europe = policyRulePresets.europeOptIn();
		expect(presentationForRule(europe)).toEqual({
			position: 'bottom-left',
			variant: 'floating',
		});
		expect(presentationForRule(policyRulePresets.quebecOptIn())).toEqual({
			variant: 'wall',
		});
		expect(presentationForRule(policyRulePresets.californiaOptIn())).toEqual({
			position: 'bottom-center',
			variant: 'floating',
		});
		// No prompt means no banner; the toolbar is the persistent route.
		expect(
			presentationForRule(policyRulePresets.californiaOptOut())
		).toBeUndefined();
		expect(
			presentationForRule(policyRulePresets.worldOptOutNoPrompt())
		).toBeUndefined();
		// IAB surfaces are not mapped at all.
		expect(presentationForRule(policyRulePresets.europeIab())).toBeUndefined();
		expect('europe_iab' in DEMO_PRESENTATION_BY_RULE).toBe(false);
		expect(
			presentationForRule({ id: 'unknown', prompt: 'choice' })
		).toBeUndefined();
		// Every mapped shape resolves without diagnostics against its preset.
		for (const preset of playgroundPresets) {
			const prompt = presentationForRule(preset.rule);
			if (!prompt) {
				continue;
			}
			const inspection = inspectPlaygroundRule(
				preset.rule,
				{ country: preset.country, region: preset.region ?? '' },
				{ prompt }
			);
			expect(inspection.presentationDiagnostics).toEqual([]);
		}
	});

	it('gives any notice prompt the notice shape ahead of the id map', () => {
		const notice = toPolicyRule({
			...fromPolicyRule(policyRulePresets.californiaOptOut()),
			prompt: 'notice',
		});
		expect(presentationForRule(notice)).toBe(DEMO_NOTICE_PRESENTATION);
		expect(presentationForRule({ id: 'europe_opt_in', prompt: 'notice' })).toBe(
			DEMO_NOTICE_PRESENTATION
		);
		expect(autoVariantFor(notice)).toBe('floating');
		expect(autoVariantFor(policyRulePresets.quebecOptIn())).toBe('wall');
		expect(autoVariantFor({ id: 'unmapped', prompt: 'choice' })).toBe(
			defaultVariantFor('choice')
		);
	});

	it('layers manual presentation fields over the demo map', () => {
		const quebec = policyRulePresets.quebecOptIn();
		const europe = policyRulePresets.europeOptIn();
		expect(
			resolvePlaygroundPresentation(DEFAULT_PRESENTATION_FORM, europe)
		).toEqual({ prompt: { position: 'bottom-left', variant: 'floating' } });
		// A manual variant drops the mapped position, which may not fit it.
		expect(
			resolvePlaygroundPresentation(
				{ ...DEFAULT_PRESENTATION_FORM, variant: 'bar' },
				europe
			)
		).toEqual({ prompt: { variant: 'bar' } });
		// A manual position keeps the mapped variant.
		expect(
			resolvePlaygroundPresentation(
				{ ...DEFAULT_PRESENTATION_FORM, position: 'top-right' },
				europe
			)
		).toEqual({ prompt: { position: 'top-right', variant: 'floating' } });
		expect(
			resolvePlaygroundPresentation(
				{ ...DEFAULT_PRESENTATION_FORM, blocking: true },
				quebec
			)
		).toEqual({ prompt: { blocking: true, variant: 'wall' } });
		// Unmapped rules with an untouched form pass nothing to the provider.
		expect(
			resolvePlaygroundPresentation(DEFAULT_PRESENTATION_FORM, {
				id: 'unmapped',
				prompt: 'choice',
			})
		).toBeUndefined();
		// Position options follow the mapped variant while the form is auto.
		expect(
			positionOptionsFor('auto', 'choice', autoVariantFor(quebec))
		).toEqual(['center']);
	});

	it('resolves the prompt surface and reports presentation diagnostics', () => {
		const rule = toPolicyRule(
			fromPolicyRule(policyRulePresets.californiaOptOut())
		);
		const notice = toPolicyRule({ ...fromPolicyRule(rule), prompt: 'notice' });
		const defaults = inspectPlaygroundRule(notice, {
			country: 'US',
			region: 'CA',
		});
		expect(defaults.presentation?.variant).toBe('floating');
		expect(defaults.presentation?.position).toBe('bottom-left');
		expect(defaults.presentation?.positionSource).toBe('default');
		expect(defaults.presentationDiagnostics).toEqual([]);
		const blocked = inspectPlaygroundRule(
			notice,
			{ country: 'US', region: 'CA' },
			{ prompt: { blocking: true, position: 'center', variant: 'bar' } }
		);
		expect(blocked.presentation?.blocking).toBe(false);
		expect(blocked.presentation?.position).toBe('bottom');
		expect(
			blocked.presentationDiagnostics.map((diagnostic) => diagnostic.code)
		).toEqual(
			expect.arrayContaining(['blocking-forbidden', 'invalid-position'])
		);
		const invalid = inspectPlaygroundRule(
			toPolicyRule({ ...fromPolicyRule(rule), prompt: 'none' }),
			{ country: 'US', region: 'CA' }
		);
		expect(invalid.presentation?.variant).toBe('floating');
	});

	it('emits the preset factory for untouched presets and JSON otherwise', () => {
		const rule = policyRulePresets.quebecOptIn();
		expect(buildProviderSnippet(rule, 'quebecOptIn')).toContain(
			'policyRulePresets.quebecOptIn()'
		);
		const custom = buildProviderSnippet({ ...rule, id: 'qc_custom' }, null);
		expect(custom).toContain('"id": "qc_custom"');
		expect(custom).not.toContain('legacyMaterial');
		expect(custom).not.toContain('review');
		expect(buildBackendSnippet(rule, 'quebecOptIn')).toContain(
			"from '@c15t/backend'"
		);
		expect(buildProviderSnippet(rule, 'quebecOptIn')).not.toContain(
			'presentation:'
		);
		expect(
			buildProviderSnippet(rule, 'quebecOptIn', {
				prompt: { variant: 'wall' },
			})
		).toContain('presentation: {"prompt":{"variant":"wall"}}');
		expect(buildProviderSnippet(rule, 'quebecOptIn')).not.toContain(
			'ConsentDialogTriggerToolbar'
		);
		const withToolbar = buildProviderSnippet(rule, 'quebecOptIn', undefined, {
			toolbar: true,
		});
		expect(withToolbar).toContain(
			"import { ConsentBanner, ConsentDialog, ConsentDialogTriggerToolbar, ConsentProvider, offline } from 'c15t/react';"
		);
		expect(withToolbar).toContain(
			'    <ConsentDialogTriggerToolbar showWhen="after-prompt" />\n'
		);
	});
});
