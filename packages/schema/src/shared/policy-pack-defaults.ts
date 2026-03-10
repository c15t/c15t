import type { PolicyConfig } from './policy-runtime';
import { policyMatchers } from './policy-runtime';

/**
 * Preset Europe pack mode used by {@link policyPackPresets}.
 *
 * @see {@link https://v2.c15t.com/docs/frameworks/react/policy-packs}
 */
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
				uiProfile: 'compact',
			},
			dialog: {
				allowedActions: ['accept', 'reject', 'customize'],
				primaryAction: mode === 'opt-in' ? 'customize' : 'reject',
				uiProfile: 'compact',
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
			...(isIab ? { categories: ['*'] } : {}),
		},
		...(!isIab
			? {
					ui: {
						mode: 'banner' as const,
						banner: {
							allowedActions: ['accept', 'reject', 'customize'],
							primaryAction: 'customize',
							uiProfile: 'compact',
						},
						dialog: {
							allowedActions: ['accept', 'reject', 'customize'],
							primaryAction: 'customize',
							uiProfile: 'compact',
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

function quebecPolicy(): PolicyConfig {
	return {
		id: 'policy_default_quebec_opt_in',
		name: 'Quebec Opt-In Banner',
		match: policyMatchers.regions([{ country: 'CA', region: 'QC' }]),
		consent: {
			model: 'opt-in',
			expiryDays: 365,
		},
		ui: {
			mode: 'banner',
			banner: {
				allowedActions: ['accept', 'reject', 'customize'],
				primaryAction: 'customize',
				uiProfile: 'compact',
			},
			dialog: {
				allowedActions: ['accept', 'reject', 'customize'],
				primaryAction: 'customize',
				uiProfile: 'compact',
			},
		},
		proof: {
			storeIp: true,
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

export interface PolicyPackPresets {
	/**
	 * Europe opt-in preset (GDPR jurisdictions).
	 */
	europeOptIn: () => PolicyConfig;
	/**
	 * Europe IAB TCF 2.3 preset.
	 */
	europeIab: () => PolicyConfig;
	/**
	 * World fallback with no banner — use as the default policy.
	 */
	worldNoBanner: () => PolicyConfig;
	/**
	 * California opt-in preset (US-CA region).
	 */
	californiaOptIn: () => PolicyConfig;
	/**
	 * California opt-out preset (US-CA region).
	 */
	californiaOptOut: () => PolicyConfig;
	/**
	 * Quebec opt-in preset (CA-QC region).
	 */
	quebecOptIn: () => PolicyConfig;
	/**
	 * Legacy opt-in fallback preset for older jurisdiction-driven setups.
	 */
	legacyJurisdictionOptIn: () => PolicyConfig;
	/**
	 * Legacy opt-out fallback preset for older jurisdiction-driven setups.
	 */
	legacyJurisdictionOptOut: () => PolicyConfig;
	/**
	 * Backward-compatible pack covering all legacy jurisdictions.
	 */
	legacyCompatiblePack: () => PolicyConfig[];
}

/**
 * Built-in policy pack presets for common regional starting points.
 *
 * @remarks
 * These helpers are convenient for demos, tests, local previews, and initial
 * backend bootstrapping. Treat them as starter presets rather than a complete
 * legal policy strategy.
 *
 * @example
 * ```ts
 * import { policyPackPresets } from 'c15t';
 *
 * const packs = [
 *   policyPackPresets.europeOptIn(),
 *   policyPackPresets.californiaOptOut(),
 *   policyPackPresets.worldNoBanner(),
 * ];
 * ```
 *
 * @see {@link https://v2.c15t.com/docs/frameworks/react/policy-packs}
 * @see {@link https://v2.c15t.com/docs/self-host/guides/policy-packs}
 */
export const policyPackPresets: PolicyPackPresets = {
	europeOptIn: () => europePolicy('opt-in'),
	europeIab: () => europePolicy('iab'),
	worldNoBanner: () => worldNoBannerPolicy(),
	californiaOptIn: () => californiaPolicy('opt-in'),
	californiaOptOut: () => californiaPolicy('opt-out'),
	quebecOptIn: () => quebecPolicy(),
	legacyJurisdictionOptIn: () => legacyOptInFallbackPolicy(),
	legacyJurisdictionOptOut: () => legacyOptOutFallbackPolicy(),
	legacyCompatiblePack: () => [
		californiaPolicy('opt-out'),
		europePolicy('opt-in'),
		legacyOptInFallbackPolicy(),
		legacyOptOutFallbackPolicy(),
		worldNoBannerPolicy(),
	],
};
