import type { ResolvedPolicy } from '~/api/init';
import type {
	PolicyUiActionGroup,
	PolicyUiSurfaceConfig,
} from './policy-runtime';

/**
 * Shared compact UI profile — identical to the europeOptIn policy-pack preset
 * so that offline mode and hosted mode produce the same banner/dialog layout.
 */
function createCompactUiProfile(): PolicyUiSurfaceConfig {
	return {
		allowedActions: ['accept', 'reject', 'customize'],
		layout: [['reject', 'accept'], 'customize'] as PolicyUiActionGroup[],
		direction: 'row',
		primaryActions: ['customize'],
		uiProfile: 'compact',
	};
}

function offlineOptInBannerPolicy(): ResolvedPolicy {
	return {
		id: 'offline_opt_in_banner',
		model: 'opt-in',
		consent: {
			expiryDays: 365,
		},
		ui: {
			mode: 'banner',
			banner: createCompactUiProfile(),
			dialog: createCompactUiProfile(),
		},
	};
}

function offlineNoBannerPolicy(): ResolvedPolicy {
	return {
		id: 'offline_no_banner',
		model: 'none',
		ui: {
			mode: 'none',
		},
	};
}

export interface PolicyDefaults {
	offlineOptInBanner: () => ResolvedPolicy;
	offlineIab: () => ResolvedPolicy;
	offlineNoBanner: () => ResolvedPolicy;
}

function offlineIabPolicy(): ResolvedPolicy {
	return {
		id: 'offline_iab',
		model: 'iab',
		consent: {
			expiryDays: 365,
			scopeMode: 'permissive',
			categories: ['*'],
		},
	};
}

export const policyDefaults: PolicyDefaults = {
	offlineOptInBanner: () => offlineOptInBannerPolicy(),
	offlineIab: () => offlineIabPolicy(),
	offlineNoBanner: () => offlineNoBannerPolicy(),
};
