/**
 * Default c15t consent category mapping for Google Consent Mode v2.
 *
 * @remarks
 * Shared by direct gtag.js and Google Tag Manager integrations so both emit the
 * same Google storage consent defaults unless a caller provides an override.
 */
export const GOOGLE_CONSENT_MODE_V2_DEFAULT_MAPPING: Record<string, string[]> =
	{
		necessary: ['security_storage'],
		functionality: ['functionality_storage'],
		measurement: ['analytics_storage'],
		marketing: ['ad_storage', 'ad_user_data', 'ad_personalization'],
		experience: ['personalization_storage'],
	};

/**
 * Applies an optional Google consent mapping override to a manifest.
 *
 * @param manifest - Vendor manifest that already contains the default consent
 * mapping.
 * @param consentMapping - Optional caller-provided mapping from c15t consent
 * categories to Google consent types.
 * @returns The original manifest when no override is provided, or a shallow
 * copy with the override mapping when one is provided.
 */
export function withOptionalConsentMapping<
	TManifest extends {
		consentMapping?: Record<string, string[]>;
	},
>(
	manifest: TManifest,
	consentMapping: Record<string, string[]> | undefined
): TManifest {
	if (consentMapping === undefined) {
		return manifest;
	}

	return {
		...manifest,
		consentMapping,
	};
}
