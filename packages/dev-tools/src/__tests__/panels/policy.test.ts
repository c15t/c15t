import type { ConsentStoreState } from 'c15t';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderPolicyPanel } from '../../panels/policy';

function createBaseState(
	overrides: Partial<ConsentStoreState>
): ConsentStoreState {
	return {
		lastBannerFetchData: null,
		policyPurposeIds: null,
		policyScopeMode: null,
		policyBannerAllowedActions: null,
		policyBannerPrimaryAction: null,
		policyBannerActionOrder: null,
		policyBannerActionLayout: null,
		policyBannerUiProfile: null,
		policyDialogAllowedActions: null,
		policyDialogPrimaryAction: null,
		policyDialogActionOrder: null,
		policyDialogActionLayout: null,
		policyDialogUiProfile: null,
		...overrides,
	} as unknown as ConsentStoreState;
}

describe('policy panel', () => {
	let container: HTMLDivElement;

	beforeEach(() => {
		container = document.createElement('div');
	});

	it('renders detailed policy diagnostics when policy exists', () => {
		const state = createBaseState({
			policyPurposeIds: ['necessary', 'measurement'],
			policyScopeMode: 'unmanaged',
			policyBannerAllowedActions: ['accept', 'reject'],
			policyBannerPrimaryAction: 'accept',
			policyBannerActionOrder: ['reject', 'accept'],
			policyBannerActionLayout: 'inline',
			policyBannerUiProfile: 'balanced',
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
						scopeMode: 'unmanaged',
						expiryDays: 365,
						purposeIds: ['necessary', 'measurement'],
					},
					ui: {
						mode: 'banner',
						banner: {
							allowedActions: ['accept', 'reject'],
							primaryAction: 'accept',
							actionOrder: ['reject', 'accept'],
							actionLayout: 'inline',
							uiProfile: 'balanced',
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

		expect(container.textContent).toContain('Policy Pack');
		expect(container.textContent).toContain('policy_us_ca');
		expect(container.textContent).toContain('region');
		expect(container.textContent).toContain('Unmanaged');
		expect(container.textContent).toContain('necessary, measurement');
		expect(container.textContent).toContain('accept, reject');
		expect(container.textContent).toContain('reject, accept');
		expect(container.textContent).toContain('inline');
		expect(container.textContent).toContain('balanced');
		expect(container.textContent).toContain('us_ca');
		expect(container.textContent).toContain('365 days');
		expect(container.textContent).toContain('IP:on UA:on Lang:off');
		expect(container.textContent).toContain('present');
	});

	it('shows empty state when no policy is active', () => {
		const state = createBaseState({
			lastBannerFetchData: {
				jurisdiction: 'NONE',
				location: { countryCode: 'AU', regionCode: null },
				translations: { language: 'en', translations: {} },
				branding: 'c15t',
			} as unknown as ConsentStoreState['lastBannerFetchData'],
		});

		renderPolicyPanel(container, { getState: () => state });

		expect(container.textContent).toContain('Policy Pack');
		expect(container.textContent).toContain(
			'No active policy matched for this request.'
		);
	});
});
