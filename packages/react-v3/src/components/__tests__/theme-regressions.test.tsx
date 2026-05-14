import type { ConsentStoreState } from 'c15t';
import { defaultTranslationConfig } from 'c15t';
import { createRef } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { ConsentDialogOverlay } from '~/components/consent-dialog/atoms/overlay';
import { ConsentWidgetAccordion } from '~/components/consent-widget/atoms/accordion';
import { IABConsentBannerFooter } from '~/components/iab-consent-banner/atoms/footer';
import { IABConsentBannerHeader } from '~/components/iab-consent-banner/atoms/header';
import { ConsentStateContext } from '~/context/consent-manager-context';
import { GlobalThemeContext } from '~/context/theme-context';

function createMockState(
	overrides: Partial<ConsentStoreState> = {}
): ConsentStoreState {
	return {
		activeUI: 'dialog',
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

describe('Theme regressions', () => {
	test('does not forward slot noStyle to the DOM', async () => {
		await render(
			<GlobalThemeContext.Provider
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
			</GlobalThemeContext.Provider>
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
			<GlobalThemeContext.Provider
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
			</GlobalThemeContext.Provider>
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
			<GlobalThemeContext.Provider
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
			</GlobalThemeContext.Provider>
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
			<GlobalThemeContext.Provider value={{ noStyle: false }}>
				<ConsentStateContext.Provider
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
					<ConsentDialogOverlay
						ref={overlayRef}
						className="dialog-overlay-direct"
						data-qa="overlay"
						id="overlay-id"
						noStyle
						style={{ backgroundColor: 'rgb(7, 8, 9)' }}
					/>
				</ConsentStateContext.Provider>
			</GlobalThemeContext.Provider>
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
