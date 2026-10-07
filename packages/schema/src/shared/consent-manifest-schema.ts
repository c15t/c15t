import { enTranslations } from '@c15t/translations';
import type { Translations } from '@c15t/translations';
import * as v from 'valibot';

import { brandingSchema } from './branding';
import { resolvePolicyResolutionFromManifest } from './consent-manifest';
import type {
	ConsentManifest,
	ConsentManifestPolicyPack,
} from './consent-manifest';
import { nonIABVendorSchema } from './non-iab-vendor';
import { isPlainPolicyObject } from './policy-rule-invariants';
import {
	plainObjectSchema,
	policyFingerprintsSchema,
	resolvedPolicyRuleSchema,
} from './policy-wire-schema';
import type { I18nMessageProfiles } from './translations-runtime';
import { vendorSchema } from './vendor';

/** Keep partial copy shaped like the default translations, including legacy frame copy. */
const translationTemplate = {
	...enTranslations,
	frame: enTranslations.consentGate,
};

const isTranslationTree = (
	input: unknown,
	template: Record<string, unknown>
): boolean =>
	isPlainPolicyObject(input) &&
	Object.entries(input).every(([key, value]) => {
		const expected = template[key];
		if (typeof expected === 'string') {
			return typeof value === 'string';
		}
		if (isPlainPolicyObject(expected)) {
			return isTranslationTree(value, expected);
		}
		return typeof value === 'string' || isTranslationTree(value, {});
	});

const translationOverridesSchema = v.custom<
	Record<string, Partial<Translations>>
>(
	(input) =>
		isPlainPolicyObject(input) &&
		Object.values(input).every((overrides) =>
			isTranslationTree(overrides, translationTemplate)
		),
	'Expected language-indexed translation copy'
);

const messageProfilesSchema = v.record(
	v.string(),
	v.looseObject({
		fallbackLanguage: v.optional(v.string()),
		translations: translationOverridesSchema,
	})
);

const policyPackSchema = v.strictObject({
	fingerprints: policyFingerprintsSchema,
	match: v.pipe(
		plainObjectSchema,
		v.strictObject({
			countries: v.optional(v.array(v.string())),
			fallback: v.optional(v.boolean()),
			isDefault: v.optional(v.boolean()),
			regionFallbacks: v.optional(v.array(v.string())),
			regions: v.optional(
				v.array(v.strictObject({ country: v.string(), region: v.string() }))
			),
		})
	),
	rule: resolvedPolicyRuleSchema,
});

const manifestSchema: v.GenericSchema<unknown, ConsentManifest> = v.looseObject(
	{
		appName: v.optional(v.string()),
		branding: brandingSchema,
		cmpId: v.optional(v.number()),
		iab: v.optional(
			v.looseObject({
				customVendors: v.optional(v.array(nonIABVendorSchema)),
				enabled: v.boolean(),
				gvl: v.optional(
					v.looseObject({
						url: v.string(),
						version: v.optional(v.union([v.number(), v.string()])),
					})
				),
			})
		),
		policyFailure: v.optional(
			v.object({
				errors: v.array(v.string()),
				reason: v.literal('invalid-configuration'),
			})
		),
		policyPacks: v.optional(
			v.array(
				v.custom<ConsentManifestPolicyPack>((input) =>
					v.is(policyPackSchema, input)
				)
			)
		),
		revision: v.string(),
		schemaVersion: v.literal(2),
		tenantId: v.optional(v.string()),
		translations: v.optional(
			v.looseObject({
				customTranslations: v.optional(translationOverridesSchema),
				i18n: v.optional(
					v.looseObject({
						defaultProfile: v.optional(v.string()),
						messages: v.optional(
							v.custom<I18nMessageProfiles>(
								(input) =>
									isPlainPolicyObject(input) &&
									v.is(messageProfilesSchema, input),
								'Expected message profiles'
							)
						),
					})
				),
			})
		),
		vendorListVersion: v.optional(v.string()),
		vendors: v.optional(v.array(vendorSchema)),
	}
);

/**
 * Validates a fetched manifest before a build accepts it.
 * @param input - Untrusted JSON from the manifest endpoint.
 * @returns The manifest with a supported contract and valid policy packs.
 * @throws {Error} When required fields, policy packs or optional data are invalid.
 * @internal
 */
export const parseConsentManifest = (input: unknown): ConsentManifest => {
	const manifest = v.parse(manifestSchema, input);
	const resolution = resolvePolicyResolutionFromManifest(
		{ ...manifest, policyFailure: undefined },
		{ countryCode: null, regionCode: null }
	);
	if (
		resolution.status === 'failed' &&
		resolution.reason === 'invalid-configuration'
	) {
		throw new TypeError('Invalid manifest policy packs.');
	}
	return manifest;
};
