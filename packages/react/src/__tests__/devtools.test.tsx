import type { ReactNode } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

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
		'preserves the active tab and events across inline callback rerenders, embedded=%s',
		async (embedded) => {
			const tree = (measurement: boolean) => (
				<Provider>
					{embedded ? (
						<C15tTanStackDevtoolsPanel
							getConsentCategories={() =>
								measurement
									? ['necessary', 'measurement']
									: ['necessary', 'marketing']
							}
						/>
					) : (
						<ConsentDevTools
							defaultOpen
							getConsentCategories={() =>
								measurement
									? ['necessary', 'measurement']
									: ['necessary', 'marketing']
							}
						/>
					)}
				</Provider>
			);
			const view = await render(tree(true));
			await vi.waitFor(() => expect(getMountedDevTools()).not.toBeNull());
			const root = getMountedDevTools();
			root
				?.querySelector<HTMLInputElement>(
					'[data-focus-key="consent:measurement"]'
				)
				?.click();
			root?.querySelector<HTMLButtonElement>('[data-tab="events"]')?.click();
			const events = root?.querySelector('[role="tabpanel"]')?.textContent;
			expect(events).toContain('consent:set');
			await view.rerender(tree(true));
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
			view.unmount();
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

		view.unmount();
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

		view.unmount();

		expect(getMountedDevTools()).toBeNull();
	});
});

describe('v3 TanStack Devtools adapter', () => {
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
		view.unmount();
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

		view.unmount();
		expect(getMountedDevTools()).toBeNull();
	});
});
