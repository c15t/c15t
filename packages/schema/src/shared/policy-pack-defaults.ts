import type { PolicyConfig, PolicyUiSurfaceConfig } from './policy-runtime';
import { policyMatchers } from './policy-runtime';

/**
 * Preset Europe pack mode used by {@link policyPackPresets}.
 *
 * @see {@link https://c15t.com/docs/frameworks/react/policy-packs}
 */
export type EuropePolicyMode = 'opt-in' | 'iab';

const createSplitRowUiProfile =
	function createSplitRowUiProfile(): PolicyUiSurfaceConfig {
		return {
			allowedActions: ['accept', 'reject', 'customize'],
			direction: 'row',
			layout: [['reject', 'accept'], 'customize'],
			primaryActions: ['customize'],
			uiProfile: 'compact',
		};
	};

const californiaPolicy = function californiaPolicy(
	mode: 'opt-in' | 'opt-out'
): PolicyConfig {
	const isOptOut = mode === 'opt-out';
	let ui: PolicyConfig['ui'];

	if (isOptOut) {
		ui = { mode: 'none' };
	} else {
		ui = {
			banner: createSplitRowUiProfile(),
			dialog: createSplitRowUiProfile(),
			mode: 'banner',
		};
	}

	return {
		consent: {
			expiryDays: 365,
			gpc: true,
			model: mode,
		},
		id: isOptOut ? 'california_opt_out' : 'california_opt_in',
		match: policyMatchers.regions([{ country: 'US', region: 'CA' }]),
		proof: {
			storeIp: true,
			storeLanguage: true,
			storeUserAgent: true,
		},
		ui,
	};
};

const europePolicy = function europePolicy(
	mode: EuropePolicyMode
): PolicyConfig {
	const isIab = mode === 'iab';
	const policy: PolicyConfig = {
		consent: (() => {
			const consent: PolicyConfig['consent'] = {
				expiryDays: 365,
				model: mode,
			};
			if (isIab) {
				consent.categories = ['*'];
			}
			return consent;
		})(),
		id: isIab ? 'europe_iab' : 'europe_opt_in',
		match: policyMatchers.merge(
			policyMatchers.iab(),
			policyMatchers.fallback()
		),
		proof: {
			storeIp: true,
			storeLanguage: true,
			storeUserAgent: true,
		},
	};

	if (!isIab) {
		policy.ui = {
			banner: createSplitRowUiProfile(),
			dialog: createSplitRowUiProfile(),
			mode: 'banner',
		};
	}

	return policy;
};

const worldNoBannerPolicy = function worldNoBannerPolicy(): PolicyConfig {
	return {
		consent: { model: 'none' },
		id: 'world_no_banner',
		match: policyMatchers.default(),
		proof: {
			storeIp: false,
			storeLanguage: false,
			storeUserAgent: true,
		},
		ui: { mode: 'none' },
	};
};

const quebecPolicy = function quebecPolicy(): PolicyConfig {
	return {
		consent: {
			expiryDays: 365,
			model: 'opt-in',
		},
		id: 'quebec_opt_in',
		match: policyMatchers.regions([{ country: 'CA', region: 'QC' }]),
		proof: {
			storeIp: true,
			storeLanguage: true,
			storeUserAgent: true,
		},
		ui: {
			banner: createSplitRowUiProfile(),
			dialog: createSplitRowUiProfile(),
			mode: 'banner',
		},
	};
};

export interface PolicyPackPresets {
	/**
	 * Europe opt-in preset (EEA + UK countries).
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
 * @see {@link https://c15t.com/docs/frameworks/react/policy-packs}
 * @see {@link https://c15t.com/docs/self-host/guides/policy-packs}
 */
export const policyPackPresets: PolicyPackPresets = {
	californiaOptIn: () => californiaPolicy('opt-in'),
	californiaOptOut: () => californiaPolicy('opt-out'),
	europeIab: () => europePolicy('iab'),
	europeOptIn: () => europePolicy('opt-in'),
	quebecOptIn: () => quebecPolicy(),
	worldNoBanner: () => worldNoBannerPolicy(),
};
