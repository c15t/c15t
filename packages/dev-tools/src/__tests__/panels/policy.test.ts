import type { ConsentStoreState } from '@c15t/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { renderPolicyPanel } from '../../panels/policy';

const createBaseState = function createBaseState(
	overrides: Partial<ConsentStoreState>
): ConsentStoreState {
	return {
		initDataSource: null,
		initDataSourceDetail: null,
		lastBannerFetchData: null,
		policyBanner: {},
		policyCategories: null,
		policyDialog: {},
		policyScopeMode: null,
		...overrides,
	} as unknown as ConsentStoreState;
};

describe('policy panel', () => {
	let container: HTMLDivElement;

	beforeEach(() => {
		container = document.createElement('div');
	});

	it('renders policy diagnostics grouped into sections', () => {
		const state = createBaseState({
			initDataSource: 'backend-cache-hit',
			initDataSourceDetail: 'x-vercel-cache=HIT',
			lastBannerFetchData: {
				branding: 'c15t',
				jurisdiction: 'CCPA',
				location: { countryCode: 'US', regionCode: 'CA' },
				policy: {
					consent: {
						categories: ['necessary', 'measurement'],
						expiryDays: 365,
						preselectedCategories: ['measurement'],

						scopeMode: 'permissive',
					},
					i18n: { messageProfile: 'us_ca' },
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

							layout: [['accept', 'reject']],
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
				translations: { language: 'en', translations: {} },
			} as unknown as ConsentStoreState['lastBannerFetchData'],
			policyBanner: {
				allowedActions: ['accept', 'reject'],
				primaryActions: ['accept'],
			},
			policyCategories: ['necessary', 'measurement'],
			policyScopeMode: 'permissive',
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
				branding: 'c15t',
				jurisdiction: 'NONE',
				location: { countryCode: 'AU', regionCode: null },
				translations: { language: 'en', translations: {} },
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
				branding: 'c15t',
				jurisdiction: 'NONE',
				location: { countryCode: 'US', regionCode: null },
				policy: {
					consent: {},
					id: 'world_no_banner',
					model: 'none',
					ui: { mode: 'none' },
				},
				policyDecision: {
					country: 'US',
					fingerprint: 'abc',
					jurisdiction: 'NONE',
					matchedBy: 'default',
					policyId: 'world_no_banner',
					region: null,
				},
				translations: { language: 'en', translations: {} },
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
