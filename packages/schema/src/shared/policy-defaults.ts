import type { ResolvedPolicy } from '~/api/init';
import type { PolicyUiActionGroup } from './policy-runtime';

const DEFAULT_ACTIONS = ['reject', 'accept', 'customize'] as const;
const DEFAULT_LAYOUT: PolicyUiActionGroup[] = [
	['reject', 'accept'],
	'customize',
];

function offlineOptInBannerPolicy(): ResolvedPolicy {
	return {
		id: 'offline_opt_in_banner',
		model: 'opt-in',
		consent: {
			expiryDays: 365,
			scopeMode: 'permissive',
			categories: ['*'],
		},
		ui: {
			mode: 'banner',
			banner: {
				allowedActions: [...DEFAULT_ACTIONS],
				primaryAction: 'customize',
				layout: DEFAULT_LAYOUT,
				direction: 'row',
				uiProfile: 'balanced',
			},
			dialog: {
				allowedActions: [...DEFAULT_ACTIONS],
				primaryAction: 'customize',
				layout: DEFAULT_LAYOUT,
				direction: 'row',
				uiProfile: 'balanced',
			},
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
