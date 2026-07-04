import { describe, expect, it } from 'vitest';
import {
	GOOGLE_CONSENT_MODE_V2_DEFAULT_MAPPING,
	withOptionalConsentMapping,
} from './google-consent';

describe('google consent helpers', () => {
	it('exposes the shared Consent Mode v2 mapping', () => {
		expect(GOOGLE_CONSENT_MODE_V2_DEFAULT_MAPPING).toEqual({
			necessary: ['security_storage'],
			functionality: ['functionality_storage'],
			measurement: ['analytics_storage'],
			marketing: ['ad_storage', 'ad_user_data', 'ad_personalization'],
			experience: ['personalization_storage'],
		});
	});

	it('returns the original manifest when no override is provided', () => {
		const manifest = {
			vendor: 'gtag',
			consentMapping: GOOGLE_CONSENT_MODE_V2_DEFAULT_MAPPING,
		};

		expect(withOptionalConsentMapping(manifest, undefined)).toBe(manifest);
	});

	it('returns a manifest with an override mapping when provided', () => {
		const manifest = {
			vendor: 'gtag',
			consentMapping: GOOGLE_CONSENT_MODE_V2_DEFAULT_MAPPING,
		};
		const consentMapping = {
			measurement: ['analytics_storage'],
		};

		expect(withOptionalConsentMapping(manifest, consentMapping)).toEqual({
			vendor: 'gtag',
			consentMapping,
		});
	});
});
