import type { ConsentStoreState } from '@c15t/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderLocationPanel } from '../../panels/location';

const createBaseState = function createBaseState(
	overrides: Partial<ConsentStoreState>
): ConsentStoreState {
	return {
		initDataSource: null,
		initDataSourceDetail: null,
		lastBannerFetchData: null,
		locationInfo: {
			countryCode: 'US',
			jurisdiction: 'CCPA',
			regionCode: 'CA',
		},
		model: 'opt-in',
		overrides: undefined,
		policyBanner: {
			allowedActions: null,
			direction: null,
			layout: null,
			primaryActions: null,
			scrollLock: null,
			uiProfile: null,
		},
		policyCategories: null,
		policyDialog: {
			allowedActions: null,
			direction: null,
			layout: null,
			primaryActions: null,
			scrollLock: null,
			uiProfile: null,
		},
		policyScopeMode: null,
		translationConfig: {
			defaultLanguage: 'en',
			translations: {},
		},
		...overrides,
	} as unknown as ConsentStoreState;
};

describe('location panel', () => {
	let container: HTMLDivElement;

	beforeEach(() => {
		container = document.createElement('div');
	});

	it('renders compact active policy summary when runtime policy is present', () => {
		const state = createBaseState({
			initDataSource: 'backend-cache-hit',
			initDataSourceDetail: 'x-vercel-cache=HIT',
			lastBannerFetchData: {
				branding: 'c15t',
				jurisdiction: 'CCPA',
				location: {
					countryCode: 'US',
					regionCode: 'CA',
				},
				policy: {
					consent: {
						categories: ['necessary', 'measurement'],

						expiryDays: 365,
						scopeMode: 'permissive',
					},
					i18n: {
						messageProfile: 'us_ca',
					},
					id: 'policy_us_ca',
					model: 'opt-in',
					proof: {
						storeIp: true,
						storeLanguage: false,

						storeUserAgent: true,
					},

					ui: {
						banner: {
							allowedActions: ['accept', 'reject'],
							direction: 'row',

							layout: [['reject', 'accept']],
							primaryActions: ['accept'],
						},

						mode: 'banner',
					},
				},
				policyDecision: {
					country: 'US',
					fingerprint:
						'f470109af469620656707632979f2f8058edbb081c09848499cef03b305f8363',
					jurisdiction: 'CCPA',

					matchedBy: 'region',
					policyId: 'policy_us_ca',
					region: 'CA',
				},
				policySnapshotToken: 'token-123',
				translations: {
					language: 'en',
					translations: {},
				},
			} as unknown as ConsentStoreState['lastBannerFetchData'],
			policyBanner: {
				allowedActions: ['accept', 'reject'],
				direction: 'row',
				layout: [['reject', 'accept']],
				primaryActions: ['accept'],
				scrollLock: null,
				uiProfile: null,
			},
			policyCategories: ['necessary', 'measurement'],
			policyScopeMode: 'permissive',
		});

		renderLocationPanel(container, {
			getState: () => state,
			onApplyOverrides: vi.fn(),
			onClearOverrides: vi.fn(),
		});

		expect(container.textContent).toContain('Active Policy');
		expect(container.textContent).toContain('policy_us_ca');
		expect(container.textContent).toContain('region');
		expect(container.textContent).toContain('present');
		expect(container.textContent).toContain(
			'Backend (Cache Hit) [x-vercel-cache=HIT]'
		);
		expect(container.textContent).toContain(
			'Open the Policy tab for full policy-pack diagnostics.'
		);
	});

	it('shows empty policy state when no policy is active', () => {
		const state = createBaseState({
			initDataSource: 'offline-fallback',
			lastBannerFetchData: {
				branding: 'c15t',
				jurisdiction: 'NONE',
				location: { countryCode: 'AU', regionCode: null },
				translations: { language: 'en', translations: {} },
			} as unknown as ConsentStoreState['lastBannerFetchData'],
		});

		renderLocationPanel(container, {
			getState: () => state,
			onApplyOverrides: vi.fn(),
			onClearOverrides: vi.fn(),
		});

		expect(container.textContent).toContain('Active Policy');
		expect(container.textContent).toContain('No active policy matched.');
		expect(container.textContent).toContain('Offline Fallback');
	});
});
