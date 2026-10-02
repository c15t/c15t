import * as v from 'valibot';
import { describe, expect, test } from 'vitest';

import { partialTranslationsSchema } from '../api/init';
import {
	buildConsentManifestFromConfig,
	resolveInitFromManifest,
} from './consent-manifest';
import {
	readPolicyResolutionWire,
	resolvePolicyRules,
	writePolicyResolutionWire,
} from './policy-resolution';
import { inspectPolicyRules, normalizePolicyRule } from './policy-rule';
import type { PolicyRule } from './policy-rule';
import {
	choicePromptFingerprintInput,
	createPolicyRuleFingerprints,
	noticePromptFingerprintInput,
	policyFingerprintInput,
} from './policy-rule-fingerprint';
import { policyRulePresets } from './policy-rule-presets';
import { policyResolutionWireSchema } from './policy-wire-schema';

const uk: PolicyRule = {
	exemptions: { measurement: { kind: 'uk-statistics', revision: '1' } },
	id: 'uk-mixed',
	match: { countries: ['GB'] },
	model: 'opt-in',
	prompt: 'choice',
	scopeMode: 'strict',
};

const errorsFor = (patch: Record<string, unknown>) =>
	inspectPolicyRules([{ ...uk, ...patch }]).errors;

describe('UK PECR policy exemptions', () => {
	test('preserves exemption disclosures and control labels in backend translations', () => {
		const common = {
			consentRequired: 'Requires consent',
			exemptAppearanceNotice:
				'We remember your appearance preference. You can object in settings.',
			exemptProcessing: 'Allowed without consent. You can object.',
			exemptStatisticsNotice:
				'We collect service statistics. You can object in settings.',
		};
		const translated = v.parse(partialTranslationsSchema, {
			common,
			consentManagerDialog: {},
			consentTypes: {},
			cookieBanner: {},
			frame: {},
			legalLinks: {},
		});
		expect(translated.common).toEqual(common);
	});

	test('manifests preserve exempt policies and reject altered non-UK matchers', async () => {
		const manifest = await buildConsentManifestFromConfig({
			policyRules: [uk],
		});
		const init = resolveInitFromManifest(manifest, { country: 'GB' });
		expect(init.policyResolution.version).toBe(2);
		expect(init.policyResolution.status).toBe('matched');
		const pack = manifest.policyPacks?.[0];
		if (!pack) {
			throw new Error('Missing UK pack');
		}
		const invalid = {
			...manifest,
			policyPacks: [{ ...pack, match: { countries: ['DE'] } }],
		};
		expect(
			resolveInitFromManifest(invalid, { country: 'DE' }).policyResolution
		).toMatchObject({
			policy: null,
			reason: 'invalid-configuration',
			status: 'failed',
		});
	});

	test('the mixed preset requires an explicit eligibility review revision', () => {
		expect(() => policyRulePresets.ukStatisticsAndConsent(' ')).toThrow(
			/revision/u
		);
		const policy = normalizePolicyRule(
			policyRulePresets.ukStatisticsAndConsent('review-1')
		);
		expect(policy.model).toBe('opt-in');
		expect(policy.scope).toEqual(['marketing', 'measurement']);
		expect(policy.scopeMode).toBe('strict');
		expect(policy.exemptions).toEqual({
			measurement: { kind: 'uk-statistics', revision: 'review-1' },
		});
	});

	test('normalizes operator revisions and keeps appearance declarations independent', () => {
		const normalized = normalizePolicyRule({
			...uk,
			exemptions: {
				functionality: { kind: 'uk-appearance', revision: '2' },
				measurement: { kind: 'uk-statistics', revision: '  reviewed-1  ' },
			},
		});
		expect(normalized.exemptions).toEqual({
			functionality: { kind: 'uk-appearance', revision: '2' },
			measurement: { kind: 'uk-statistics', revision: 'reviewed-1' },
		});
		expect(normalized.scope).toContain('marketing');
	});

	test.each([
		{ countries: ['GB', 'DE'] },
		{ countries: ['GB'], isDefault: true },
		{ countries: ['GB'], fallback: true },
		{ isDefault: true },
		{ regions: [{ country: 'DE', region: 'BE' }] },
		{ countries: ['GB'], regionFallbacks: ['US'] },
	])('rejects declarations that could apply outside the UK: %j', (match) => {
		expect(errorsFor({ match }).join(' ')).toContain('GB-only');
	});

	test('accepts GB regions and country-specific region fallbacks', () => {
		expect(
			errorsFor({
				match: {
					regionFallbacks: ['GB'],
					regions: [{ country: 'gb', region: 'ENG' }],
				},
			})
		).toEqual([]);
	});

	test.each([
		{},
		{ marketing: { kind: 'uk-statistics', revision: '1' } },
		{ necessary: { kind: 'uk-appearance', revision: '1' } },
		{ measurement: { kind: 'uk-appearance', revision: '1' } },
		{ functionality: { kind: 'uk-statistics', revision: '1' } },
		{ measurement: { kind: 'uk-statistics', revision: ' ' } },
		{ measurement: { kind: 'uk-statistics', revision: 1 } },
		{ measurement: { eligible: true, kind: 'uk-statistics', revision: '1' } },
		{ measurement: Object.create({ kind: 'uk-statistics', revision: '1' }) },
	])('rejects invalid eligibility declarations: %j', (exemptions) => {
		expect(errorsFor({ exemptions }).length).toBeGreaterThan(0);
	});

	test('rejects declarations outside the rule scope and incompatible models', () => {
		expect(errorsFor({ categories: ['marketing'] }).join(' ')).toContain(
			'outside the policy scope'
		);
		for (const model of ['iab', 'none']) {
			expect(errorsFor({ model }).join(' ')).toContain('opt-in or opt-out');
		}
	});

	test('does not apply exemptions for an EU or unknown location', () => {
		for (const countryCode of ['DE', null]) {
			const resolution = resolvePolicyRules({
				countryCode,
				regionCode: null,
				rules: [uk],
			});
			expect(resolution.status).not.toBe('matched');
			expect(resolution.policy).toBeNull();
		}
	});

	test('versions only exemption-enabled fingerprints and invalidates grants on removal', () => {
		const exempt = normalizePolicyRule(uk);
		const ordinary = normalizePolicyRule({ ...uk, exemptions: undefined });
		const changed = normalizePolicyRule({
			...uk,
			exemptions: { measurement: { kind: 'uk-statistics', revision: '2' } },
		});
		for (const input of [
			policyFingerprintInput,
			choicePromptFingerprintInput,
			noticePromptFingerprintInput,
		]) {
			expect(input(ordinary).version).toBe(1);
			expect(input(ordinary)).not.toHaveProperty('exemptions');
			expect(input(exempt).version).toBe(2);
		}
		const hashes = createPolicyRuleFingerprints(exempt);
		const ordinaryHashes = createPolicyRuleFingerprints(ordinary);
		const changedHashes = createPolicyRuleFingerprints(changed);
		expect(hashes.policy).not.toBe(ordinaryHashes.policy);
		expect(hashes.choice).not.toBe(ordinaryHashes.choice);
		expect(hashes.notice).not.toBe(ordinaryHashes.notice);
		expect(hashes.choice).not.toBe(changedHashes.choice);
	});

	test('reads and validates extension wires while preserving ordinary version 1 output', () => {
		const resolution = resolvePolicyRules({
			countryCode: 'GB',
			regionCode: null,
			rules: [uk],
		});
		const wire = writePolicyResolutionWire(resolution);
		expect(wire.version).toBe(2);
		expect(readPolicyResolutionWire(wire)).toEqual(resolution);
		expect(v.safeParse(policyResolutionWireSchema, wire).success).toBe(true);
		const oldWire = { ...wire, version: 1 };
		expect(readPolicyResolutionWire(oldWire)).toEqual({
			policy: null,
			reason: 'unsupported-contract',
			status: 'failed',
		});
		expect(v.safeParse(policyResolutionWireSchema, oldWire).success).toBe(
			false
		);
		expect(
			writePolicyResolutionWire({ policy: null, status: 'unconfigured' })
				.version
		).toBe(1);
	});

	test('both wire readers reject invalid exemption category/kind pairs', () => {
		const resolution = resolvePolicyRules({
			countryCode: 'GB',
			regionCode: null,
			rules: [uk],
		});
		if (resolution.status !== 'matched') {
			throw new Error('UK rule did not resolve');
		}
		for (const exemptions of [
			undefined,
			{},
			{ marketing: { kind: 'uk-statistics', revision: '1' } },
			{ measurement: { kind: 'uk-appearance', revision: '1' } },
			{ measurement: { kind: 'uk-statistics', revision: '' } },
		]) {
			const invalidWire = {
				...writePolicyResolutionWire(resolution),
				policy: { ...resolution.policy, exemptions },
			};
			expect(readPolicyResolutionWire(invalidWire).status).toBe('failed');
			expect(v.safeParse(policyResolutionWireSchema, invalidWire).success).toBe(
				false
			);
		}
	});
});
