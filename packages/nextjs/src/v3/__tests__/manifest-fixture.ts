import type { ConsentManifest } from '@c15t/schema/types';

export const MANIFEST_FIXTURE = {
	schemaVersion: 1,
	revision: 'manifest-revision',
	branding: 'c15t',
	policyPacks: [
		{
			policy: {
				id: 'eu-opt-in',
				match: { countries: ['DE'] },
				consent: {
					model: 'opt-in',
					expiryDays: 365,
					scopeMode: 'strict',
					categories: ['necessary', 'measurement', 'marketing'],
				},
				ui: { mode: 'banner' },
			},
			resolvedPolicy: {
				id: 'eu-opt-in',
				model: 'opt-in',
				consent: {
					expiryDays: 365,
					scopeMode: 'strict',
					categories: ['necessary', 'measurement', 'marketing'],
				},
				ui: { mode: 'banner' },
				proof: {},
			},
			fingerprint: 'eu-fingerprint',
		},
		{
			policy: {
				id: 'us-ca-opt-out',
				match: { regions: [{ country: 'US', region: 'CA' }] },
				consent: {
					model: 'opt-out',
					expiryDays: 365,
					scopeMode: 'permissive',
					categories: ['necessary', 'marketing'],
					gpc: true,
				},
				ui: { mode: 'banner' },
			},
			resolvedPolicy: {
				id: 'us-ca-opt-out',
				model: 'opt-out',
				consent: {
					expiryDays: 365,
					scopeMode: 'permissive',
					categories: ['necessary', 'marketing'],
					gpc: true,
				},
				ui: { mode: 'banner' },
				proof: {},
			},
			fingerprint: 'ca-fingerprint',
		},
		{
			policy: {
				id: 'notice-default',
				match: { isDefault: true },
				consent: {
					model: 'none',
					expiryDays: 30,
					scopeMode: 'permissive',
					categories: ['necessary'],
				},
				ui: { mode: 'none' },
			},
			resolvedPolicy: {
				id: 'notice-default',
				model: 'none',
				consent: {
					expiryDays: 30,
					scopeMode: 'permissive',
					categories: ['necessary'],
				},
				ui: { mode: 'none' },
				proof: {},
			},
			fingerprint: 'notice-fingerprint',
		},
	],
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
