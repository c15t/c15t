import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import { ComponentFixtureProvider } from '~/__tests__/component-fixture-provider';
import { ConsentDevTools } from '~/devtools';
import { offline } from '~/transports/offline';

import { ConsentDialogTrigger, ConsentDialogTriggerToolbar } from '../index';

const renderWithDevTools = function renderWithDevTools(trigger: ReactNode) {
	return render(
		<ComponentFixtureProvider options={{ mode: offline() }}>
			<ConsentDevTools />
			{trigger}
		</ComponentFixtureProvider>
	);
};

/** DevTools root inside its shadow host. */
const devToolsRoot = function devToolsRoot(): HTMLElement {
	const root = document
		.querySelector('[data-c15t-dev-tools-host]')
		?.shadowRoot?.querySelector<HTMLElement>('[data-c15t-dev-tools]');
	if (!root) {
		throw new Error('Expected DevTools to be mounted');
	}
	return root;
};

const devToolsItem = async function devToolsItem(): Promise<HTMLButtonElement> {
	await vi.waitFor(() => {
		expect(
			document.querySelector('[data-c15t-trigger-action="devtools"]')
		).toBeInTheDocument();
	});
	return document.querySelector<HTMLButtonElement>(
		'[data-c15t-trigger-action="devtools"]'
	) as HTMLButtonElement;
};

beforeEach(() => {
	window.localStorage.clear();
});

afterEach(() => {
	for (const host of document.querySelectorAll('[data-c15t-dev-tools-host]')) {
		host.remove();
	}
});

describe('DevTools launcher in the consent trigger', () => {
	test('the toolbar carries the launcher and docks the panel above itself', async () => {
		renderWithDevTools(
			<ConsentDialogTriggerToolbar
				actions={[
					{
						icon: 'settings',
						id: 'theme',
						label: 'Switch theme',
						onSelect: vi.fn(),
					},
				]}
			/>
		);
		const item = await devToolsItem();
		const toolbar = item.closest<HTMLElement>('[role="toolbar"]');
		if (!toolbar) {
			throw new Error('Expected the DevTools item inside the toolbar');
		}

		// Bottom-right: the DevTools item sits farthest from the corner.
		const actions = [...toolbar.querySelectorAll('button')].map(
			(button) => button.dataset.c15tTriggerAction
		);
		expect(actions).toEqual(['devtools', 'custom', 'preferences']);

		const root = devToolsRoot();
		await vi.waitFor(() => {
			expect(root.classList).toContain('c15t-dev-tools--docked');
		});
		const toolbarTop = toolbar.getBoundingClientRect().top;
		const block = Number.parseFloat(
			root.style.getPropertyValue('--c15t-dev-tools-dock-block')
		);
		expect(document.documentElement.clientHeight - block).toBeLessThan(
			toolbarTop
		);

		expect(item).toHaveAttribute('aria-expanded', 'false');
		await userEvent.click(item);
		await vi.waitFor(() => {
			expect(item).toHaveAttribute('aria-expanded', 'true');
		});
		const panel = root.querySelector<HTMLElement>('.c15t-dev-tools__panel');
		expect(panel?.hidden).toBe(false);
		expect(panel?.getBoundingClientRect().bottom).toBeLessThanOrEqual(
			toolbarTop
		);

		await userEvent.click(item);
		await vi.waitFor(() => {
			expect(item).toHaveAttribute('aria-expanded', 'false');
		});
	});

	test('the single-button trigger becomes a toolbar while DevTools is mounted', async () => {
		renderWithDevTools(<ConsentDialogTrigger showWhen="always" />);

		await devToolsItem();
		expect(
			document.querySelector(
				'[data-c15t-trigger-action="preferences"][aria-label="Open privacy settings"]'
			)
		).toBeInTheDocument();
	});

	test('the floating launcher returns when the trigger unmounts', async () => {
		const screen = await renderWithDevTools(<ConsentDialogTriggerToolbar />);
		await devToolsItem();
		await vi.waitFor(() => {
			expect(devToolsRoot().classList).toContain('c15t-dev-tools--docked');
		});

		await screen.rerender(
			<ComponentFixtureProvider options={{ mode: offline() }}>
				<ConsentDevTools />
			</ComponentFixtureProvider>
		);
		await vi.waitFor(() => {
			expect(devToolsRoot().classList).not.toContain('c15t-dev-tools--docked');
		});
	});
});
