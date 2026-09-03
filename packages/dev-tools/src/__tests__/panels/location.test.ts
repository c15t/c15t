import type { ConsentSnapshot } from '@c15t/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderLocationPanel } from '../../panels/location';
import { createConsentSnapshot } from '../helpers/kernel';

describe('location panel', () => {
	let container: HTMLDivElement;

	beforeEach(() => {
		container = document.createElement('div');
	});

	it('renders compact active policy summary from the kernel snapshot', () => {
		const state = createConsentSnapshot({
			location: { countryCode: 'US', regionCode: 'CA' },
			model: 'opt-in',
			policy: {
				consent: {
					categories: ['necessary', 'measurement'],
					expiryDays: 365,
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
						layout: [['reject', 'accept']],
						primaryActions: ['accept'],
					},
					mode: 'banner',
				},
			} as ConsentSnapshot['policy'],
			policyBanner: {
				allowedActions: ['accept', 'reject'],
				direction: 'row',
				layout: [['reject', 'accept']],
				primaryActions: ['accept'],
			},
			policyCategories: ['necessary', 'measurement'],
			policyDecision: {
				country: 'US',
				fingerprint:
					'f470109af469620656707632979f2f8058edbb081c09848499cef03b305f8363',
				jurisdiction: 'CCPA',
				matchedBy: 'region',
				policyId: 'policy_us_ca',
				region: 'CA',
			},
			policyScopeMode: 'permissive',
			policySnapshotToken: 'token-123',
			translations: { language: 'en', translations: {} },
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
			'Open the Policy tab for full policy-pack diagnostics.'
		);
	});

	it('shows empty policy state when no policy is active', () => {
		const state = createConsentSnapshot({
			location: { countryCode: 'AU', regionCode: null },
			translations: { language: 'en', translations: {} },
		});

		renderLocationPanel(container, {
			getState: () => state,
			onApplyOverrides: vi.fn(),
			onClearOverrides: vi.fn(),
		});

		expect(container.textContent).toContain('Active Policy');
		expect(container.textContent).toContain('No active policy matched.');
	});
});
