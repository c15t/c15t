import type { PolicyConfig } from '~/types';
import { policyMatchers } from './matchers';

export type EuropePolicyMode = 'opt-in' | 'iab';

function californiaPolicy(mode: 'opt-in' | 'opt-out'): PolicyConfig {
	return {
		id:
			mode === 'opt-in'
				? 'policy_default_california_opt_in'
				: 'policy_default_california_opt_out',
		name:
			mode === 'opt-in'
				? 'California Opt-In Banner'
				: 'California Opt-Out Banner',
		match: policyMatchers.regions([{ country: 'US', region: 'CA' }]),
		consent: {
			model: mode,
			expiryDays: 365,
		},
		ui: {
			mode: 'banner',
			banner: {
				allowedActions: ['accept', 'reject', 'customize'],
				primaryAction: mode === 'opt-in' ? 'customize' : 'reject',
				uiProfile: 'balanced',
			},
			dialog: {
				allowedActions: ['accept', 'reject', 'customize'],
				primaryAction: mode === 'opt-in' ? 'customize' : 'reject',
				uiProfile: 'balanced',
			},
		},
		proof: {
			storeIp: true,
			storeUserAgent: true,
			storeLanguage: false,
		},
	};
}

function europePolicy(mode: EuropePolicyMode): PolicyConfig {
	const isIab = mode === 'iab';
	return {
		id: isIab ? 'policy_default_europe_iab' : 'policy_default_europe_opt_in',
		name: isIab ? 'Europe IAB Banner' : 'Europe Opt-In Banner',
		match: policyMatchers.iab(),
		consent: {
			model: mode,
			expiryDays: 365,
			...(isIab ? { purposeIds: ['*'] } : {}),
		},
		...(!isIab
			? {
					ui: {
						mode: 'banner' as const,
						banner: {
							allowedActions: ['accept', 'reject', 'customize'],
							primaryAction: 'accept' as const,
							uiProfile: 'balanced' as const,
						},
						dialog: {
							allowedActions: ['accept', 'reject', 'customize'],
							primaryAction: 'accept' as const,
							uiProfile: 'balanced' as const,
						},
					},
				}
			: {}),
		proof: {
			storeIp: true,
			storeUserAgent: true,
			storeLanguage: true,
		},
	};
}

function worldNoBannerPolicy(): PolicyConfig {
	return {
		id: 'policy_default_world_no_banner',
		name: 'World No Banner',
		match: policyMatchers.default(),
		consent: { model: 'none' },
		ui: { mode: 'none' },
		proof: {
			storeIp: false,
			storeUserAgent: true,
			storeLanguage: false,
		},
	};
}

function legacyOptInFallbackPolicy(): PolicyConfig {
	return {
		id: 'policy_default_regulated_opt_in',
		name: 'Legacy Regulated Opt-In',
		match: policyMatchers.jurisdictions([
			'CH',
			'BR',
			'APPI',
			'PIPA',
			'QC_LAW25',
		]),
		consent: {
			model: 'opt-in',
			expiryDays: 365,
		},
		ui: {
			mode: 'banner',
			banner: {
				allowedActions: ['accept', 'reject', 'customize'],
				primaryAction: 'accept',
				uiProfile: 'balanced',
			},
			dialog: {
				allowedActions: ['accept', 'reject', 'customize'],
				primaryAction: 'accept',
				uiProfile: 'balanced',
			},
		},
		proof: {
			storeIp: true,
			storeUserAgent: true,
			storeLanguage: false,
		},
	};
}

function legacyOptOutFallbackPolicy(): PolicyConfig {
	return {
		id: 'policy_default_regulated_opt_out',
		name: 'Legacy Regulated Opt-Out',
		match: policyMatchers.jurisdictions(['CCPA', 'AU', 'PIPEDA']),
		consent: {
			model: 'opt-out',
			expiryDays: 365,
		},
		ui: {
			mode: 'banner',
			banner: {
				allowedActions: ['accept', 'reject', 'customize'],
				primaryAction: 'reject',
				uiProfile: 'strict',
			},
			dialog: {
				allowedActions: ['accept', 'reject', 'customize'],
				primaryAction: 'reject',
				uiProfile: 'strict',
			},
		},
		proof: {
			storeIp: true,
			storeUserAgent: true,
			storeLanguage: false,
		},
	};
}

export const policyDefaults = {
	europeOptInBanner: (): PolicyConfig => europePolicy('opt-in'),
	europeIabBanner: (): PolicyConfig => europePolicy('iab'),
	worldNoBanner: (): PolicyConfig => worldNoBannerPolicy(),
	californiaOptInBanner: (): PolicyConfig => californiaPolicy('opt-in'),
	californiaOptOutBanner: (): PolicyConfig => californiaPolicy('opt-out'),
	legacyJurisdictionOptInFallback: (): PolicyConfig =>
		legacyOptInFallbackPolicy(),
	legacyJurisdictionOptOutFallback: (): PolicyConfig =>
		legacyOptOutFallbackPolicy(),
	legacyCompatiblePack: (): PolicyConfig[] => [
		californiaPolicy('opt-out'),
		europePolicy('opt-in'),
		legacyOptInFallbackPolicy(),
		legacyOptOutFallbackPolicy(),
		worldNoBannerPolicy(),
	],
};
