/**
 * Provider-level vendor behaviour outside the widget: a `vendors` option
 * supplied after the first render reaches the kernel, and the allowed-vendor
 * hook follows the kernel's gate semantics for a vendor declared `disabled`.
 */
import type { Script, Vendor } from '@c15t/core';
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
				name: declared.find((vendor) => vendor.id === 'meta-pixel')?.name,
				ownerCategory: declared.find((vendor) => vendor.id === 'meta-pixel')
					?.ownerCategory,
				source: declared.find((vendor) => vendor.id === 'meta-pixel')?.source,
			})}
		</output>
	);
};

const readProbe = () =>
	JSON.parse(
		document.querySelector('[data-testid="probe"]')?.textContent ?? 'null'
	) as {
		declared: string[];
		meta: boolean;
		name?: string;
		ownerCategory?: unknown;
		source?: string;
	} | null;

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

	test('a removed vendor that a script still names falls back to a script entry', async () => {
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
							{ categories: ['marketing'], id: 'owned-vendors' }
						),
						scripts: [
							{
								category: 'marketing',
								id: 'meta-pixel-script',
								textContent: '/* pixel */',
								vendor: 'meta-pixel',
							},
						],
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
		// The script still names the slug, so the vendor stays declared as a
		// script-sourced entry rather than disappearing with its config copy.
		await vi.waitFor(() => {
			expect(readProbe()?.source).toBe('script');
		});
	});

	test('a script added later declares its vendor slug', async () => {
		const Host = () => {
			const [scripts, setScripts] = useState<Script[]>([]);
			return (
				<ConsentProvider
					options={{
						consentCategories: ['necessary', 'marketing'],
						mode: offline(),
						persistence: false,
						prefetch: policyFixture(
							{ marketing: true },
							{ categories: ['marketing'], id: 'late-scripts' }
						),
						scripts,
					}}
				>
					<button
						data-testid="add-script"
						onClick={() =>
							setScripts([
								{
									category: 'marketing',
									id: 'meta-pixel-script',
									textContent: '/* pixel */',
									vendor: 'meta-pixel',
								},
							])
						}
						type="button"
					>
						add
					</button>
					<Probe />
				</ConsentProvider>
			);
		};
		render(<Host />);
		await vi.waitFor(() => {
			expect(readProbe()?.declared).toEqual([]);
		});
		await page.getByTestId('add-script').click();
		await vi.waitFor(() => {
			expect(readProbe()?.source).toBe('script');
		});
	});

	test('a removed script takes its slug-only vendor with it', async () => {
		const pixel: Script = {
			category: 'marketing',
			id: 'meta-pixel-script',
			textContent: '/* pixel */',
			vendor: 'meta-pixel',
		};
		const Host = () => {
			const [scripts, setScripts] = useState<Script[]>([pixel]);
			return (
				<ConsentProvider
					options={{
						consentCategories: ['necessary', 'marketing'],
						mode: offline(),
						persistence: false,
						prefetch: policyFixture(
							{ marketing: true },
							{ categories: ['marketing'], id: 'removed-scripts' }
						),
						scripts,
					}}
				>
					<button
						data-testid="remove-script"
						onClick={() => setScripts([])}
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
			expect(readProbe()?.source).toBe('script');
		});
		await page.getByTestId('remove-script').click();
		// Nothing else declares the slug, so the vendor leaves the list.
		await vi.waitFor(() => {
			expect(readProbe()?.declared).toEqual([]);
		});
	});

	test('removing a config vendor restores the backend copy it shadowed', async () => {
		const fixture = policyFixture(
			{ marketing: true },
			{ categories: ['marketing'], id: 'shadowed-vendors' }
		);
		const Host = () => {
			const [vendors, setVendors] = useState<Vendor[]>([
				{ ...META, name: 'Meta (config)' },
			]);
			return (
				<ConsentProvider
					options={{
						consentCategories: ['necessary', 'marketing'],
						mode: offline(),
						persistence: false,
						prefetch: {
							...fixture,
							// What a server prefetch resolved from the backend manifest.
							initialVendors: {
								declared: [
									{
										...META,
										name: 'Meta (backend)',
										presentable: true,
										source: 'manifest',
									},
								],
								listVersion: '1',
							},
						},
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
			expect(readProbe()?.name).toBe('Meta (config)');
		});
		await page.getByTestId('remove').click();
		await vi.waitFor(() => {
			expect(readProbe()?.source).toBe('manifest');
			expect(readProbe()?.name).toBe('Meta (backend)');
		});
	});

	test('a script that starts naming a backend vendor becomes its owner', async () => {
		const fixture = policyFixture(
			{ marketing: true },
			{ categories: ['marketing'], id: 'owned-backend-vendor' }
		);
		const Host = () => {
			const [scripts, setScripts] = useState<Script[]>([]);
			return (
				<ConsentProvider
					options={{
						consentCategories: ['necessary', 'marketing'],
						mode: offline(),
						persistence: false,
						prefetch: {
							...fixture,
							initialVendors: {
								declared: [{ ...META, presentable: true, source: 'manifest' }],
								listVersion: '1',
							},
						},
						scripts,
					}}
				>
					<button
						data-testid="add-script"
						onClick={() =>
							setScripts([
								{
									category: 'marketing',
									id: 'meta-pixel-script',
									textContent: '/* pixel */',
									vendor: 'meta-pixel',
								},
							])
						}
						type="button"
					>
						add
					</button>
					<Probe />
				</ConsentProvider>
			);
		};
		render(<Host />);
		await vi.waitFor(() => {
			expect(readProbe()?.source).toBe('manifest');
		});
		await page.getByTestId('add-script').click();
		// The backend entry stays the winner and remembers the new owner.
		await vi.waitFor(() => {
			expect(readProbe()?.ownerCategory).toBe('marketing');
		});
		expect(readProbe()?.source).toBe('manifest');
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
