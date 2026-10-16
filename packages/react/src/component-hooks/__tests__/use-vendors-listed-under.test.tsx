import type { ResolvedVendor, Vendor } from '@c15t/core';
import { describe, expect, test, vi } from 'vitest';
import { renderHook } from 'vitest-browser-react';

import { ComponentFixtureProvider as ConsentProvider } from '~/__tests__/component-fixture-provider';
import { policyFixture } from '~/__tests__/policy-fixture';
import { useKernel } from '~/kernel-selector';
import { offline } from '~/transports/offline';

import { useVendorsListedUnder } from '../use-vendors-listed-under';

// What an `@c15t/integrations` helper puts on its script: a vendor slug and
// the vendor's name and privacy policy, with no entry in `vendors`.
const helperScript = {
	category: 'measurement' as const,
	id: 'posthog',
	src: 'https://example.invalid/posthog.js',
	vendor: 'posthog',
	vendorDetails: {
		name: 'PostHog',
		privacyPolicyUrl: 'https://posthog.com/privacy',
	},
};

const declaredVendor: Vendor = {
	category: 'measurement',
	id: 'google-analytics',
	name: 'Google Analytics',
	privacyPolicyUrl: 'https://policies.google.com/privacy',
};

const createWrapper = function createWrapper(vendors?: Vendor[]) {
	return function Wrapper({ children }: { children: React.ReactNode }) {
		return (
			<ConsentProvider
				options={{
					consentCategories: ['necessary', 'marketing', 'measurement'],
					mode: offline(),
					persistence: false,
					prefetch: policyFixture(
						{ measurement: true },
						{ categories: ['marketing', 'measurement'], model: 'opt-in' }
					),
					scripts: [helperScript],
					vendors,
				}}
			>
				{children}
			</ConsentProvider>
		);
	};
};

const renderListed = (vendors?: Vendor[]) =>
	renderHook(
		() => ({
			kernel: useKernel(),
			listed: useVendorsListedUnder('measurement'),
		}),
		{ wrapper: createWrapper(vendors) }
	);

const ids = (vendors: readonly ResolvedVendor[]) =>
	vendors.map((vendor) => vendor.id);

describe('useVendorsListedUnder', () => {
	test('lists no helper while no vendor is declared', async () => {
		const { result } = await renderListed();
		expect(ids(result.current.listed)).toEqual([]);
	});

	test('lists helpers next to a declared vendor', async () => {
		const { result } = await renderListed([declaredVendor]);
		expect(ids(result.current.listed)).toEqual(['google-analytics', 'posthog']);
	});

	test('keeps listing a helper the visitor turned off', async () => {
		const { result } = await renderListed();
		await result.current.kernel.commands.save(
			{ marketing: false, measurement: true },
			{ vendors: { posthog: false } }
		);
		await vi.waitFor(() => {
			expect(ids(result.current.listed)).toEqual(['posthog']);
		});
	});
});
