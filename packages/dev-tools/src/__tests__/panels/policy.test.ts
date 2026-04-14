import type { ConsentStoreState } from 'c15t';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderPolicyPanel } from '../../panels/policy';

function createBaseState(
	overrides: Partial<ConsentStoreState>
): ConsentStoreState {
	return {
		lastBannerFetchData: null,
		policyCategories: null,
		policyScopeMode: null,
		policyBanner: {},
		policyDialog: {},
		initDataSource: null,
		initDataSourceDetail: null,
		...overrides,
	} as unknown as ConsentStoreState;
}

describe('policy panel', () => {
	let container: HTMLDivElement;

	beforeEach(() => {
		container = document.createElement('div');
	});

	it('renders policy diagnostics grouped into sections', () => {
		const state = createBaseState({
			policyCategories: ['necessary', 'measurement'],
			policyScopeMode: 'permissive',
			policyBanner: {
				allowedActions: ['accept', 'reject'],
				primaryActions: ['accept'],
			},
			initDataSource: 'backend-cache-hit',
			initDataSourceDetail: 'x-vercel-cache=HIT',
			lastBannerFetchData: {
				jurisdiction: 'CCPA',
				location: { countryCode: 'US', regionCode: 'CA' },
				translations: { language: 'en', translations: {} },
				branding: 'c15t',
				policy: {
					id: 'policy_us_ca',
					model: 'opt-in',
					i18n: { messageProfile: 'us_ca' },
					consent: {
						scopeMode: 'permissive',
						expiryDays: 365,
						categories: ['necessary', 'measurement'],
						preselectedCategories: ['measurement'],
					},
					ui: {
						mode: 'banner',
						banner: {
							allowedActions: ['accept', 'reject'],
							primaryActions: ['accept'],
							layout: [['accept', 'reject']],
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

		renderPolicyPanel(container, { getState: () => state });

		const text = container.textContent ?? '';

		// Match trace section
		expect(text).toContain('Match Trace');
		expect(text).toContain('region(US-CA)');
		expect(text).toContain('MATCH');
		expect(text).toContain('Location tab');

		// Policy section — core identity
		expect(text).toContain('policy_us_ca');
		expect(text).toContain('Opt-In');
		expect(text).toContain('Permissive');
		expect(text).toContain('necessary, measurement');
		expect(text).toContain('365d');

		// UI section — only shown because mode is 'banner'
		expect(text).toContain('UI');
		expect(text).toContain('accept, reject');
		expect(text).toContain('[accept, reject]');
		expect(text).toContain('row');

		// Proof & snapshot
		expect(text).toContain('IP, UA');
		expect(text).toContain('present');
		expect(text).toContain('us_ca');

		// No simulation section
		expect(text).not.toContain('Simulation');
	});

	it('shows empty state when no policy is active', () => {
		const state = createBaseState({
			initDataSource: 'offline-fallback',
			lastBannerFetchData: {
				jurisdiction: 'NONE',
				location: { countryCode: 'AU', regionCode: null },
				translations: { language: 'en', translations: {} },
				branding: 'c15t',
			} as unknown as ConsentStoreState['lastBannerFetchData'],
		});

		renderPolicyPanel(container, { getState: () => state });

		expect(container.textContent).toContain(
			'No active policy matched for this request.'
		);
		expect(container.textContent).toContain('UNAVAILABLE');
	});

	it('hides UI section when ui mode is none', () => {
		const state = createBaseState({
			lastBannerFetchData: {
				jurisdiction: 'NONE',
				location: { countryCode: 'US', regionCode: null },
				translations: { language: 'en', translations: {} },
				branding: 'c15t',
				policy: {
					id: 'world_no_banner',
					model: 'none',
					consent: {},
					ui: { mode: 'none' },
				},
				policyDecision: {
					policyId: 'world_no_banner',
					fingerprint: 'abc',
					matchedBy: 'default',
					country: 'US',
					region: null,
					jurisdiction: 'NONE',
				},
			} as unknown as ConsentStoreState['lastBannerFetchData'],
		});

		renderPolicyPanel(container, { getState: () => state });

		const text = container.textContent ?? '';
		expect(text).toContain('world_no_banner');
		expect(text).toContain('None');
		// UI section should not appear for mode: 'none'
		expect(text).not.toContain('Banner Actions');
		expect(text).not.toContain('Dialog Actions');
	});
});
