import type { ConsentManifest } from '@c15t/schema/types';

/** Shared manifest fixture for the SvelteKit layer tests. */
export const MANIFEST_FIXTURE = {
	branding: 'c15t',
	policyPacks: [
		{
			fingerprint: 'eu-fingerprint',
			policy: {
				consent: {
					categories: ['necessary', 'measurement', 'marketing'],
					expiryDays: 365,
					model: 'opt-in',
					scopeMode: 'strict',
				},
				id: 'eu-opt-in',
				match: { countries: ['DE'] },
				ui: { mode: 'banner' },
			},
			resolvedPolicy: {
				consent: {
					categories: ['necessary', 'measurement', 'marketing'],
					expiryDays: 365,
					scopeMode: 'strict',
				},
				id: 'eu-opt-in',
				model: 'opt-in',
				proof: {},
				ui: { mode: 'banner' },
			},
		},
		{
			fingerprint: 'notice-fingerprint',
			policy: {
				consent: {
					categories: ['necessary'],
					expiryDays: 30,
					model: 'none',
					scopeMode: 'permissive',
				},
				id: 'notice-default',
				match: { isDefault: true },
				ui: { mode: 'none' },
			},
			resolvedPolicy: {
				consent: {
					categories: ['necessary'],
					expiryDays: 30,
					scopeMode: 'permissive',
				},
				id: 'notice-default',
				model: 'none',
				proof: {},
				ui: { mode: 'none' },
			},
		},
	],
	revision: 'manifest-revision',
	schemaVersion: 1,
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
