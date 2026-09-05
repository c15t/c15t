import type { LegacyMaterialCompatibility } from './legacy-material-policy';

/** Frozen preset receipt inputs. Do not update when current preset behavior changes. */
export const legacyPresetMaterial = {
	californiaOptIn: {
		input: {
			consent: {
				expiryDays: 365,
				gpc: true,
				scopeMode: 'permissive',
			},
			model: 'opt-in',
			proof: {
				storeIp: true,
				storeLanguage: true,
				storeUserAgent: true,
			},
			ui: {
				banner: {
					allowedActions: ['accept', 'reject', 'customize'],
					direction: 'row',
					layout: [['reject', 'accept'], ['customize']],
					primaryActions: ['customize'],
				},
				dialog: {
					allowedActions: ['accept', 'reject', 'customize'],
					direction: 'row',
					layout: [['reject', 'accept'], ['customize']],
					primaryActions: ['customize'],
				},
				mode: 'banner',
			},
		},
		policyFingerprint:
			'd53c71dde91e3b9600ef910f284726d8b9b5e5d97989b355e016d013b6a12b69',
	},
	californiaOptOut: {
		input: {
			consent: {
				expiryDays: 365,
				gpc: true,
				scopeMode: 'permissive',
			},
			model: 'opt-out',
			proof: {
				storeIp: true,
				storeLanguage: true,
				storeUserAgent: true,
			},
			ui: {
				mode: 'none',
			},
		},
		policyFingerprint:
			'2add89cb0c497ef5bccaef815bae6277006e37bdc10d4d0e6b1f494aa754c087',
	},
	europeIab: {
		input: {
			consent: {
				categories: ['*'],
				expiryDays: 365,
				scopeMode: 'permissive',
			},
			model: 'iab',
			proof: {
				storeIp: true,
				storeLanguage: true,
				storeUserAgent: true,
			},
		},
		policyFingerprint:
			'cbbf5d147ac468a745e188b4e4681e60a04debcbad2d0d5bc0fc618c31b06dae',
	},
	europeOptIn: {
		input: {
			consent: {
				expiryDays: 365,
				scopeMode: 'permissive',
			},
			model: 'opt-in',
			proof: {
				storeIp: true,
				storeLanguage: true,
				storeUserAgent: true,
			},
			ui: {
				banner: {
					allowedActions: ['accept', 'reject', 'customize'],
					direction: 'row',
					layout: [['reject', 'accept'], ['customize']],
					primaryActions: ['customize'],
				},
				dialog: {
					allowedActions: ['accept', 'reject', 'customize'],
					direction: 'row',
					layout: [['reject', 'accept'], ['customize']],
					primaryActions: ['customize'],
				},
				mode: 'banner',
			},
		},
		policyFingerprint:
			'8aca68633714c54fb0a96eaee313aa415ae0a3137e56764cf629a20793b2f969',
	},
	quebecOptIn: {
		input: {
			consent: {
				expiryDays: 365,
				scopeMode: 'permissive',
			},
			model: 'opt-in',
			proof: {
				storeIp: true,
				storeLanguage: true,
				storeUserAgent: true,
			},
			ui: {
				banner: {
					allowedActions: ['accept', 'reject', 'customize'],
					direction: 'row',
					layout: [['reject', 'accept'], ['customize']],
					primaryActions: ['customize'],
				},
				dialog: {
					allowedActions: ['accept', 'reject', 'customize'],
					direction: 'row',
					layout: [['reject', 'accept'], ['customize']],
					primaryActions: ['customize'],
				},
				mode: 'banner',
			},
		},
		policyFingerprint:
			'8aca68633714c54fb0a96eaee313aa415ae0a3137e56764cf629a20793b2f969',
	},
	worldOptOutNoPrompt: {
		input: {
			consent: {
				scopeMode: 'permissive',
			},
			model: 'none',
			proof: {
				storeIp: false,
				storeLanguage: false,
				storeUserAgent: true,
			},
			ui: {
				mode: 'none',
			},
		},
		policyFingerprint:
			'92e599db3379c3b0a47db142ab9bc4d4a33e4b019ce2cd7a524528dee5fa93a4',
	},
} satisfies Record<string, LegacyMaterialCompatibility>;
