/**
 * A purpose row whose vendors all use legitimate interest has nothing a
 * consent switch could turn off. Showing one reads as an opt-out while
 * every vendor keeps processing, so the row offers only the objection.
 */
import { render } from '@testing-library/svelte';
import { describe, expect, test, vi } from 'vitest';

import IABPurposeItem from '../lib/components/iab-purpose-item.svelte';
import IABStackItem from '../lib/components/iab-stack-item.svelte';
import { getIABTranslations } from '../lib/iab-translations';

const purpose = (hasConsentBasis: boolean) => ({
	description: '',
	hasConsentBasis,
	id: 7,
	illustrations: [],
	name: 'Measure advertising performance',
	vendors: [
		{
			cookieMaxAgeSeconds: null,
			deviceStorageDisclosureUrl: null,
			features: [],
			id: 755,
			legIntPurposes: [7],
			name: 'Vendor',
			policyUrl: '',
			purposes: [],
			specialFeatures: [],
			specialPurposes: [],
			usesCookies: false,
			usesLegitimateInterest: true,
			usesNonCookieAccess: false,
		},
	],
});

const handlers = {
	onPurposeLegitimateInterestToggle: vi.fn(),
	onToggle: vi.fn(),
	onVendorClick: vi.fn(),
	onVendorToggle: vi.fn(),
};

describe('IAB purpose row consent switch', () => {
	test.each([
		[true, 1],
		[false, 0],
	])('hasConsentBasis %s renders %i switches', (hasConsentBasis, count) => {
		const { container } = render(IABPurposeItem, {
			...handlers,
			iabT: getIABTranslations(),
			isEnabled: true,
			purpose: purpose(hasConsentBasis),
			vendorConsents: {},
		});
		expect(
			container.querySelectorAll(
				'[role="switch"][aria-label="Measure advertising performance"]'
			)
		).toHaveLength(count);
		// The objection control is there either way.
		expect(container.querySelector('button[aria-pressed]')).not.toBeNull();
	});

	test('a stack of legitimate-interest-only purposes has no consent switch', () => {
		const { container } = render(IABStackItem, {
			...handlers,
			consents: {},
			iabT: getIABTranslations(),
			onToggle: vi.fn(),
			stack: {
				description: '',
				id: 1,
				name: 'Advertising',
				purposes: [purpose(false)],
			},
			vendorConsents: {},
		});
		expect(
			container.querySelectorAll('[role="switch"][aria-label="Advertising"]')
		).toHaveLength(0);
	});
});
