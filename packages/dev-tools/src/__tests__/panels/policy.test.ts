import type { ConsentSnapshot } from '@c15t/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { renderPolicyPanel } from '../../panels/policy';
import { createConsentSnapshot } from '../helpers/kernel';

const createPolicy = function createPolicy(
	overrides: Record<string, unknown> = {}
): NonNullable<ConsentSnapshot['policy']> {
	return {
		consent: {},
		id: 'policy',
		model: 'opt-in',
		ui: { mode: 'none' },
		...overrides,
	} as NonNullable<ConsentSnapshot['policy']>;
};

describe('policy panel', () => {
	let container: HTMLDivElement;

	beforeEach(() => {
		container = document.createElement('div');
	});

	it('renders policy diagnostics grouped into sections', () => {
		const state = createConsentSnapshot({
			policy: createPolicy({
				consent: {
					categories: ['necessary', 'measurement'],
					expiryDays: 365,
					preselectedCategories: ['measurement'],
					scopeMode: 'permissive',
				},
				i18n: { messageProfile: 'us_ca' },
				id: 'policy_us_ca',
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
			}),
			policyBanner: {
				allowedActions: ['accept', 'reject'],
				direction: 'row',
				layout: [['accept', 'reject']],
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
		});

		renderPolicyPanel(container, { getState: () => state });
		const text = container.textContent ?? '';

		expect(text).toContain('Match Trace');
		expect(text).toContain('region(US-CA)');
		expect(text).toContain('MATCH');
		expect(text).toContain('policy_us_ca');
		expect(text).toContain('Opt-In');
		expect(text).toContain('Permissive');
		expect(text).toContain('necessary, measurement');
		expect(text).toContain('365d');
		expect(text).toContain('UI');
		expect(text).toContain('accept, reject');
		expect(text).toContain('[accept, reject]');
		expect(text).toContain('row');
		expect(text).toContain('IP, UA');
		expect(text).toContain('present');
		expect(text).toContain('us_ca');
	});

	it('shows empty state when no policy is active', () => {
		const state = createConsentSnapshot();

		renderPolicyPanel(container, { getState: () => state });

		expect(container.textContent).toContain(
			'No active policy matched for this request.'
		);
		expect(container.textContent).toContain('UNAVAILABLE');
	});

	it('hides UI section when UI mode is none', () => {
		const state = createConsentSnapshot({
			policy: createPolicy({ id: 'world_no_banner', model: 'none' }),
			policyDecision: {
				country: 'US',
				fingerprint: 'abc',
				jurisdiction: 'NONE',
				matchedBy: 'default',
				policyId: 'world_no_banner',
				region: null,
			},
		});

		renderPolicyPanel(container, { getState: () => state });
		const text = container.textContent ?? '';

		expect(text).toContain('world_no_banner');
		expect(text).toContain('None');
		expect(text).not.toContain('Banner Actions');
		expect(text).not.toContain('Dialog Actions');
	});

	it('hides UI section when surfaces have no configuration', () => {
		const state = createConsentSnapshot({
			policy: createPolicy({
				id: 'empty_surfaces',
				ui: { mode: 'banner' },
			}),
			policyDecision: {
				country: 'DE',
				fingerprint: 'abc',
				jurisdiction: 'GDPR',
				matchedBy: 'default',
				policyId: 'empty_surfaces',
				region: null,
			},
		});

		renderPolicyPanel(container, { getState: () => state });
		const text = container.textContent ?? '';

		expect(text).not.toContain('Banner Actions');
		expect(text).not.toContain('Dialog Actions');
		expect(text).not.toContain('Scroll Lock');
	});
});
