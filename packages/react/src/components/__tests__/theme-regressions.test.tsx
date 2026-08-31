import type { ConsentStoreState } from '@c15t/core';
import { defaultTranslationConfig } from '@c15t/core';
import { createRef } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import {
	StableConsentStateProvider,
	StableGlobalThemeProvider,
} from '~/__tests__/stable-context-providers';
import { ConsentDialogTriggerToolbar } from '~/components/consent-dialog-trigger';
import { ConsentDialogOverlay } from '~/components/consent-dialog/atoms/overlay';
import { ConsentWidgetAccordion } from '~/components/consent-widget/atoms/accordion';
import { IABConsentBannerFooter } from '~/components/iab-consent-banner/atoms/footer';
import { IABConsentBannerHeader } from '~/components/iab-consent-banner/atoms/header';
import { GlobalThemeContext as _GlobalThemeContext } from '~/context/theme-context';

const createMockState = function createMockState(
	overrides: Partial<ConsentStoreState> = {}
): ConsentStoreState {
	return {
		activeUI: 'dialog',
		consentCategories: [
			'necessary',
			'functionality',
			'experience',
			'marketing',
			'measurement',
		],
		consentInfo: null,
		consentTypes: [],
		consents: {
			experience: false,
			functionality: false,
			marketing: false,
			measurement: false,
			necessary: true,
		},
		getDisplayedConsents: vi.fn(() => []),
		has: vi.fn(),
		hasConsented: vi.fn(),
		model: 'opt-in',
		policyBanner: {},
		policyCategories: null,
		policyDialog: {},
		policyScopeMode: null,
		saveConsents: vi.fn().mockResolvedValue(undefined),
		selectedConsents: {
			experience: false,
			functionality: false,
			marketing: false,
			measurement: false,
			necessary: true,
		},
		setActiveUI: vi.fn(),
		setConsent: vi.fn(),
		setSelectedConsent: vi.fn(),
		subscribeToConsentChanges: vi.fn(() => () => undefined),
		translationConfig: defaultTranslationConfig,
		...overrides,
	} as unknown as ConsentStoreState;
};

describe('Theme regressions', () => {
	test('styles trigger toolbar atoms through theme slots and direct overrides', async () => {
		const state = createMockState({
			activeUI: 'none',
			hasConsented: vi.fn(() => true),
		});

		await render(
			<StableGlobalThemeProvider
				value={{
					noStyle: false,
					theme: {
						slots: {
							consentDialogTriggerToolbar: {
								className: 'themed-trigger',
								style: { backgroundColor: 'rgb(1, 2, 3)' },
							},
							consentDialogTriggerToolbarIcon: 'themed-trigger-icon',
							consentDialogTriggerToolbarItem: 'themed-trigger-item',
						},
					},
				}}
			>
				<StableConsentStateProvider
					value={{
						manager: null,
						state,
						store: {
							getState: () => state,
							setState: () => undefined,
							subscribe: () => () => undefined,
						},
					}}
				>
					<ConsentDialogTriggerToolbar
						actions={[
							{
								icon: 'settings',
								id: 'support',
								label: 'Open support chat',
								onSelect: vi.fn(),
							},
						]}
						className="direct-trigger"
						preferences={{
							className: 'direct-trigger-item',
							style: { color: 'rgb(4, 5, 6)' },
						}}
						showWhen="always"
						style={{ borderRadius: '12px' }}
					/>
				</StableConsentStateProvider>
			</StableGlobalThemeProvider>
		);

		await vi.waitFor(() => {
			const toolbar = document.querySelector<HTMLElement>(
				'[role="toolbar"][aria-label="Privacy controls"]'
			);
			const item = document.querySelector<HTMLElement>(
				'[data-c15t-trigger-item="preferences"]'
			);
			const icon = item?.querySelector<HTMLElement>('[aria-hidden="true"]');

			expect(toolbar).toBeInTheDocument();
			expect(toolbar?.className).toContain('themed-trigger');
			expect(toolbar?.className).toContain('direct-trigger');
			expect(toolbar).toHaveStyle({
				backgroundColor: 'rgb(1, 2, 3)',
				borderRadius: '12px',
			});
			expect(item?.className).toContain('themed-trigger-item');
			expect(item?.className).toContain('direct-trigger-item');
			expect(item).toHaveStyle({ color: 'rgb(4, 5, 6)' });
			expect(icon?.className).toContain('themed-trigger-icon');
		});
	});

	test('does not forward slot noStyle to the DOM', async () => {
		await render(
			<StableGlobalThemeProvider
				value={{
					noStyle: false,
					theme: {
						slots: {
							iabConsentBannerHeader: {
								className: 'regression-header',
								noStyle: true,
							},
						},
					},
				}}
			>
				<IABConsentBannerHeader data-testid="regression-header">
					<div>Header content</div>
				</IABConsentBannerHeader>
			</StableGlobalThemeProvider>
		);

		await vi.waitFor(() => {
			const header = document.querySelector(
				'[data-testid="regression-header"]'
			) as HTMLElement | null;
			expect(header).toBeInTheDocument();
			expect(header).not.toHaveAttribute('noStyle');
			expect(header?.className).toContain('regression-header');
		});
	});

	test('applies inline style from slot objects', async () => {
		await render(
			<StableGlobalThemeProvider
				value={{
					noStyle: false,
					theme: {
						slots: {
							iabConsentBannerFooter: {
								className: 'regression-footer',
								style: {
									backgroundColor: 'rgb(1, 2, 3)',
									borderRadius: '12px',
								},
							},
						},
					},
				}}
			>
				<IABConsentBannerFooter data-testid="regression-footer">
					<div>Footer content</div>
				</IABConsentBannerFooter>
			</StableGlobalThemeProvider>
		);

		await vi.waitFor(() => {
			const footer = document.querySelector(
				'[data-testid="regression-footer"]'
			) as HTMLElement | null;
			expect(footer).toBeInTheDocument();
			expect(footer?.className).toContain('regression-footer');
			expect(footer).toHaveStyle({
				backgroundColor: 'rgb(1, 2, 3)',
				borderRadius: '12px',
			});
		});
	});

	test('wires consentWidgetAccordion slot className and style', async () => {
		await render(
			<StableGlobalThemeProvider
				value={{
					noStyle: false,
					theme: {
						slots: {
							consentWidgetAccordion: {
								className: 'regression-accordion',
								style: {
									backgroundColor: 'rgb(4, 5, 6)',
									padding: '12px',
								},
							},
						},
					},
				}}
			>
				<ConsentWidgetAccordion data-testid="regression-accordion">
					<div>Accordion content</div>
				</ConsentWidgetAccordion>
			</StableGlobalThemeProvider>
		);

		await vi.waitFor(() => {
			const accordion = document.querySelector(
				'[data-testid="regression-accordion"]'
			) as HTMLElement | null;
			expect(accordion).toBeInTheDocument();
			expect(accordion?.className).toContain('regression-accordion');
			expect(accordion).toHaveStyle({
				backgroundColor: 'rgb(4, 5, 6)',
				padding: '12px',
			});
		});
	});

	test('allows direct className and inline style on ConsentDialog.Overlay', async () => {
		const state = createMockState();
		const overlayRef = createRef<HTMLDivElement>();

		await render(
			<StableGlobalThemeProvider value={{ noStyle: false }}>
				<StableConsentStateProvider
					value={{
						manager: null,
						state,
						store: {
							getState: () => state,
							setState: () => undefined,
							subscribe: () => () => undefined,
						},
					}}
				>
					<ConsentDialogOverlay
						ref={overlayRef}
						className="dialog-overlay-direct"
						data-qa="overlay"
						id="overlay-id"
						noStyle
						style={{ backgroundColor: 'rgb(7, 8, 9)' }}
					/>
				</StableConsentStateProvider>
			</StableGlobalThemeProvider>
		);

		await vi.waitFor(() => {
			const overlay = document.querySelector(
				'[data-testid="consent-dialog-overlay"]'
			) as HTMLElement | null;

			expect(overlay).toBeInTheDocument();
			expect(overlayRef.current).toBe(overlay);
			expect(overlay).toHaveAttribute('data-qa', 'overlay');
			expect(overlay).toHaveAttribute('id', 'overlay-id');
			expect(overlay?.className).toContain('dialog-overlay-direct');
			expect(overlay).toHaveStyle({
				backgroundColor: 'rgb(7, 8, 9)',
			});
		});
	});
});
