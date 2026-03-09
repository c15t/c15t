import type { ConsentStoreState } from 'c15t';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderPolicyPanel } from '../../panels/policy';

function createBaseState(
	overrides: Partial<ConsentStoreState>
): ConsentStoreState {
	return {
		lastBannerFetchData: null,
		policyCategories: null,
		policyScopeMode: null,
		policyBannerAllowedActions: null,
		policyBannerPrimaryAction: null,
		policyBannerActionOrder: null,
		policyBannerActionLayout: null,
		policyBannerUiProfile: null,
		policyBannerScrollLock: null,
		policyDialogAllowedActions: null,
		policyDialogPrimaryAction: null,
		policyDialogActionOrder: null,
		policyDialogActionLayout: null,
		policyDialogUiProfile: null,
		policyDialogScrollLock: null,
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

	it('renders detailed policy diagnostics when policy exists', () => {
		const state = createBaseState({
			policyCategories: ['necessary', 'measurement'],
			policyScopeMode: 'unmanaged',
			policyBannerAllowedActions: ['accept', 'reject'],
			policyBannerPrimaryAction: 'accept',
			policyBannerActionOrder: ['reject', 'accept'],
			policyBannerActionLayout: 'inline',
			policyBannerUiProfile: 'balanced',
			policyBannerScrollLock: true,
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
						scopeMode: 'unmanaged',
						expiryDays: 365,
						categories: ['necessary', 'measurement'],
						preselectedCategories: ['measurement'],
					},
					ui: {
						mode: 'banner',
						banner: {
							allowedActions: ['accept', 'reject'],
							primaryAction: 'accept',
							actionOrder: ['reject', 'accept'],
							actionLayout: 'inline',
							uiProfile: 'balanced',
							scrollLock: true,
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
		expect(container.textContent).toContain('Policy Reason Trace');
		expect(container.textContent).toContain('region(US-CA)');
		expect(container.textContent).toContain('MATCH -> policy_us_ca');
		expect(container.textContent).toContain('policy_us_ca');
		expect(container.textContent).toContain('region');
		expect(container.textContent).toContain('Unmanaged');
		expect(container.textContent).toContain('necessary, measurement');
		expect(container.textContent).toContain('measurement');
		expect(container.textContent).toContain('accept, reject');
		expect(container.textContent).toContain('reject, accept');
		expect(container.textContent).toContain('inline');
		expect(container.textContent).toContain('balanced');
		expect(container.textContent).toContain('on');
		expect(container.textContent).toContain('us_ca');
		expect(container.textContent).toContain('365 days');
		expect(container.textContent).toContain('IP:on UA:on Lang:off');
		expect(container.textContent).toContain('present');
		expect(container.textContent).toContain(
			'Backend (Cache Hit) [x-vercel-cache=HIT]'
		);
		expect(container.textContent).toContain('Policy Simulation');
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

		expect(container.textContent).toContain('Policy Pack');
		expect(container.textContent).toContain(
			'No active policy matched for this request.'
		);
		expect(container.textContent).toContain('Init Source: Offline Fallback');
		expect(container.textContent).toContain('decision metadata');
		expect(container.textContent).toContain('UNAVAILABLE');
	});

	it('runs policy simulation callback from panel controls', () => {
		const state = createBaseState({
			overrides: {
				country: 'CA',
				region: 'ON',
				language: 'fr',
			},
			lastBannerFetchData: {
				jurisdiction: 'CCPA',
				location: { countryCode: 'CA', regionCode: 'ON' },
				translations: { language: 'fr', translations: {} },
				branding: 'c15t',
				policyDecision: {
					policyId: 'policy_ca',
					fingerprint: 'fp',
					matchedBy: 'country',
					country: 'CA',
					region: null,
					jurisdiction: 'CCPA',
				},
				policy: {
					id: 'policy_ca',
					model: 'opt-in',
				},
			} as unknown as ConsentStoreState['lastBannerFetchData'],
		});

		const onRunSimulation = vi.fn().mockResolvedValue(undefined);

		renderPolicyPanel(container, {
			getState: () => state,
			onRunSimulation,
		});

		const runButton = [...container.querySelectorAll('button')].find(
			(button) => button.textContent?.includes('Run Simulation') ?? false
		);
		if (!runButton) {
			throw new Error('Run Simulation button not found');
		}

		runButton.click();

		expect(onRunSimulation).toHaveBeenCalledWith({
			country: 'CA',
			region: 'ON',
			language: 'fr',
		});
	});
});
