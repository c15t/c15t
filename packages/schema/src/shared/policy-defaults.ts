import type { ResolvedPolicy } from '~/api/init';

import type {
	PolicyUiActionGroup,
	PolicyUiSurfaceConfig,
} from './policy-runtime';

/**
 * Shared compact UI profile — identical to the europeOptIn policy-pack preset
 * so that offline mode and hosted mode produce the same banner/dialog layout.
 */
const createCompactUiProfile =
	function createCompactUiProfile(): PolicyUiSurfaceConfig {
		return {
			allowedActions: ['accept', 'reject', 'customize'],
			direction: 'row',
			layout: [['reject', 'accept'], 'customize'] as PolicyUiActionGroup[],
			primaryActions: ['customize'],
			uiProfile: 'compact',
		};
	};

const offlineOptInBannerPolicy =
	function offlineOptInBannerPolicy(): ResolvedPolicy {
		return {
			consent: {
				expiryDays: 365,
			},
			id: 'offline_opt_in_banner',
			model: 'opt-in',
			ui: {
				banner: createCompactUiProfile(),
				dialog: createCompactUiProfile(),
				mode: 'banner',
			},
		};
	};

const offlineNoBannerPolicy = function offlineNoBannerPolicy(): ResolvedPolicy {
	return {
		id: 'offline_no_banner',
		model: 'none',
		ui: {
			mode: 'none',
		},
	};
};

export interface PolicyDefaults {
	offlineOptInBanner: () => ResolvedPolicy;
	offlineIab: () => ResolvedPolicy;
	offlineNoBanner: () => ResolvedPolicy;
}

const offlineIabPolicy = function offlineIabPolicy(): ResolvedPolicy {
	return {
		consent: {
			categories: ['*'],
			expiryDays: 365,
			scopeMode: 'permissive',
		},
		id: 'offline_iab',
		model: 'iab',
	};
};

export const policyDefaults: PolicyDefaults = {
	offlineIab: () => offlineIabPolicy(),
	offlineNoBanner: () => offlineNoBannerPolicy(),
	offlineOptInBanner: () => offlineOptInBannerPolicy(),
};
