import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { GlobalThemeContext } from '~/context/theme-context';
import { ConsentWidgetAccordion } from '~/v3/components/consent-widget/atoms/accordion';
import { IABConsentBannerFooter } from '~/v3/components/iab-consent-banner/atoms/footer';
import { IABConsentBannerHeader } from '~/v3/components/iab-consent-banner/atoms/header';

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
});
