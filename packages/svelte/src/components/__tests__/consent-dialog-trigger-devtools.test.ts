/**
 * ConsentDialogTrigger carries the DevTools launcher while ConsentDevTools
 * is mounted for the same provider.
 */

import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';

import Fixture from '../../__tests__/fixtures/trigger-devtools-fixture.svelte';

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

const devToolsItem = async function devToolsItem(): Promise<HTMLElement> {
	await waitFor(() => {
		expect(
			document.querySelector('[data-c15t-trigger-action="devtools"]')
		).not.toBeNull();
	});
	return document.querySelector(
		'[data-c15t-trigger-action="devtools"]'
	) as HTMLElement;
};

const toolbarActions = (): (string | undefined)[] =>
	[
		...document.querySelectorAll<HTMLElement>(
			'[role="toolbar"] [data-c15t-trigger-action]'
		),
	].map((item) => item.dataset.c15tTriggerAction);

describe('ConsentDialogTrigger with ConsentDevTools', () => {
	test('becomes a toolbar that docks and toggles the DevTools panel', async () => {
		render(Fixture);
		const item = await devToolsItem();

		// Bottom-right: the DevTools item sits farthest from the corner.
		expect(toolbarActions()).toEqual(['devtools', 'preferences']);
		expect(
			document.querySelector(
				'[data-c15t-trigger-action="preferences"][aria-label="Open privacy settings"]'
			)
		).not.toBeNull();
		await waitFor(() => {
			expect(devToolsRoot().classList).toContain('c15t-dev-tools--docked');
		});

		const panel = () =>
			devToolsRoot().querySelector<HTMLElement>('.c15t-dev-tools__panel');
		expect(item.getAttribute('aria-expanded')).toBe('false');
		await fireEvent.click(item);
		await waitFor(() => {
			expect(item.getAttribute('aria-expanded')).toBe('true');
		});
		expect(panel()?.hidden).toBe(false);

		await fireEvent.click(item);
		await waitFor(() => {
			expect(item.getAttribute('aria-expanded')).toBe('false');
		});
		expect(panel()?.hidden).toBe(true);
	});

	test('puts the DevTools item on the right in a left corner', async () => {
		render(Fixture, { defaultPosition: 'bottom-left' });
		await devToolsItem();

		expect(toolbarActions()).toEqual(['preferences', 'devtools']);
	});

	test('renders the single button without DevTools', async () => {
		render(Fixture, { devTools: false });
		await waitFor(() => {
			expect(
				document.querySelector('[data-testid="consent-dialog-trigger"]')
			).not.toBeNull();
		});

		const trigger = document.querySelector(
			'[data-testid="consent-dialog-trigger"]'
		);
		expect(trigger?.tagName).toBe('BUTTON');
		expect(trigger?.getAttribute('data-c15t-trigger')).toBe('true');
		expect(document.querySelector('[role="toolbar"]')).toBeNull();
		expect(
			document.querySelector('[data-c15t-trigger-action="devtools"]')
		).toBeNull();
	});

	test('gives DevTools its launcher back when the trigger hides or unmounts', async () => {
		const result = render(Fixture);
		await devToolsItem();
		await waitFor(() => {
			expect(devToolsRoot().classList).toContain('c15t-dev-tools--docked');
		});

		await result.rerender({ showWhen: 'never' });
		await waitFor(() => {
			expect(devToolsRoot().classList).not.toContain('c15t-dev-tools--docked');
		});

		await result.rerender({ showWhen: 'always' });
		await devToolsItem();
		await waitFor(() => {
			expect(devToolsRoot().classList).toContain('c15t-dev-tools--docked');
		});

		await result.rerender({ trigger: false });
		await waitFor(() => {
			expect(devToolsRoot().classList).not.toContain('c15t-dev-tools--docked');
		});
	});
});
