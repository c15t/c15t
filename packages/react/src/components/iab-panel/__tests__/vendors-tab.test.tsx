/**
 * IAB Consent Dialog Vendors Tab Unit Tests
 *
 * Tests for the vendors tab in IAB Consent Dialog.
 */

import { evaluateConsent } from '@c15t/core';
import type { ConsentKernel } from '@c15t/core';
import { useContext, useEffect } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import { ComponentFixtureProvider as ConsentProvider } from '~/__tests__/component-fixture-provider';
import type { ComponentFixtureOptions as ConsentProviderOptions } from '~/__tests__/component-fixture-provider';
import { policyFixture } from '~/__tests__/policy-fixture';
import { KernelContext } from '~/context';
import { offline } from '~/transports/offline';

import { decodeTCString } from '../../../../../iab/src/tcf/tc-string';
import { StackItem } from '../atoms/stack-item';
import { IABConsentDialog } from '../iab-panel';

const getDefined = <Value,>(
	value: Value,
	message = 'Expected value to be defined'
): NonNullable<Value> => {
	if (value === null || value === undefined) {
		throw new Error(message);
	}
	return value;
};

// Mock localStorage
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		clear: () => {
			store = {};
		},
		getItem: (key: string) => store[key] || null,
		removeItem: (key: string) => {
			Reflect.deleteProperty(store, key);
		},
		setItem: (key: string, value: string) => {
			store[key] = value;
		},
	};
})();

Object.defineProperty(window, 'localStorage', {
	value: localStorageMock,
});

// Mock GVL with multiple vendors
const mockGVL = {
	features: {
		1: { description: '', id: 1, illustrations: [], name: 'Match data' },
	},
	gvlSpecificationVersion: 3,
	lastUpdated: '2024-01-15T16:00:23Z',
	purposes: {
		1: {
			description: '',
			id: 1,
			illustrations: [],
			name: 'Store and/or access information on a device',
		},
		10: {
			description: '',
			id: 10,
			illustrations: [],
			name: 'Develop and improve services',
		},
		2: {
			description: '',
			id: 2,
			illustrations: [],
			name: 'Use limited data to select advertising',
		},
		7: {
			description: '',
			id: 7,
			illustrations: [],
			name: 'Measure advertising performance',
		},
		9: {
			description: '',
			id: 9,
			illustrations: [],
			name: 'Understand audiences through statistics',
		},
	},
	specialFeatures: {
		1: { description: '', id: 1, illustrations: [], name: 'Geolocation' },
	},
	specialPurposes: {
		1: { description: '', id: 1, illustrations: [], name: 'Security' },
	},
	stacks: {
		1: {
			description: '',
			id: 1,
			name: 'Advertising',
			purposes: [2, 7],
			specialFeatures: [],
		},
	},
	tcfPolicyVersion: 5,
	vendorListVersion: 142,
	vendors: {
		1: {
			cookieMaxAgeSeconds: 31536000,
			cookieRefresh: true,
			features: [1],
			flexiblePurposes: [],
			id: 1,
			legIntPurposes: [7, 9, 10],
			name: 'Exponential Interactive',
			purposes: [1, 2],
			specialFeatures: [],
			specialPurposes: [1],
			urls: [{ langId: 'en', privacy: 'https://vendor1.com/privacy' }],
			usesCookies: true,
			usesNonCookieAccess: false,
		},
		10: {
			cookieMaxAgeSeconds: 31536000,
			cookieRefresh: true,
			features: [],
			flexiblePurposes: [],
			id: 10,
			legIntPurposes: [2, 7, 9, 10],
			name: 'Index Exchange',
			purposes: [1],
			specialFeatures: [],
			specialPurposes: [1],
			urls: [{ langId: 'en', privacy: 'https://indexexchange.com/privacy' }],
			usesCookies: true,
			usesNonCookieAccess: false,
		},
		755: {
			cookieMaxAgeSeconds: 63072000,
			cookieRefresh: true,
			features: [1],
			flexiblePurposes: [2, 7, 9, 10],
			id: 755,
			legIntPurposes: [],
			name: 'Google Advertising Products',
			purposes: [1, 2, 7, 9, 10],
			specialFeatures: [1],
			specialPurposes: [1],
			urls: [{ langId: 'en', privacy: 'https://policies.google.com/privacy' }],
			usesCookies: true,
			usesNonCookieAccess: true,
		},
	},
};

globalThis.fetch = vi.fn(() =>
	Promise.resolve(
		new Response(JSON.stringify(mockGVL), {
			headers: { 'Content-Type': 'application/json' },
			status: 200,
		})
	)
) as typeof fetch;

const defaultIABOptions: ConsentProviderOptions = {
	iab: {
		cmpId: 160,
		cmpVersion: 1,
		gvl: mockGVL,
	},
	mode: offline({ acknowledgeNoRecords: true }),
	prefetch: policyFixture(undefined, {
		categories: undefined,
		id: 'iab_test',
		model: 'iab',
		prompt: 'choice',
		scopeMode: 'strict',
	}),
};

describe('IAB preference item interactions', () => {
	beforeEach(() => {
		window.localStorage.clear();
		vi.clearAllMocks();
		delete (window as { __tcfapi?: unknown }).__tcfapi;
	});

	test('should keep vendor details collapsed until expanded and allow consent toggle separately', async () => {
		render(
			<ConsentProvider options={defaultIABOptions}>
				<IABConsentDialog open />
			</ConsentProvider>
		);

		const vendorsTab = await vi.waitFor(
			() => {
				const el = Array.from(
					document.querySelectorAll<HTMLButtonElement>('[role="tab"]')
				).find((button) =>
					button.textContent?.toLowerCase().includes('vendor')
				);
				expect(el).toBeDefined();
				return getDefined(el);
			},
			{ timeout: 5000 }
		);

		await userEvent.click(vendorsTab);

		const vendorHeader = await vi.waitFor(
			() => {
				const el = Array.from(
					document.querySelectorAll<HTMLElement>('[id^="vendor-"]')
				).find((element) =>
					element.textContent?.includes('Exponential Interactive')
				);
				expect(el).toBeDefined();
				return getDefined(el);
			},
			{ timeout: 5000 }
		);

		const content = vendorHeader.querySelector(
			'[data-slot="preference-item-content"]'
		);
		expect(content?.getAttribute('aria-hidden')).toBe('true');

		const consentSwitch = vendorHeader.querySelector('[role="switch"]');
		expect(consentSwitch).toBeInstanceOf(HTMLElement);
		if (!consentSwitch) {
			throw new Error('Expected vendor switch to exist');
		}

		await userEvent.click(consentSwitch);

		await vi.waitFor(() => {
			expect(consentSwitch.getAttribute('aria-checked')).toBe('true');
			expect(content?.getAttribute('aria-hidden')).toBe('true');
		});

		const expandTrigger = vendorHeader.querySelector(
			'[data-slot="preference-item-trigger"]'
		) as HTMLElement | null;
		expect(expandTrigger).toBeInstanceOf(HTMLElement);
		if (!expandTrigger) {
			throw new Error('Expected vendor expand trigger to exist');
		}

		await userEvent.click(expandTrigger);

		await vi.waitFor(() => {
			expect(content?.getAttribute('aria-hidden')).toBe('false');
		});
	});

	test('links each vendor to the privacy policy its GVL entry declares', async () => {
		render(
			<ConsentProvider options={defaultIABOptions}>
				<IABConsentDialog open />
			</ConsentProvider>
		);
		const vendorsTab = await vi.waitFor(() =>
			getDefined(
				Array.from(
					document.querySelectorAll<HTMLButtonElement>('[role="tab"]')
				).find((button) => button.textContent?.toLowerCase().includes('vendor'))
			)
		);
		await userEvent.click(vendorsTab);
		const vendorRow = await vi.waitFor(() =>
			getDefined(
				Array.from(
					document.querySelectorAll<HTMLElement>('[id^="vendor-"]')
				).find((element) => element.textContent?.includes('Index Exchange'))
			)
		);

		await userEvent.click(
			getDefined(
				vendorRow.querySelector<HTMLElement>(
					'[data-slot="preference-item-trigger"]'
				)
			)
		);

		const policyLink = await vi.waitFor(() =>
			getDefined(
				Array.from(vendorRow.querySelectorAll('a')).find(
					(link) => link.textContent === 'Privacy Policy'
				)
			)
		);
		expect(policyLink.getAttribute('href')).toBe(
			'https://indexexchange.com/privacy'
		);
	});

	test('shows no link for a vendor URL that is not absolute http(s)', async () => {
		const gvl = {
			...mockGVL,
			vendors: {
				...mockGVL.vendors,
				10: {
					...mockGVL.vendors[10],
					deviceStorageDisclosureUrl: 'data:text/html,hi',
					urls: [
						{
							langId: 'en',
							legIntClaim: '//evil.test',
							// oxlint-disable-next-line no-script-url -- Unsafe vendor URLs exercise the link filter.
							privacy: 'javascript:alert(1)',
						},
					],
				},
			},
		};
		render(
			<ConsentProvider
				options={{
					...defaultIABOptions,
					iab: { ...defaultIABOptions.iab, gvl },
				}}
			>
				<IABConsentDialog open />
			</ConsentProvider>
		);
		const vendorsTab = await vi.waitFor(() =>
			getDefined(
				Array.from(
					document.querySelectorAll<HTMLButtonElement>('[role="tab"]')
				).find((button) => button.textContent?.toLowerCase().includes('vendor'))
			)
		);
		await userEvent.click(vendorsTab);
		const vendorRow = await vi.waitFor(() =>
			getDefined(
				Array.from(
					document.querySelectorAll<HTMLElement>('[id^="vendor-"]')
				).find((element) => element.textContent?.includes('Index Exchange'))
			)
		);

		await userEvent.click(
			getDefined(
				vendorRow.querySelector<HTMLElement>(
					'[data-slot="preference-item-trigger"]'
				)
			)
		);

		await vi.waitFor(() =>
			expect(vendorRow.textContent).toContain('Uses Cookies')
		);
		expect(vendorRow.querySelectorAll('a')).toHaveLength(0);
	});
});

describe('IAB vendors tab with publisher restrictions', () => {
	beforeEach(() => {
		window.localStorage.clear();
		vi.clearAllMocks();
		delete (window as { __tcfapi?: unknown }).__tcfapi;
	});

	const findVendorRow = (name: string) =>
		vi.waitFor(
			() => {
				const row = Array.from(
					document.querySelectorAll<HTMLElement>('[id^="vendor-"]')
				).find((element) => element.textContent?.includes(name));
				expect(row).toBeDefined();
				return getDefined(row);
			},
			{ timeout: 5000 }
		);

	test.each([
		['without restrictions', undefined, false],
		[
			'when purpose 7 requires legitimate interest',
			[{ purposeId: 7, restrictionType: 2 as const, vendorIds: [755] }],
			true,
		],
	])(
		'vendor 755 objection control %s',
		async (_name, publisherRestrictions, objectable) => {
			render(
				<ConsentProvider
					options={{
						...defaultIABOptions,
						iab: { ...defaultIABOptions.iab, publisherRestrictions },
					}}
				>
					<IABConsentDialog open />
				</ConsentProvider>
			);
			// Vendor 755 declares only consent purposes. Requiring legitimate
			// interest for purpose 7 gives the visitor a right to object.
			const vendorsTab = await vi.waitFor(
				() =>
					getDefined(
						Array.from(
							document.querySelectorAll<HTMLButtonElement>('[role="tab"]')
						).find((tab) => tab.textContent?.toLowerCase().includes('vendor'))
					),
				{ timeout: 5000 }
			);
			await userEvent.click(vendorsTab);
			const row = await findVendorRow('Google Advertising Products');
			// The objection sits in the row's content, mounted on first open.
			await userEvent.click(
				getDefined(
					row.querySelector<HTMLElement>(
						'[data-slot="preference-item-trigger"]'
					)
				)
			);
			await vi.waitFor(() =>
				expect(
					row.querySelector('[data-slot="preference-item-content"]')
						?.childElementCount
				).toBeGreaterThan(0)
			);
			expect(row.querySelector('button[aria-pressed]') !== null).toBe(
				objectable
			);
		}
	);
});

describe('IAB purposes tab with publisher restrictions', () => {
	beforeEach(() => {
		window.localStorage.clear();
		vi.clearAllMocks();
		delete (window as { __tcfapi?: unknown }).__tcfapi;
	});

	test('a purpose left with only legitimate interest offers the objection, and it denies the vendor', async () => {
		const probe: { kernel: ConsentKernel | null } = { kernel: null };
		const KernelProbe = () => {
			const kernel = useContext(KernelContext);
			useEffect(() => {
				probe.kernel = kernel;
			}, [kernel]);
			return null;
		};
		// Vendors 1 and 10 declare purpose 7 for legitimate interest; the
		// restriction moves vendor 755 there too, so no vendor uses consent.
		render(
			<ConsentProvider
				options={{
					...defaultIABOptions,
					iab: {
						...defaultIABOptions.iab,
						publisherRestrictions: [
							{ purposeId: 7, restrictionType: 2, vendorIds: [755] },
						],
					},
				}}
			>
				<KernelProbe />
				<IABConsentDialog open />
			</ConsentProvider>
		);
		// Purpose 7 sits in stack 1 with purpose 2. Stack content mounts when
		// the stack first opens.
		const trigger = (testId: string) =>
			vi.waitFor(
				() =>
					getDefined(
						document.querySelector<HTMLElement>(
							`[data-testid="${testId}"] [data-slot="preference-item-trigger"]`
						),
						`Missing ${testId} trigger`
					),
				{ timeout: 5000 }
			);
		await userEvent.click(await trigger('stack-item-1'));
		const purposeRow = await vi.waitFor(
			() => {
				const row = document.querySelector<HTMLElement>(
					'[data-testid="purpose-item-7"]'
				);
				expect(row).not.toBeNull();
				return getDefined(row);
			},
			{ timeout: 5000 }
		);
		// A consent switch here would change nothing the vendors rely on.
		expect(
			purposeRow.querySelector(
				'[role="switch"][aria-label="Measure advertising performance"]'
			)
		).toBeNull();

		const button = (label: string) =>
			getDefined(
				Array.from(document.querySelectorAll('button')).find(
					(element) => element.textContent?.trim() === label
				),
				`Missing ${label} button`
			);
		// The fixture policy scopes no optional category, so gate on the TC
		// signals alone.
		const target = {
			category: 'necessary' as const,
			iabPurposes: [7],
			vendorId: 755,
		};
		const gate = () =>
			evaluateConsent(target, getDefined(probe.kernel).getSnapshot());

		await userEvent.click(button('Accept All'));
		await vi.waitFor(() => expect(gate()).toBe(true), { timeout: 5000 });

		await userEvent.click(await trigger('purpose-item-7'));
		const objection = await vi.waitFor(() =>
			getDefined(
				document.querySelector<HTMLButtonElement>(
					'[data-testid="purpose-item-7"] button[aria-pressed]'
				),
				'Missing objection control'
			)
		);
		await userEvent.click(objection);
		await userEvent.click(button('Save Settings'));
		await vi.waitFor(() => expect(gate()).toBe(false), { timeout: 5000 });
	});

	test('untouched legitimate interest controls match what a plain Save encodes', async () => {
		const probe: { kernel: ConsentKernel | null } = { kernel: null };
		const KernelProbe = () => {
			const kernel = useContext(KernelContext);
			useEffect(() => {
				probe.kernel = kernel;
			}, [kernel]);
			return null;
		};
		// Vendor 10 declares purpose 2 and 7 on LI; the restriction moves
		// vendor 755 onto LI for purpose 7. With an empty draft, Save encodes
		// purpose 7 and vendor 755 as allowed and purpose 2 and vendor 10 as
		// objected.
		render(
			<ConsentProvider
				options={{
					...defaultIABOptions,
					iab: {
						...defaultIABOptions.iab,
						publisherRestrictions: [
							{ purposeId: 7, restrictionType: 2, vendorIds: [755] },
						],
					},
				}}
			>
				<KernelProbe />
				<IABConsentDialog open />
			</ConsentProvider>
		);
		const trigger = (testId: string) =>
			vi.waitFor(
				() =>
					getDefined(
						document.querySelector<HTMLElement>(
							`[data-testid="${testId}"] [data-slot="preference-item-trigger"]`
						),
						`Missing ${testId} trigger`
					),
				{ timeout: 5000 }
			);
		await userEvent.click(await trigger('stack-item-1'));
		await userEvent.click(await trigger('purpose-item-2'));
		await userEvent.click(await trigger('purpose-item-7'));

		const purpose2Pressed = await vi.waitFor(() =>
			getDefined(
				document
					.querySelector('[data-testid="purpose-item-2"] button[aria-pressed]')
					?.getAttribute('aria-pressed')
			)
		);
		const purpose7Row = getDefined(
			document.querySelector<HTMLElement>('[data-testid="purpose-item-7"]')
		);
		const purpose7VendorsToggle = getDefined(
			Array.from(purpose7Row.querySelectorAll<HTMLElement>('button')).find(
				(element) => element.textContent?.includes('Partners Using')
			)
		);
		await userEvent.click(purpose7VendorsToggle);
		const purpose7Pressed = await vi.waitFor(() => {
			const buttons = Array.from(
				purpose7Row.querySelectorAll<HTMLButtonElement>('button[aria-pressed]')
			);
			// Purpose 7 objection + vendors 1, 10, 755.
			expect(buttons.length).toBeGreaterThanOrEqual(4);
			return buttons.map((b) => b.getAttribute('aria-pressed'));
		});

		const vendorsTab = getDefined(
			Array.from(
				document.querySelectorAll<HTMLButtonElement>('[role="tab"]')
			).find((button) => button.textContent?.toLowerCase().includes('vendor'))
		);
		await userEvent.click(vendorsTab);
		const vendorPressed = async (id: number) => {
			const row = await vi.waitFor(() =>
				getDefined(document.querySelector<HTMLElement>(`#vendor-${id}`))
			);
			await userEvent.click(
				getDefined(
					row.querySelector<HTMLElement>(
						'[data-slot="preference-item-trigger"]'
					)
				)
			);
			return vi.waitFor(() =>
				getDefined(
					row
						.querySelector('button[aria-pressed]')
						?.getAttribute('aria-pressed')
				)
			);
		};
		const vendor10Pressed = await vendorPressed(10);
		const vendor755Pressed = await vendorPressed(755);

		const saveButton = getDefined(
			Array.from(document.querySelectorAll('button')).find(
				(element) => element.textContent?.trim() === 'Save Settings'
			)
		);
		await userEvent.click(saveButton);
		const tcString = await vi.waitFor(() =>
			getDefined(probe.kernel?.getSnapshot().iab?.authority?.tcString)
		);
		const decoded = await decodeTCString(tcString);

		expect(purpose2Pressed).toBe(
			String(decoded.purposeLegitimateInterests[2] !== true)
		);
		expect(purpose7Pressed[0]).toBe(
			String(decoded.purposeLegitimateInterests[7] !== true)
		);
		expect(vendor10Pressed).toBe(
			String(decoded.vendorLegitimateInterests[10] !== true)
		);
		expect(vendor755Pressed).toBe(
			String(decoded.vendorLegitimateInterests[755] !== true)
		);
		// Purpose 2 and vendor 10 are objected; restriction-introduced purpose 7
		// and vendor 755 are allowed.
		expect(purpose2Pressed).toBe('true');
		expect(purpose7Pressed[0]).toBe('false');
		expect(vendor10Pressed).toBe('true');
		expect(vendor755Pressed).toBe('false');
	});
});

describe('IAB stack switch without an objection handler', () => {
	test('reflects and sets consent for purposes with no consent basis', async () => {
		const onToggle = vi.fn();
		render(
			<ConsentProvider options={defaultIABOptions}>
				<StackItem
					consents={{}}
					onToggle={onToggle}
					onVendorClick={vi.fn()}
					onVendorToggle={vi.fn()}
					stack={{
						description: '',
						id: 1,
						name: 'Advertising',
						purposes: [
							{
								description: '',
								hasConsentBasis: false,
								id: 7,
								illustrations: [],
								name: 'Measure advertising performance',
								vendors: [],
							},
						],
					}}
					vendorConsents={{}}
				/>
			</ConsentProvider>
		);
		// With no objection control to fall back on, the rows keep their
		// consent switch, so the stack switch must cover them too.
		const stackSwitch = await vi.waitFor(() =>
			getDefined(
				document.querySelector<HTMLElement>(
					'[role="switch"][aria-label="Advertising"]'
				)
			)
		);
		expect(stackSwitch.getAttribute('aria-checked')).toBe('false');
		await userEvent.click(stackSwitch);
		expect(onToggle).toHaveBeenCalledWith(7, true);
	});
});

describe('IAB vendors tab with Google ad tech providers', () => {
	beforeEach(() => {
		window.localStorage.clear();
		vi.clearAllMocks();
		delete (window as { __tcfapi?: unknown }).__tcfapi;
	});

	test('lists each provider with its privacy policy and a consent switch', async () => {
		const gvlFetch = globalThis.fetch;
		globalThis.fetch = vi.fn((input: RequestInfo | URL) =>
			String(input).startsWith('https://lists.example/ac')
				? Promise.resolve(
						Response.json({
							providers: {
								'89': {
									id: 89,
									name: 'Example Ad Tech',
									policyUrl: 'https://ads.example/privacy',
								},
							},
						})
					)
				: gvlFetch(input)
		) as typeof fetch;
		try {
			render(
				<ConsentProvider
					options={{
						...defaultIABOptions,
						iab: {
							...defaultIABOptions.iab,
							additionalConsent: {
								providers: [89],
								url: 'https://lists.example/ac',
							},
						},
					}}
				>
					<IABConsentDialog open />
				</ConsentProvider>
			);

			const vendorsTab = await vi.waitFor(
				() => {
					const el = Array.from(
						document.querySelectorAll<HTMLButtonElement>('[role="tab"]')
					).find((button) =>
						button.textContent?.toLowerCase().includes('vendor')
					);
					return getDefined(el);
				},
				{ timeout: 5000 }
			);
			await userEvent.click(vendorsTab);

			const row = await vi.waitFor(
				() => getDefined(document.getElementById('ad-tech-provider-89')),
				{ timeout: 5000 }
			);
			expect(row.textContent).toContain('Example Ad Tech');
			expect(row.querySelector('a')?.getAttribute('href')).toBe(
				'https://ads.example/privacy'
			);
			expect(document.body.textContent).toContain(
				'Google Ad Tech Providers (1)'
			);

			const providerSwitch = getDefined(
				row.querySelector<HTMLElement>('[role="switch"]')
			);
			expect(providerSwitch.getAttribute('aria-label')).toBe(
				'Consent for Example Ad Tech'
			);
			await userEvent.click(providerSwitch);
			await vi.waitFor(() => {
				expect(providerSwitch.getAttribute('aria-checked')).toBe('true');
			});
		} finally {
			globalThis.fetch = gvlFetch;
		}
	});
});
