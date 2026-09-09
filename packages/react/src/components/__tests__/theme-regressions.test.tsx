import accordionStyles from '@c15t/ui/styles/components/accordion';
import bannerStyles from '@c15t/ui/styles/components/consent-banner';
import dialogStyles from '@c15t/ui/styles/components/consent-dialog';
import triggerStyles from '@c15t/ui/styles/components/consent-dialog-trigger';
import iabBannerStyles from '@c15t/ui/styles/components/iab-consent-banner';
import switchStyles from '@c15t/ui/styles/components/switch';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ComponentFixtureProvider as ConsentProvider } from '~/__tests__/component-fixture-provider';
import {
	StableTriggerProvider,
	StableV3UIConfigProvider,
} from '~/__tests__/stable-context-providers';
import { ConsentBannerTitle } from '~/components/consent-banner/components';
import { ConsentDialogTriggerToolbar } from '~/components/consent-dialog-trigger';
import { TriggerButton } from '~/components/consent-dialog-trigger/atoms/button';
import { ConsentDialogHeaderTitle } from '~/components/consent-dialog/atoms/card';
import { ConsentWidgetAccordion } from '~/components/consent-widget/atoms/accordion';
import { IABConsentBannerFooter } from '~/components/iab-consent-banner/atoms/footer';
import { IABConsentBannerHeader } from '~/components/iab-consent-banner/atoms/header';
import * as Switch from '~/components/shared/ui/switch';
import { offline } from '~/transports/offline';

describe('Theme regressions', () => {
	test('styles trigger toolbar atoms through component slots and direct overrides', async () => {
		await render(
			<ConsentProvider
				options={{
					components: {
						trigger: {
							toolbar: {
								className: 'themed-trigger',
								style: { backgroundColor: 'rgb(1, 2, 3)' },
							},
							toolbarIcon: { className: 'themed-trigger-icon' },
							toolbarItem: { className: 'themed-trigger-item' },
						},
					},
					mode: offline(),
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
			</ConsentProvider>
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
			<StableV3UIConfigProvider
				value={{
					components: {
						'iab-banner': {
							header: {
								className: 'regression-header',
							},
						},
					},
				}}
			>
				<IABConsentBannerHeader data-testid="regression-header">
					<div>Header content</div>
				</IABConsentBannerHeader>
			</StableV3UIConfigProvider>
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
			<StableV3UIConfigProvider
				value={{
					components: {
						'iab-banner': {
							footer: {
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
			</StableV3UIConfigProvider>
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

	test('wires accordion.root slot className and style', async () => {
		await render(
			<StableV3UIConfigProvider
				value={{
					components: {
						accordion: {
							root: {
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
			</StableV3UIConfigProvider>
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

	test('provider noStyle strips v3 surface base classes', async () => {
		await render(
			<ConsentProvider options={{ mode: offline(), noStyle: true }}>
				<ConsentBannerTitle data-testid="nostyle-banner-title">
					Banner title
				</ConsentBannerTitle>
				{/* ConsentDialogHeaderTitle pins its own data-testid after props */}
				<ConsentDialogHeaderTitle>Dialog title</ConsentDialogHeaderTitle>
				<ConsentWidgetAccordion data-testid="nostyle-accordion">
					<div>Accordion content</div>
				</ConsentWidgetAccordion>
				<IABConsentBannerFooter data-testid="nostyle-iab-banner-footer">
					Footer
				</IABConsentBannerFooter>
				<StableTriggerProvider
					value={{
						branding: 'c15t',
						corner: 'bottom-right',
						dragStyle: {},
						handlers: {},
						isDragging: false,
						isSnapping: false,
						isVisible: true,
						openDialog: vi.fn(),
						wasDragged: () => false,
					}}
				>
					<TriggerButton data-testid="nostyle-trigger">Trigger</TriggerButton>
				</StableTriggerProvider>
				<Switch.Root data-testid="nostyle-switch" />
			</ConsentProvider>
		);

		await vi.waitFor(() => {
			const bannerTitle = document.querySelector(
				'[data-testid="nostyle-banner-title"]'
			);
			const dialogTitle = document.querySelector(
				'[data-testid="consent-dialog-title"]'
			);
			const accordion = document.querySelector(
				'[data-testid="nostyle-accordion"]'
			);
			const iabBannerFooter = document.querySelector(
				'[data-testid="nostyle-iab-banner-footer"]'
			);
			const trigger = document.querySelector('[data-testid="nostyle-trigger"]');
			const switchRoot = document.querySelector(
				'[data-testid="nostyle-switch"]'
			);
			const switchTrack = switchRoot?.querySelector(
				'[data-slot="switch-track"]'
			);
			const switchThumb = switchRoot?.querySelector(
				'[data-slot="switch-thumb"]'
			);

			expect(bannerTitle?.className).not.toContain(bannerStyles.title);
			expect(dialogTitle?.className).not.toContain(dialogStyles.title);
			expect(accordion?.className).not.toContain(accordionStyles.list);
			expect(iabBannerFooter?.className).not.toContain(iabBannerStyles.footer);
			expect(trigger?.className).not.toContain(triggerStyles.trigger);
			expect(switchRoot?.className).not.toContain(switchStyles.root);
			expect(switchTrack?.className).not.toContain(switchStyles.track);
			expect(switchThumb?.className).not.toContain(switchStyles.thumb);
		});
	});
});
