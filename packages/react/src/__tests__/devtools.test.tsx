import { createConsentKernel, getIABControls } from '@c15t/core';
import { createIAB } from '@c15t/iab';
import { resolvePolicyRules } from '@c15t/schema/types';
import { createRef } from 'react';
import type { ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { mockGVL } from '../components/iab/__tests__/fixtures/mock-consent-state';
import { KernelContext } from '../context';
import {
	C15TDevTools,
	C15tTanStackDevtoolsPanel,
	ConsentDevTools,
	c15tDevtools,
	c15tDevtoolsPlugin,
	DevTools,
} from '../devtools';
import { ConsentProvider } from '../provider';
import { offline } from '../transports/offline';

const Provider = ({ children }: { children: ReactNode }) => (
	<ConsentProvider
		options={{
			enabled: false,
			mode: offline(),
			persistence: false,
		}}
	>
		{children}
	</ConsentProvider>
);

const getMountedDevTools = (): HTMLElement | null =>
	document.querySelector('[data-c15t-dev-tools]');

afterEach(() => {
	for (const element of document.querySelectorAll('[data-c15t-dev-tools]')) {
		element.remove();
	}
});

describe('v3 React DevTools adapter', () => {
	test.each([false, true])(
		'follows provider scope and presentation updates, embedded=%s',
		async (embedded) => {
			const storageKey = `react-devtools-scope-${embedded}`;
			const tree = (measurement: boolean) => (
				<ConsentProvider
					options={{
						consentCategories: [
							'necessary',
							measurement ? 'measurement' : 'marketing',
						],
						mode: offline(),
						presentation: measurement
							? { preferences: { primaryActions: ['accept'] } }
							: undefined,
						storageConfig: { storageKey },
					}}
				>
					{embedded ? (
						<C15tTanStackDevtoolsPanel />
					) : (
						<ConsentDevTools defaultOpen />
					)}
				</ConsentProvider>
			);
			const view = await render(tree(false));
			try {
				await vi.waitFor(() =>
					expect(
						getMountedDevTools()?.querySelector(
							'[data-focus-key="consent:marketing"]'
						)
					).not.toBeNull()
				);
				const click = (label: string) => {
					const button = [
						...(getMountedDevTools()?.querySelectorAll('button') ?? []),
					].find((element) => element.textContent === label);
					expect(button).toBeDefined();
					button?.click();
				};
				click('Accept all');
				await vi.waitFor(() =>
					expect(localStorage.getItem(storageKey)).not.toBeNull()
				);
				const previous = JSON.parse(localStorage.getItem(storageKey) ?? '{}')
					.categories.marketing;
				await view.rerender(tree(true));
				await vi.waitFor(() =>
					expect(
						getMountedDevTools()?.querySelector(
							'[data-focus-key="consent:measurement"]'
						)
					).not.toBeNull()
				);
				expect(
					getMountedDevTools()?.querySelector(
						'[data-focus-key="consent:marketing"]'
					)
				).toBeNull();
				click('Reject optional');
				await vi.waitFor(() => {
					const { categories } = JSON.parse(
						localStorage.getItem(storageKey) ?? '{}'
					);
					expect(categories.measurement?.value).toBe(false);
					expect(categories.marketing).toEqual(previous);
				});
				getMountedDevTools()
					?.querySelector<HTMLButtonElement>('[data-tab="policy"]')
					?.click();
				expect(getMountedDevTools()?.textContent).toContain(
					'equivalent-prominence-overridden'
				);
			} finally {
				await view.unmount();
				localStorage.removeItem(storageKey);
				document.cookie = `${storageKey}=; Max-Age=0; Path=/`;
			}
		}
	);

	test.each([ConsentDevTools, C15tTanStackDevtoolsPanel])(
		'keeps explicit service callbacks live without remounting (%s)',
		async (Component) => {
			const firstClear = vi.fn();
			const nextClear = vi.fn();
			const tree = (clear: () => void) => (
				<Provider>
					{Component === ConsentDevTools ? (
						<ConsentDevTools
							clearRecords={() => clear()}
							getPresentation={() => undefined}
							defaultOpen
							defaultTab="policy"
						/>
					) : (
						<C15tTanStackDevtoolsPanel
							clearRecords={() => clear()}
							getPresentation={() => undefined}
							defaultTab="policy"
						/>
					)}
				</Provider>
			);
			const view = await render(tree(firstClear));
			try {
				await vi.waitFor(() => expect(getMountedDevTools()).not.toBeNull());
				const root = getMountedDevTools();
				expect(root?.textContent).toContain('Resolved defaults only');
				await view.rerender(tree(nextClear));
				expect(getMountedDevTools()).toBe(root);
				root?.querySelector<HTMLButtonElement>('[data-tab="actions"]')?.click();
				[...(root?.querySelectorAll('button') ?? [])]
					.find((button) => button.textContent === 'Clear stored records')
					?.click();
				expect(firstClear).not.toHaveBeenCalled();
				expect(nextClear).toHaveBeenCalledOnce();
			} finally {
				await view.unmount();
			}
		}
	);

	test.each([false, true])(
		'uses provider presentation and clears its custom persistence key, embedded=%s',
		async (embedded) => {
			const storageKey = `react-devtools-clear-${embedded}`;
			const view = await render(
				<ConsentProvider
					options={{
						mode: offline(),
						presentation: { preferences: { primaryActions: ['accept'] } },
						storageConfig: { storageKey },
					}}
				>
					{embedded ? (
						<C15tTanStackDevtoolsPanel defaultTab="policy" />
					) : (
						<ConsentDevTools
							defaultOpen
							defaultTab="policy"
						/>
					)}
				</ConsentProvider>
			);
			try {
				await vi.waitFor(() =>
					expect(getMountedDevTools()?.textContent).toContain('host-options')
				);
				expect(getMountedDevTools()?.textContent).toContain(
					'equivalent-prominence-overridden'
				);
				const click = (label: string) => {
					const button = [
						...(getMountedDevTools()?.querySelectorAll('button') ?? []),
					].find((element) => element.textContent === label);
					expect(button).toBeDefined();
					button?.click();
				};
				getMountedDevTools()
					?.querySelector<HTMLButtonElement>('[data-tab="consents"]')
					?.click();
				click('Accept all');
				await vi.waitFor(() =>
					expect(localStorage.getItem(storageKey)).not.toBeNull()
				);
				await vi.waitFor(() =>
					expect(
						getMountedDevTools()?.querySelector('[role="status"]')?.textContent
					).toContain('accepted')
				);
				getMountedDevTools()
					?.querySelector<HTMLButtonElement>('[data-tab="actions"]')
					?.click();
				click('Clear stored records');
				await vi.waitFor(() =>
					expect(localStorage.getItem(storageKey)).toBeNull()
				);
				getMountedDevTools()
					?.querySelector<HTMLButtonElement>('[data-tab="policy"]')
					?.click();
				expect(getMountedDevTools()?.textContent).toContain('Absent');
			} finally {
				await view.unmount();
				localStorage.removeItem(storageKey);
				document.cookie = `${storageKey}=; Max-Age=0; Path=/`;
			}
		}
	);

	test.each([false, true])(
		'saves only displayed categories, embedded=%s',
		async (embedded) => {
			const save = vi.fn(() => Promise.resolve({ ok: true as const }));
			const kernel = createConsentKernel({
				transport: { save },
			});
			await kernel.commands.save({ experience: true });
			save.mockClear();
			const hidden = kernel.getSnapshot().explicitChoice?.categories.experience;
			const props = {
				getConsentCategories: () => ['necessary', 'measurement'] as const,
			};
			const view = await render(
				<KernelContext.Provider value={kernel}>
					{embedded ? (
						<C15tTanStackDevtoolsPanel {...props} />
					) : (
						<DevTools
							defaultOpen
							{...props}
						/>
					)}
				</KernelContext.Provider>
			);
			try {
				await vi.waitFor(() => expect(getMountedDevTools()).not.toBeNull());
				for (const [label, accepted] of [
					['Accept all', true],
					['Reject optional', false],
				] as const) {
					const button = [
						...(getMountedDevTools()?.querySelectorAll('button') ?? []),
					].find((element) => element.textContent === label);
					expect(button).toBeDefined();
					button?.click();
					// oxlint-disable-next-line no-await-in-loop -- Reject runs after the preceding accept has completed.
					await vi.waitFor(() =>
						expect(kernel.getSnapshot().effectivePermissions.measurement).toBe(
							accepted
						)
					);
					expect(kernel.getSnapshot().effectivePermissions.experience).toBe(
						true
					);
					expect(
						kernel.getSnapshot().explicitChoice?.categories.experience
					).toEqual(hidden);
					// oxlint-disable-next-line no-await-in-loop -- Verify each sequential save before the next action.
					await vi.waitFor(() =>
						expect(save).toHaveBeenCalledWith(
							expect.objectContaining({
								consents: expect.objectContaining({
									experience: true,
									measurement: accepted,
									necessary: true,
								}),
							})
						)
					);
				}
			} finally {
				await view.unmount();
			}
		}
	);
	test.each([false, true])(
		'edits and saves the existing IAB module, embedded=%s',
		async (embedded) => {
			const resolution = resolvePolicyRules({
				countryCode: null,
				iabEnabled: true,
				regionCode: null,
				rules: [
					{
						id: 'devtools-iab',
						match: { isDefault: true },
						model: 'iab',
						prompt: 'choice',
					},
				],
			});
			if (resolution.status !== 'matched') {
				throw new Error('Devtools fixture policy must resolve');
			}
			const kernel = createConsentKernel({
				initialPolicyResolution: resolution,
			});
			const iab = createIAB({
				cmpId: 28,
				gvl: mockGVL,
				kernel,
				persistence: false,
			});
			const view = await render(
				<KernelContext.Provider value={kernel}>
					{embedded ? (
						<C15tTanStackDevtoolsPanel defaultTab="iab" />
					) : (
						<DevTools
							defaultOpen
							defaultTab="iab"
						/>
					)}
				</KernelContext.Provider>
			);
			try {
				const controls = getIABControls(kernel);
				expect(controls).toBeDefined();
				await vi.waitFor(() =>
					expect(getMountedDevTools()?.textContent).toContain('Accept all IAB')
				);
				const click = (label: string) => {
					const button = [
						...(getMountedDevTools()?.querySelectorAll('button') ?? []),
					].find((element) => element.textContent === label);
					expect(button).toBeDefined();
					button?.click();
				};
				click('Accept all IAB');
				expect(kernel.getSnapshot().iab?.vendorConsents[1]).toBe(true);
				click('Save IAB consent');
				await vi.waitFor(() =>
					expect(getMountedDevTools()?.textContent).toContain(
						'IAB consent saved.'
					)
				);
				expect(kernel.getSnapshot().iab?.tcString).toBeTruthy();
				click('Reject all IAB');
				expect(kernel.getSnapshot().iab?.vendorConsents[1]).toBe(false);
				expect(getIABControls(kernel)).toBe(controls);
			} finally {
				await view.unmount();
				iab.dispose();
			}
		}
	);
	test.each([ConsentDevTools, C15tTanStackDevtoolsPanel])(
		'does not evaluate category callbacks during server rendering (%s)',
		(Component) => {
			const getConsentCategories = vi.fn(() => {
				throw new Error('Browser-only category callback');
			});
			expect(() =>
				renderToString(
					<Provider>
						<Component getConsentCategories={getConsentCategories} />
					</Provider>
				)
			).not.toThrow();
			expect(getConsentCategories).not.toHaveBeenCalled();
		}
	);
	test.each([ConsentDevTools, C15tTanStackDevtoolsPanel])(
		'does not evaluate category callbacks while disabled (%s)',
		async (Component) => {
			const getConsentCategories = vi.fn(() => {
				throw new Error('Disabled category callback');
			});
			const view = await render(
				<Component
					disabled
					getConsentCategories={getConsentCategories}
				/>
			);
			expect(getConsentCategories).not.toHaveBeenCalled();
			expect(getMountedDevTools()).toBeNull();
			await view.unmount();
		}
	);
	test('keeps category getters live between React renders', async () => {
		const kernel = createConsentKernel();
		const view = await render(
			<KernelContext.Provider value={kernel}>
				<ConsentDevTools
					defaultOpen
					getConsentCategories={() =>
						kernel.getSnapshot().effectivePermissions.measurement
							? ['necessary', 'measurement']
							: ['necessary', 'marketing']
					}
				/>
			</KernelContext.Provider>
		);
		await vi.waitFor(() =>
			expect(
				getMountedDevTools()?.querySelector(
					'[data-focus-key="consent:marketing"]'
				)
			).not.toBeNull()
		);
		const root = getMountedDevTools();
		await kernel.commands.save({ measurement: true });
		await vi.waitFor(() => {
			expect(
				getMountedDevTools()?.querySelector(
					'[data-focus-key="consent:measurement"]'
				)
			).not.toBeNull();
			expect(
				getMountedDevTools()?.querySelector(
					'[data-focus-key="consent:marketing"]'
				)
			).toBeNull();
		});
		expect(getMountedDevTools()).toBe(root);
		await view.unmount();
	});
	test.each([false, true])(
		'preserves the active tab and events across inline callback rerenders, embedded=%s',
		async (embedded) => {
			const tree = (measurement: boolean, reordered = false) => {
				const measurementScope = reordered
					? (['measurement', 'necessary', 'measurement'] as const)
					: (['necessary', 'measurement'] as const);
				return (
					<Provider>
						{embedded ? (
							<C15tTanStackDevtoolsPanel
								getConsentCategories={() =>
									measurement ? measurementScope : ['necessary', 'marketing']
								}
							/>
						) : (
							<ConsentDevTools
								defaultOpen
								getConsentCategories={() =>
									measurement ? measurementScope : ['necessary', 'marketing']
								}
							/>
						)}
					</Provider>
				);
			};
			const view = await render(tree(true));
			await vi.waitFor(() => expect(getMountedDevTools()).not.toBeNull());
			const root = getMountedDevTools();
			root
				?.querySelector<HTMLInputElement>(
					'[data-focus-key="consent:measurement"]'
				)
				?.click();
			const saveButton = [...(root?.querySelectorAll('button') ?? [])].find(
				(button) => button.textContent === 'Save changes'
			);
			saveButton?.click();
			await vi.waitFor(() =>
				expect(root?.querySelector('[role="status"]')?.textContent).toBe(
					'Consent saved.'
				)
			);
			root?.querySelector<HTMLButtonElement>('[data-tab="events"]')?.click();
			const events = root?.querySelector('[role="tabpanel"]')?.textContent;
			expect(events).toContain('choice:recorded');
			await view.rerender(tree(true));
			await view.rerender(tree(true, true));
			expect(getMountedDevTools()).toBe(root);
			expect(
				root
					?.querySelector('[data-tab="events"]')
					?.getAttribute('aria-selected')
			).toBe('true');
			expect(root?.querySelector('[role="tabpanel"]')?.textContent).toBe(
				events
			);
			await view.rerender(tree(false));
			await vi.waitFor(() => {
				expect(
					getMountedDevTools()?.querySelector(
						'[data-focus-key="consent:marketing"]'
					)
				).not.toBeNull();
				expect(
					getMountedDevTools()?.querySelector(
						'[data-focus-key="consent:measurement"]'
					)
				).toBeNull();
			});
			await view.unmount();
		}
	);
	test('exports the compatible component names', () => {
		expect(DevTools).toBe(ConsentDevTools);
		expect(C15TDevTools).toBe(ConsentDevTools);
	});

	test('mounts the engine with the provider kernel', async () => {
		const view = await render(
			<Provider>
				<ConsentDevTools
					defaultOpen
					position="top-left"
				/>
			</Provider>
		);

		await vi.waitFor(() => {
			expect(getMountedDevTools()).not.toBeNull();
		});
		const devTools = getMountedDevTools();
		expect(devTools?.classList.contains('c15t-dev-tools--top-left')).toBe(true);
		expect(
			devTools?.querySelector<HTMLElement>('.c15t-dev-tools__panel')?.hidden
		).toBe(false);

		await view.unmount();
	});

	test('rejects an enabled adapter outside the v3 provider', async () => {
		await expect(render(<ConsentDevTools />)).rejects.toThrow(
			'DevTools must be rendered inside <ConsentProvider>'
		);
	});

	test('destroys the engine when the adapter unmounts', async () => {
		const view = await render(
			<Provider>
				<ConsentDevTools />
			</Provider>
		);
		await vi.waitFor(() => {
			expect(getMountedDevTools()).not.toBeNull();
		});

		await view.unmount();

		expect(getMountedDevTools()).toBeNull();
	});
});

describe('v3 TanStack Devtools adapter', () => {
	test('cleans up React 19 callback refs on replacement and unmount', async () => {
		const firstCleanup = vi.fn();
		const secondCleanup = vi.fn();
		const firstRef = vi.fn(() => firstCleanup);
		const secondRef = vi.fn(() => secondCleanup);
		const tree = (ref: typeof firstRef) => (
			<Provider>
				<C15tTanStackDevtoolsPanel ref={ref} />
			</Provider>
		);
		const view = await render(tree(firstRef));
		expect(firstRef).toHaveBeenCalledOnce();
		expect(firstRef).toHaveBeenCalledWith(expect.any(HTMLDivElement));
		await view.rerender(tree(secondRef));
		expect(firstCleanup).toHaveBeenCalledOnce();
		expect(firstRef).toHaveBeenCalledOnce();
		expect(secondRef).toHaveBeenCalledWith(expect.any(HTMLDivElement));
		await view.unmount();
		expect(secondCleanup).toHaveBeenCalledOnce();
		expect(secondRef).toHaveBeenCalledOnce();
		expect(getMountedDevTools()).toBeNull();
	});
	test('clears object refs and legacy callback refs on unmount', async () => {
		const objectRef = createRef<HTMLDivElement>();
		const callbackRef = vi.fn();
		const view = await render(
			<Provider>
				<C15tTanStackDevtoolsPanel ref={objectRef} />
				<C15tTanStackDevtoolsPanel ref={callbackRef} />
			</Provider>
		);
		expect(objectRef.current).toBeInstanceOf(HTMLDivElement);
		expect(callbackRef).toHaveBeenCalledWith(expect.any(HTMLDivElement));
		await view.unmount();
		expect(objectRef.current).toBeNull();
		expect(callbackRef).toHaveBeenLastCalledWith(null);
	});
	test('limits embedded consent controls to the displayed scope', async () => {
		const view = await render(
			<Provider>
				<C15tTanStackDevtoolsPanel
					getConsentCategories={() => ['necessary', 'measurement']}
				/>
			</Provider>
		);
		await vi.waitFor(() => expect(getMountedDevTools()).not.toBeNull());
		expect(getMountedDevTools()?.textContent).toContain('Measurement');
		expect(getMountedDevTools()?.textContent).not.toContain('Marketing');
		await view.unmount();
	});
	test('creates the compatible plugin configuration and embedded panel', async () => {
		const plugin = c15tDevtools({
			'data-testid': 'c15t-tanstack-panel',
			defaultOpen: true,
			id: 'consent',
			name: 'Consent',
		});

		expect(c15tDevtoolsPlugin).toBe(c15tDevtools);
		expect(plugin).toMatchObject({
			defaultOpen: true,
			id: 'consent',
			name: 'Consent',
		});

		const view = await render(<Provider>{plugin.render}</Provider>);
		await vi.waitFor(() => {
			expect(getMountedDevTools()).not.toBeNull();
		});

		const container = document.querySelector(
			'[data-testid="c15t-tanstack-panel"]'
		);
		const devTools = getMountedDevTools();
		expect(container?.contains(devTools)).toBe(true);
		expect(devTools?.classList.contains('c15t-dev-tools--embedded')).toBe(true);
		expect(plugin.render.type).toBe(C15tTanStackDevtoolsPanel);

		await view.unmount();
		expect(getMountedDevTools()).toBeNull();
	});
});
