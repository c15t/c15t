import { policyRulePresets } from '@c15t/schema/types';
import { describe, expect, it } from 'vitest';

import {
	buildBackendSnippet,
	buildProviderSnippet,
	DEFAULT_PRESENTATION_FORM,
	defaultVariantFor,
	describeMatch,
	fromPolicyRule,
	getPlaygroundPreset,
	inspectPlaygroundRule,
	playgroundPresets,
	positionOptionsFor,
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
		expect(defaultVariantFor('notice')).toBe('bar');
		expect(positionOptionsFor('auto', 'notice')).toEqual(['top', 'bottom']);
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

	it('resolves the prompt surface and reports presentation diagnostics', () => {
		const rule = toPolicyRule(
			fromPolicyRule(policyRulePresets.californiaOptOut())
		);
		const notice = toPolicyRule({ ...fromPolicyRule(rule), prompt: 'notice' });
		const defaults = inspectPlaygroundRule(notice, {
			country: 'US',
			region: 'CA',
		});
		expect(defaults.presentation?.variant).toBe('bar');
		expect(defaults.presentation?.position).toBe('bottom');
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
		expect(withToolbar).toContain('    <ConsentDialogTriggerToolbar />\n');
	});
});
