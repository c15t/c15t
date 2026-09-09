import { createConsentManifestPolicyPack } from '@c15t/schema/types';
import type { ConsentManifest } from '@c15t/schema/types';

/** Shared manifest fixture for the SvelteKit layer tests. */
export const MANIFEST_FIXTURE = {
	branding: 'c15t',
	policyPacks: [
		createConsentManifestPolicyPack({
			categories: ['marketing', 'measurement'],
			id: 'eu-opt-in',
			match: { countries: ['DE'] },
			model: 'opt-in',
			prompt: 'choice',
		}),
		createConsentManifestPolicyPack({
			id: 'notice-default',
			match: { fallback: true, isDefault: true },
			model: 'opt-out',
			prompt: 'none',
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
						de: { common: { acceptAll: 'Alle akzeptieren' } },
						en: { common: { acceptAll: 'Accept all' } },
					},
				},
			},
		},
	},
} satisfies ConsentManifest;
