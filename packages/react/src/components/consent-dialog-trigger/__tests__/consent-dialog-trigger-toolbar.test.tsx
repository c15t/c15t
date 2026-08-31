import type { ConsentStoreState } from '@c15t/core';
import { defaultTranslationConfig } from '@c15t/core';
import styles from '@c15t/ui/styles/components/consent-dialog-trigger.module.js';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import {
	StableConsentStateProvider,
	StableGlobalThemeProvider,
} from '~/__tests__/stable-context-providers';
import { ConsentStateContext } from '~/context/consent-manager-context';
import { GlobalThemeContext } from '~/context/theme-context';

import { ConsentDialogTrigger, ConsentDialogTriggerToolbar } from '../index';

function createMockState(
	overrides: Partial<ConsentStoreState> = {}
): ConsentStoreState {
	return {
		activeUI: 'none',
		model: 'opt-in',
		translationConfig: defaultTranslationConfig,
		consents: {
			necessary: true,
			functionality: false,
			experience: false,
			marketing: false,
			measurement: false,
		},
		selectedConsents: {
			necessary: true,
			functionality: false,
			experience: false,
			marketing: false,
			measurement: false,
		},
		consentInfo: null,
		consentCategories: [
			'necessary',
			'functionality',
			'experience',
			'marketing',
			'measurement',
		],
		consentTypes: [],
		policyCategories: null,
		policyScopeMode: null,
		policyBanner: {},
		policyDialog: {},
		saveConsents: vi.fn().mockResolvedValue(undefined),
		setConsent: vi.fn(),
		setSelectedConsent: vi.fn(),
		setActiveUI: vi.fn(),
		has: vi.fn(),
		hasConsented: vi.fn(),
		getDisplayedConsents: vi.fn(() => []),
		subscribeToConsentChanges: vi.fn(() => () => undefined),
		...overrides,
	} as unknown as ConsentStoreState;
}

function renderWithConsentState(
	children: ReactNode,
	{
		noStyle = false,
		state = createMockState(),
	}: { noStyle?: boolean; state?: ConsentStoreState } = {}
): ConsentStoreState {
	render(
		<StableGlobalThemeProvider value={{ noStyle }}>
			<StableConsentStateProvider
				value={{
					state,
					store: {
						getState: () => state,
						subscribe: () => () => undefined,
						setState: () => undefined,
					},
					manager: null,
				}}
			>
				{children}
			</StableConsentStateProvider>
		</StableGlobalThemeProvider>
	);

	return state;
}

async function getToolbar(): Promise<HTMLElement> {
	await vi.waitFor(() => {
		expect(document.querySelector('[role="toolbar"]')).toBeInTheDocument();
	});

	const toolbar = document.querySelector<HTMLElement>('[role="toolbar"]');
	if (!toolbar) {
		throw new Error('Expected the consent dialog trigger toolbar to render');
	}
	return toolbar;
}

function queryRequiredElement<ElementType extends Element = HTMLElement>(
	root: ParentNode,
	selector: string
): ElementType {
	const element = root.querySelector<ElementType>(selector);
	if (!element) {
		throw new Error(`Expected element matching ${selector}`);
	}
	return element;
}

async function dragElement(element: HTMLElement): Promise<void> {
	const releasePointerCapture = vi.fn();
	Object.defineProperties(element, {
		setPointerCapture: { value: vi.fn() },
		releasePointerCapture: { value: releasePointerCapture },
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
}

describe('ConsentDialogTrigger compatibility', () => {
	test('keeps the existing single-button trigger behavior and compound API', async () => {
		const state = renderWithConsentState(
			<ConsentDialogTrigger showWhen="always" />
		);

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
		expect(state.setActiveUI).toHaveBeenCalledWith('dialog');
	});

	test('allows keyboard activation after dragging the existing trigger', async () => {
		const state = renderWithConsentState(
			<ConsentDialogTrigger showWhen="always" />
		);

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
		expect(state.setActiveUI).not.toHaveBeenCalled();

		trigger.focus();
		await userEvent.keyboard('{Enter}');
		expect(state.setActiveUI).toHaveBeenCalledWith('dialog');
	});
});

describe('ConsentDialogTriggerToolbar', () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	test('always renders exactly one preferences action', async () => {
		const onCustomSelect = vi.fn();
		const onPreferencesSelect = vi.fn();
		const state = renderWithConsentState(
			<ConsentDialogTriggerToolbar
				actions={[
					{
						id: 'support',
						label: 'Open support chat',
						icon: 'settings',
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
		expect(state.setActiveUI).not.toHaveBeenCalled();

		await userEvent.click(
			queryRequiredElement<HTMLButtonElement>(
				toolbar,
				'[data-c15t-trigger-action="preferences"]'
			)
		);
		expect(onPreferencesSelect).toHaveBeenCalledOnce();
		expect(state.setActiveUI).toHaveBeenCalledWith('dialog');
	});

	test.each([
		['horizontal', 'bottom-left', 'preferences', 'support'],
		['horizontal', 'bottom-right', 'support', 'preferences'],
		['vertical', 'top-left', 'preferences', 'support'],
		['vertical', 'bottom-right', 'support', 'preferences'],
	] as const)(
		'orders the %s toolbar nearest the %s corner',
		async (orientation, defaultPosition, firstItem, lastItem) => {
			renderWithConsentState(
				<div dir="rtl">
					<ConsentDialogTriggerToolbar
						actions={[
							{
								id: 'support',
								label: 'Open support chat',
								icon: 'settings',
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
		renderWithConsentState(
			<ConsentDialogTriggerToolbar
				actions={[
					{
						id: 'disabled',
						label: 'Unavailable action',
						icon: 'settings',
						onSelect: disabledSelect,
						disabled: true,
					},
					{
						id: 'theme',
						label: 'Use dark theme',
						icon: 'settings',
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
		renderWithConsentState(
			<ConsentDialogTriggerToolbar
				actions={[
					{
						id: 'support',
						label: 'Open support chat',
						icon: 'settings',
						onSelect: vi.fn(),
						className: 'custom-action',
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
		renderWithConsentState(
			<ConsentDialogTriggerToolbar
				actions={[
					{
						id: 'support',
						label: 'Open support chat',
						icon: 'settings',
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
