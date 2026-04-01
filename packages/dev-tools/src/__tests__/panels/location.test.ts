import type { ConsentStoreState } from 'c15t';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderLocationPanel } from '../../panels/location';

function createBaseState(
	overrides: Partial<ConsentStoreState>
): ConsentStoreState {
	return {
		locationInfo: {
			countryCode: 'US',
			regionCode: 'CA',
			jurisdiction: 'CCPA',
		},
		overrides: undefined,
		translationConfig: {
			defaultLanguage: 'en',
			translations: {},
		},
		model: 'opt-in',
		lastBannerFetchData: null,
		policyCategories: null,
		policyScopeMode: null,
		policyBanner: {
			allowedActions: null,
			primaryActions: null,
			layout: null,
			direction: null,
			uiProfile: null,
			scrollLock: null,
		},
		policyDialog: {
			allowedActions: null,
			primaryActions: null,
			layout: null,
			direction: null,
			uiProfile: null,
			scrollLock: null,
		},
		initDataSource: null,
		initDataSourceDetail: null,
		...overrides,
	} as unknown as ConsentStoreState;
}

describe('location panel', () => {
	let container: HTMLDivElement;

	beforeEach(() => {
		container = document.createElement('div');
	});

	it('renders compact active policy summary when runtime policy is present', () => {
		const state = createBaseState({
			policyCategories: ['necessary', 'measurement'],
			policyScopeMode: 'permissive',
			policyBanner: {
				allowedActions: ['accept', 'reject'],
				primaryActions: ['accept'],
				layout: [['reject', 'accept']],
				direction: 'row',
				uiProfile: null,
				scrollLock: null,
			},
			initDataSource: 'backend-cache-hit',
			initDataSourceDetail: 'x-vercel-cache=HIT',
			lastBannerFetchData: {
				jurisdiction: 'CCPA',
				location: {
					countryCode: 'US',
					regionCode: 'CA',
				},
				translations: {
					language: 'en',
					translations: {},
				},
				branding: 'c15t',
				policy: {
					id: 'policy_us_ca',
					model: 'opt-in',
					i18n: {
						messageProfile: 'us_ca',
					},
					consent: {
						scopeMode: 'permissive',
						expiryDays: 365,
						categories: ['necessary', 'measurement'],
					},
					ui: {
						mode: 'banner',
						banner: {
							allowedActions: ['accept', 'reject'],
							primaryActions: ['accept'],
							layout: [['reject', 'accept']],
							direction: 'row',
						},
					},
					proof: {
						storeIp: true,
						storeUserAgent: true,
						storeLanguage: false,
					},
				},
				policyDecision: {
					policyId: 'policy_us_ca',
					fingerprint:
						'f470109af469620656707632979f2f8058edbb081c09848499cef03b305f8363',
					matchedBy: 'region',
					country: 'US',
					region: 'CA',
					jurisdiction: 'CCPA',
				},
				policySnapshotToken: 'token-123',
			} as unknown as ConsentStoreState['lastBannerFetchData'],
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
				jurisdiction: 'NONE',
				location: { countryCode: 'AU', regionCode: null },
				translations: { language: 'en', translations: {} },
				branding: 'c15t',
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
