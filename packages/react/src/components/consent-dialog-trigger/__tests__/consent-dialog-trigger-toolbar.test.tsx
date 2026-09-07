import styles from '@c15t/ui/styles/components/consent-dialog-trigger';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import { ComponentFixtureProvider } from '~/__tests__/component-fixture-provider';
import { ConsentDialog } from '~/components/consent-dialog';
import { offline } from '~/transports/offline';

import { ConsentDialogTrigger, ConsentDialogTriggerToolbar } from '../index';

/**
 * Renders the trigger surface inside a real provider with a preference
 * center, so opening preferences can be observed on the dialog root.
 */
const renderWithConsent = function renderWithConsent(
	children: ReactNode,
	{ noStyle = false }: { noStyle?: boolean } = {}
): void {
	render(
		<ComponentFixtureProvider options={{ mode: offline(), noStyle }}>
			<ConsentDialog />
			{children}
		</ComponentFixtureProvider>
	);
};

const dialogRoot = function dialogRoot(): Element | null {
	return document.querySelector('[data-testid="consent-dialog-root"]');
};

const expectDialogOpen = async function expectDialogOpen(): Promise<void> {
	await vi.waitFor(() => {
		expect(dialogRoot()).toBeInTheDocument();
	});
};

const getToolbar = async function getToolbar(): Promise<HTMLElement> {
	await vi.waitFor(() => {
		expect(document.querySelector('[role="toolbar"]')).toBeInTheDocument();
	});

	const toolbar = document.querySelector<HTMLElement>('[role="toolbar"]');
	if (!toolbar) {
		throw new Error('Expected the consent dialog trigger toolbar to render');
	}
	return toolbar;
};

const queryRequiredElement = function queryRequiredElement<
	ElementType extends Element = HTMLElement,
>(root: ParentNode, selector: string): ElementType {
	const element = root.querySelector<ElementType>(selector);
	if (!element) {
		throw new Error(`Expected element matching ${selector}`);
	}
	return element;
};

const dragElement = async function dragElement(
	element: HTMLElement
): Promise<void> {
	const releasePointerCapture = vi.fn();
	Object.defineProperties(element, {
		releasePointerCapture: { value: releasePointerCapture },
		setPointerCapture: { value: vi.fn() },
	});

	element.dispatchEvent(
		new PointerEvent('pointerdown', {
			bubbles: true,
			button: 0,
			clientX: 10,
			clientY: 10,
			pointerId: 1,
		})
	);
	element.dispatchEvent(
		new PointerEvent('pointermove', {
			bubbles: true,
			clientX: 30,
			clientY: 10,
			pointerId: 1,
		})
	);
	element.dispatchEvent(
		new PointerEvent('pointerup', {
			bubbles: true,
			button: 0,
			clientX: 30,
			clientY: 10,
			pointerId: 1,
		})
	);

	await vi.waitFor(() => {
		expect(releasePointerCapture).toHaveBeenCalledWith(1);
	});
};

describe('ConsentDialogTrigger compatibility', () => {
	test('keeps the existing single-button trigger behavior and compound API', async () => {
		renderWithConsent(<ConsentDialogTrigger showWhen="always" />);

		await vi.waitFor(() => {
			expect(
				document.querySelector(
					'button[data-c15t-trigger="true"][aria-label="Open privacy settings"]'
				)
			).toBeInTheDocument();
		});

		const trigger = queryRequiredElement<HTMLButtonElement>(
			document,
			'button[data-c15t-trigger="true"]'
		);
		expect(trigger.className).toContain(styles.trigger);
		expect(document.querySelector('[role="toolbar"]')).not.toBeInTheDocument();
		expect(ConsentDialogTrigger.Root).toBeDefined();
		expect(ConsentDialogTrigger.Button).toBeDefined();
		expect(ConsentDialogTrigger.Icon).toBeDefined();
		expect(ConsentDialogTrigger.Text).toBeDefined();

		await userEvent.click(trigger);
		await expectDialogOpen();
	});

	test('allows keyboard activation after dragging the existing trigger', async () => {
		renderWithConsent(<ConsentDialogTrigger showWhen="always" />);

		await vi.waitFor(() => {
			expect(
				document.querySelector('button[data-c15t-trigger="true"]')
			).toBeInTheDocument();
		});
		const trigger = queryRequiredElement<HTMLButtonElement>(
			document,
			'button[data-c15t-trigger="true"]'
		);

		await dragElement(trigger);
		trigger.dispatchEvent(
			new MouseEvent('click', { bubbles: true, detail: 1 })
		);
		expect(dialogRoot()).not.toBeInTheDocument();

		trigger.focus();
		await userEvent.keyboard('{Enter}');
		await expectDialogOpen();
	});
});

describe('ConsentDialogTriggerToolbar', () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	test('always renders exactly one preferences action', async () => {
		const onCustomSelect = vi.fn();
		const onPreferencesSelect = vi.fn();
		renderWithConsent(
			<ConsentDialogTriggerToolbar
				actions={[
					{
						icon: 'settings',
						id: 'support',
						label: 'Open support chat',
						onSelect: onCustomSelect,
					},
				]}
				preferences={{ onSelect: onPreferencesSelect }}
			/>
		);
		const toolbar = await getToolbar();
		const preferencesActions = toolbar.querySelectorAll(
			'[data-c15t-trigger-action="preferences"]'
		);

		expect(toolbar.querySelectorAll('button')).toHaveLength(2);
		expect(preferencesActions).toHaveLength(1);

		await userEvent.click(
			queryRequiredElement<HTMLButtonElement>(
				toolbar,
				'[data-c15t-trigger-action="custom"]'
			)
		);
		expect(onCustomSelect).toHaveBeenCalledOnce();
		expect(dialogRoot()).not.toBeInTheDocument();

		await userEvent.click(
			queryRequiredElement<HTMLButtonElement>(
				toolbar,
				'[data-c15t-trigger-action="preferences"]'
			)
		);
		expect(onPreferencesSelect).toHaveBeenCalledOnce();
		await expectDialogOpen();
	});

	test.each([
		['horizontal', 'bottom-left', 'preferences', 'support'],
		['horizontal', 'bottom-right', 'support', 'preferences'],
		['vertical', 'top-left', 'preferences', 'support'],
		['vertical', 'bottom-right', 'support', 'preferences'],
	] as const)(
		'orders the %s toolbar nearest the %s corner',
		async (orientation, defaultPosition, firstItem, lastItem) => {
			renderWithConsent(
				<div dir="rtl">
					<ConsentDialogTriggerToolbar
						actions={[
							{
								icon: 'settings',
								id: 'support',
								label: 'Open support chat',
								onSelect: vi.fn(),
							},
						]}
						defaultPosition={defaultPosition}
						orientation={orientation}
					/>
				</div>
			);
			const toolbar = await getToolbar();
			const buttons = Array.from(toolbar.querySelectorAll('button'));

			expect(toolbar).toHaveAttribute('dir', 'ltr');
			expect(toolbar).toHaveAttribute('data-corner', defaultPosition);
			expect(buttons[0]).toHaveAttribute('data-c15t-trigger-item', firstItem);
			expect(buttons.at(-1)).toHaveAttribute(
				'data-c15t-trigger-item',
				lastItem
			);
		}
	);

	test('supports roving focus, disabled actions, and toggle state', async () => {
		const disabledSelect = vi.fn();
		renderWithConsent(
			<ConsentDialogTriggerToolbar
				actions={[
					{
						disabled: true,
						icon: 'settings',
						id: 'disabled',
						label: 'Unavailable action',
						onSelect: disabledSelect,
					},
					{
						icon: 'settings',
						id: 'theme',
						label: 'Use dark theme',
						onSelect: vi.fn(),
						pressed: true,
					},
				]}
			/>
		);
		const toolbar = await getToolbar();
		const disabled = queryRequiredElement<HTMLButtonElement>(
			toolbar,
			'[data-c15t-trigger-item="disabled"]'
		);
		const theme = queryRequiredElement<HTMLButtonElement>(
			toolbar,
			'[data-c15t-trigger-item="theme"]'
		);
		const preferences = queryRequiredElement<HTMLButtonElement>(
			toolbar,
			'[data-c15t-trigger-action="preferences"]'
		);

		expect(disabled).toBeDisabled();
		expect(disabled).toHaveAttribute('tabindex', '-1');
		expect(theme).toHaveAttribute('aria-pressed', 'true');
		expect(theme).toHaveAttribute('tabindex', '0');

		disabled.click();
		expect(disabledSelect).not.toHaveBeenCalled();

		theme.focus();
		await userEvent.keyboard('{ArrowRight}');
		expect(preferences).toHaveFocus();
		await userEvent.keyboard('{Home}');
		expect(theme).toHaveFocus();
		await userEvent.keyboard('{End}');
		expect(preferences).toHaveFocus();
	});

	test('preserves direct overrides and exposes state when unstyled', async () => {
		renderWithConsent(
			<ConsentDialogTriggerToolbar
				actions={[
					{
						className: 'custom-action',
						icon: 'settings',
						id: 'support',
						label: 'Open support chat',
						onSelect: vi.fn(),
					},
				]}
				className="custom-toolbar"
				noStyle
				preferences={{ className: 'custom-preferences' }}
				style={{ backgroundColor: 'rgb(1, 2, 3)' }}
			/>,
			{ noStyle: true }
		);
		const toolbar = await getToolbar();
		const customAction = queryRequiredElement<HTMLElement>(
			toolbar,
			'[data-c15t-trigger-action="custom"]'
		);
		const preferences = queryRequiredElement<HTMLElement>(
			toolbar,
			'[data-c15t-trigger-action="preferences"]'
		);
		const icon = customAction.querySelector<HTMLElement>(
			'[aria-hidden="true"]'
		);

		expect(toolbar.className).toBe('custom-toolbar');
		expect(toolbar.className).not.toContain(styles.toolbar);
		expect(toolbar).toHaveStyle({ backgroundColor: 'rgb(1, 2, 3)' });
		expect(toolbar).toHaveAttribute('data-corner', 'bottom-right');
		expect(toolbar).not.toHaveAttribute('data-dragging');
		expect(toolbar).not.toHaveAttribute('data-snapping');
		expect(toolbar).not.toHaveAttribute('noStyle');
		expect(customAction.className).toBe('custom-action');
		expect(preferences.className).toBe('custom-preferences');
		expect(icon?.className).not.toContain(styles.toolbarIcon);
	});

	test('allows keyboard activation after a drag and suppresses its pointer click', async () => {
		const onSelect = vi.fn();
		renderWithConsent(
			<ConsentDialogTriggerToolbar
				actions={[
					{
						icon: 'settings',
						id: 'support',
						label: 'Open support chat',
						onSelect,
					},
				]}
			/>
		);
		const toolbar = await getToolbar();
		const action = queryRequiredElement<HTMLButtonElement>(
			toolbar,
			'[data-c15t-trigger-item="support"]'
		);

		await dragElement(toolbar);
		action.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
		expect(onSelect).not.toHaveBeenCalled();

		action.focus();
		await userEvent.keyboard('{Enter}');
		expect(onSelect).toHaveBeenCalledOnce();
	});
});
