/**
 * Provider-level vendor behaviour outside the widget: a `vendors` option
 * supplied after the first render reaches the kernel, and the allowed-vendor
 * hook follows the kernel's gate semantics for a vendor declared `disabled`.
 */
import type { Vendor } from '@c15t/core';
import { useState } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';

import { ComponentFixtureProvider as ConsentProvider } from '~/__tests__/component-fixture-provider';
import { policyFixture } from '~/__tests__/policy-fixture';
import { useDeclaredVendors, useVendorAllowed } from '~/hooks';
import { offline } from '~/transports/offline';

const META: Vendor = {
	category: 'marketing',
	id: 'meta-pixel',
	name: 'Meta Pixel',
	privacyPolicyUrl: 'https://www.facebook.com/privacy/policy/',
};

const Probe = () => {
	const declared = useDeclaredVendors();
	const meta = useVendorAllowed('meta-pixel');
	return (
		<output data-testid="probe">
			{JSON.stringify({
				declared: declared.map((vendor) => vendor.id),
				meta,
			})}
		</output>
	);
};

const readProbe = () =>
	JSON.parse(
		document.querySelector('[data-testid="probe"]')?.textContent ?? 'null'
	) as { declared: string[]; meta: boolean } | null;

describe('provider vendor options', () => {
	test('a vendors option supplied after the first render reaches the kernel', async () => {
		const Host = () => {
			const [vendors, setVendors] = useState<Vendor[]>([]);
			return (
				<ConsentProvider
					options={{
						consentCategories: ['necessary', 'marketing'],
						mode: offline(),
						persistence: false,
						prefetch: policyFixture(
							{ marketing: true },
							{ categories: ['marketing'], id: 'late-vendors' }
						),
						vendors,
					}}
				>
					<button
						data-testid="declare"
						onClick={() => setVendors([META])}
						type="button"
					>
						declare
					</button>
					<Probe />
				</ConsentProvider>
			);
		};
		render(<Host />);
		await vi.waitFor(() => {
			expect(readProbe()?.declared).toEqual([]);
		});
		await page.getByTestId('declare').click();
		await vi.waitFor(() => {
			expect(readProbe()?.declared).toEqual(['meta-pixel']);
		});
	});

	test('a vendor removed from the option disappears from the kernel', async () => {
		const Host = () => {
			const [vendors, setVendors] = useState<Vendor[]>([META]);
			return (
				<ConsentProvider
					options={{
						consentCategories: ['necessary', 'marketing'],
						mode: offline(),
						persistence: false,
						prefetch: policyFixture(
							{ marketing: true },
							{ categories: ['marketing'], id: 'removed-vendors' }
						),
						vendors,
					}}
				>
					<button
						data-testid="remove"
						onClick={() => setVendors([])}
						type="button"
					>
						remove
					</button>
					<Probe />
				</ConsentProvider>
			);
		};
		render(<Host />);
		await vi.waitFor(() => {
			expect(readProbe()?.declared).toEqual(['meta-pixel']);
		});
		await page.getByTestId('remove').click();
		await vi.waitFor(() => {
			expect(readProbe()?.declared).toEqual([]);
		});
	});

	test('useVendorAllowed ignores a stored denial for a vendor declared disabled', async () => {
		const fixture = policyFixture(
			{ marketing: true },
			{ categories: ['marketing'], id: 'disabled-vendor' }
		);
		render(
			<ConsentProvider
				options={{
					consentCategories: ['necessary', 'marketing'],
					mode: offline(),
					persistence: false,
					prefetch: {
						...fixture,
						initialRecords: {
							...fixture.initialRecords,
							vendorChoice: {
								confirmedAt: (fixture.now ?? 1) - 1,
								denied: ['meta-pixel'],
								version: 1,
							},
						},
					},
					vendors: [{ ...META, disabled: true }],
				}}
			>
				<Probe />
			</ConsentProvider>
		);
		await vi.waitFor(() => {
			expect(readProbe()?.meta).toBe(true);
		});
	});
});
