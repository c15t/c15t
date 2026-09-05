import { assert, describe, expect, test } from 'vitest';

import { createConsentManifestPolicyPack } from './consent-manifest';
import { createMaterialPolicyFingerprintSync } from './policy-fingerprint';
import { resolvePolicyRules } from './policy-resolution';
import { policyRulePresets } from './policy-rule-presets';

const originalHashes = {
	californiaOptIn:
		'853108c1a016f8684fa542a54b59930fdbe7b933a9c67607717f2d12f645bb4f',
	californiaOptOut:
		'071ca579036f43b53790c7d934ece26b9535eb394ef101f4e18c547acc7b82da',
	europeIab: 'e86078b4e8a0972035eda14a9b1b3afa592ddb12e8a40a42bb1b332091c6dff5',
	europeOptIn:
		'7d6f3c71d9c6c6dae0730bd6cfec93f79dbdee423f854ae0efd43e974b657230',
	quebecOptIn:
		'7d6f3c71d9c6c6dae0730bd6cfec93f79dbdee423f854ae0efd43e974b657230',
	worldOptOutNoPrompt:
		'3962d294c9537de285a4af031cc3123c463f6e97b4cb97ac60ac97930b025a94',
} as const;
describe('lifetime v2 material receipt compatibility', () => {
	test.each(Object.keys(originalHashes) as (keyof typeof originalHashes)[])(
		'%s matches original producer bytes in manifest and offline paths',
		(name) => {
			const rule = policyRulePresets[name]();
			expect(
				createConsentManifestPolicyPack(rule).fingerprints.legacyMaterial
			).toBe(originalHashes[name]);
			const resolved = resolvePolicyRules({
				countryCode: null,
				regionCode: null,
				rules: [{ ...rule, match: { isDefault: true } }],
			});
			expect(resolved).toMatchObject({
				fingerprints: { legacyMaterial: originalHashes[name] },
				status: 'matched',
			});
		}
	);
	test('keeps original array order and presentation hash fields', () => {
		const original = policyRulePresets.europeOptIn().legacyMaterial?.input;
		assert(original);
		const changed = structuredClone(original);
		assert(changed.ui?.banner);
		changed.ui.banner.direction = 'column';
		expect(createMaterialPolicyFingerprintSync(changed)).not.toBe(
			createMaterialPolicyFingerprintSync(original)
		);
	});
	test('a material change invalidates legacy compatibility even when a preset is spread', () => {
		const original = policyRulePresets.europeOptIn();
		const changed = { ...original, validity: { choiceDays: 30 } };
		expect(
			createConsentManifestPolicyPack(changed).fingerprints.legacyMaterial
		).not.toBe(originalHashes.europeOptIn);
	});
});
