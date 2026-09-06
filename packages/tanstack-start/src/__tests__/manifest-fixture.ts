import type { ConsentManifest } from '@c15t/schema/types';
import { createConsentManifestPolicyPack } from '@c15t/schema/types';

/** Shared manifest fixture for the promoted Next.js adapter tests. */
export const MANIFEST_FIXTURE = {
	branding: 'c15t',
	policyPacks: [
		createConsentManifestPolicyPack({
			categories: ['measurement', 'marketing'],
			id: 'eu-opt-in',
			match: { countries: ['DE'] },
			model: 'opt-in',
			prompt: 'choice',
			scopeMode: 'strict',
			validity: { choiceDays: 365 },
		}),
		createConsentManifestPolicyPack({
			categories: ['marketing'],
			id: 'us-ca-opt-out',
			match: { regions: [{ country: 'US', region: 'CA' }] },
			model: 'opt-out',
			privacySignals: { gpc: { denyCategories: ['marketing'] } },
			prompt: 'choice',
			scopeMode: 'permissive',
			validity: { choiceDays: 365 },
		}),
		createConsentManifestPolicyPack({
			categories: [],
			id: 'notice-default',
			match: { isDefault: true },
			model: 'opt-out',
			prompt: 'none',
			scopeMode: 'permissive',
			validity: { choiceDays: 30 },
		}),
	],
	revision: 'manifest-revision',
	schemaVersion: 2,
	translations: {
		i18n: {
			defaultProfile: 'default',
			messages: {
				default: {
					fallbackLanguage: 'en',
					translations: {
						de: {
							common: {
								acceptAll: 'Alle akzeptieren',
							},
						},
						en: {
							common: {
								acceptAll: 'Accept all',
							},
						},
					},
				},
			},
		},
	},
} satisfies ConsentManifest;
