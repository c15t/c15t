import { policyRulePresets } from '@c15t/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createConsentClient } from '../client';
import { classes } from '../generated/styles';
import type {
	ConsentClient,
	ConsentUIHandle,
	ConsentUIOptions,
} from '../types';
import { mountConsentUI } from '../ui/mount';

const clients: ConsentClient[] = [];

const clearCookies = function clearCookies(): void {
	for (const entry of document.cookie.split(';')) {
		const name = entry.split('=')[0]?.trim();
		if (name) {
			document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
		}
	}
};

const mount = async function mount(
	ui: ConsentUIOptions = {},
	options: Parameters<typeof createConsentClient>[0] = {}
): Promise<{
	client: ConsentClient;
	handle: ConsentUIHandle;
	root: ParentNode;
}> {
	const client = createConsentClient(
		{
			consentCategories: ['measurement', 'marketing'],
			legalLinks: { privacyPolicy: { href: '/privacy' } },
			policyRules: [
				{
					...policyRulePresets.europeOptIn(),
					categories: ['measurement', 'marketing'],
					match: { isDefault: true },
					scopeMode: 'strict',
				},
			],
			// jsdom cannot parse the modern CSS in the sheet; one test opts in.
			ui: { disableAnimation: true, styles: false, ...ui },
			...options,
		},
		{ mountUI: mountConsentUI, pkg: '@c15t/browser/test' }
	);
	clients.push(client);
	client.start();
	await client.ready();
	const handle = client.ui as ConsentUIHandle;
	return { client, handle, root: handle.root };
};

const query = function query<ElementType extends HTMLElement = HTMLElement>(
	root: ParentNode,
	testId: string
): ElementType {
	const element = root.querySelector<ElementType>(`[data-testid="${testId}"]`);
	if (!element) {
		throw new Error(`missing ${testId}`);
	}
	return element;
};

afterEach(() => {
	for (const client of clients.splice(0)) {
		client.dispose();
	}
	localStorage.clear();
	clearCookies();
	document.body.replaceChildren();
	document.head.querySelector('#c15t-styles')?.remove();
});

describe('mountConsentUI', () => {
	it('rebuilds the banner when the assigned arm changes', async () => {
		const experiment = {
			arm: 'floating',
			arms: {
				bar: { prompt: { variant: 'bar' as const } },
				floating: { prompt: { variant: 'floating' as const } },
			},
			id: 'banner-shape',
		};
		const { client, root } = await mount({}, { experiment });
		// The banner waits for the lazily loaded experiment controller.
		await vi.waitFor(() =>
			expect(query(root, 'consent-banner-root').dataset.variant).toBe(
				'floating'
			)
		);
		client.kernel.set.experiment({
			acknowledgedDiagnostics: false,
			arm: 'bar',
			assignedBy: 'c15t',
			id: 'banner-shape',
		});
		expect(query(root, 'consent-banner-root').dataset.variant).toBe('bar');
	});

	it('creates the stylesheet when an arm theme arrives after mount', async () => {
		const experiment = {
			arms: {
				bold: { theme: { colors: { primary: '#123456' } } },
			},
			id: 'button-style',
		};
		// No stylesheet, theme or css: nothing to inject at mount.
		const { client, root } = await mount({}, { experiment });
		client.kernel.set.experiment({
			acknowledgedDiagnostics: false,
			arm: 'bold',
			assignedBy: 'c15t',
			id: 'button-style',
		});
		expect(root.querySelector('style')?.textContent).toContain('#123456');
	});

	it('records untouched displayed preferences when Save is clicked', async () => {
		const { client, root } = await mount();
		client.openDialog();
		query(root, 'consent-widget-footer-save-button').click();
		await vi.waitFor(() => expect(client.getSnapshot().activeUI).toBe('none'));
		expect(client.getSnapshot().explicitChoice?.categories).toMatchObject({
			marketing: { value: false },
			measurement: { value: false },
		});
	});

	it('acknowledges an opt-out notice without recording a choice', async () => {
		const { client, root } = await mount(
			{},
			{
				overrides: { country: 'US', region: 'CA' },
				policyRules: [
					{ ...policyRulePresets.usPrivacyStatesOptOut(), prompt: 'notice' },
				],
			}
		);
		const before = client.getSnapshot().effectivePermissions;
		expect(query(root, 'consent-banner-card').hasAttribute('aria-modal')).toBe(
			false
		);
		query(root, 'consent-banner-dismiss-button').click();
		await vi.waitFor(() => expect(client.getSnapshot().activeUI).toBe('none'));
		expect(client.getSnapshot().explicitChoice).toBeNull();
		expect(client.getSnapshot().noticeDismissal).not.toBeNull();
		expect(client.getSnapshot().effectivePermissions).toEqual(before);
	});

	it('uses prompt geometry and blocking from presentation', async () => {
		const { root } = await mount(
			{},
			{ presentation: { prompt: { variant: 'wall' } } }
		);
		expect(query(root, 'consent-banner-root').dataset.variant).toBe('wall');
		expect(query(root, 'consent-banner-root').dataset.position).toBe('center');
		expect(query(root, 'consent-banner-card').getAttribute('aria-modal')).toBe(
			'true'
		);
		expect(document.body.style.overflow).toBe('hidden');
	});

	it('replaces light DOM customization when remounted and removes it on disposal', async () => {
		const { client, handle } = await mount({
			css: 'button { color: red; }',
			shadow: false,
		});
		const next = client.mountUI({
			css: 'button { color: blue; }',
			shadow: false,
			styles: false,
		});
		expect(handle.host.isConnected).toBe(false);
		expect(next.host.querySelector('style')?.textContent).toBe(
			'button { color: blue; }'
		);
		client.dispose();
		expect(document.querySelector('[data-c15t-ui] style')).toBeNull();
	});
	it('renders the banner inside a shadow root with the shared DOM contract', async () => {
		const { root, handle } = await mount({ styles: true });

		expect(handle.host.shadowRoot).toBe(root);
		expect(root.querySelector('style')?.textContent).toContain(
			'.c15t-theme-root'
		);
		const banner = query(root, 'consent-banner-root');
		expect(banner.getAttribute('dir')).toBe('ltr');
		expect(query(root, 'consent-banner-title').textContent).toBe(
			'We value your privacy'
		);
		expect(query(root, 'consent-banner-accept-button').textContent).toBe(
			'Accept All'
		);
		expect(query(root, 'consent-banner-reject-button').textContent).toBe(
			'Reject All'
		);
		expect(
			query(root, 'consent-banner-customize-button').getAttribute(
				'data-variant'
			)
		).toBe('primary');
		expect(
			query(root, 'consent-banner-branding').getAttribute('href')
		).toContain('c15t.com');
		expect(
			root.querySelector('[data-testid="consent-dialog-root"]')
		).toBeNull();
	});

	describe('entry transition', () => {
		const spyOnLayout = function spyOnLayout() {
			return vi
				.spyOn(HTMLElement.prototype, 'offsetHeight', 'get')
				.mockReturnValue(0);
		};

		/** Only the presence of the interface is checked. */
		const declareStartingStyle = function declareStartingStyle() {
			Object.assign(globalThis, { CSSStartingStyleRule: {} });
		};

		afterEach(() => {
			vi.restoreAllMocks();
			Reflect.deleteProperty(globalThis, 'CSSStartingStyleRule');
		});

		it('inserts the banner and dialog visible without reading layout when @starting-style is supported', async () => {
			declareStartingStyle();
			const layout = spyOnLayout();
			const { root } = await mount({ disableAnimation: false });

			const banner = query(root, 'consent-banner-root');
			expect(banner.classList.contains(classes.banner.bannerVisible)).toBe(
				true
			);
			expect(banner.classList.contains(classes.banner.bannerEntering)).toBe(
				true
			);
			expect(banner.classList.contains(classes.banner.bannerHidden)).toBe(
				false
			);

			query(root, 'consent-banner-customize-button').click();
			const dialog = query(root, 'consent-dialog-root');
			expect(dialog.classList.contains(classes.dialog.contentVisible)).toBe(
				true
			);
			expect(dialog.classList.contains(classes.dialog.contentEntering)).toBe(
				true
			);
			expect(layout).not.toHaveBeenCalled();
		});

		it('falls back to the hidden-then-visible flip with a layout read', async () => {
			const layout = spyOnLayout();
			const { root } = await mount({ disableAnimation: false });

			const banner = query(root, 'consent-banner-root');
			expect(banner.classList.contains(classes.banner.bannerVisible)).toBe(
				true
			);
			expect(banner.classList.contains(classes.banner.bannerEntering)).toBe(
				false
			);
			expect(layout).toHaveBeenCalledTimes(1);

			query(root, 'consent-banner-customize-button').click();
			const dialog = query(root, 'consent-dialog-root');
			expect(dialog.classList.contains(classes.dialog.contentVisible)).toBe(
				true
			);
			expect(dialog.classList.contains(classes.dialog.contentEntering)).toBe(
				false
			);
			expect(layout).toHaveBeenCalledTimes(2);
		});

		it('skips the entering state when animation is disabled', async () => {
			declareStartingStyle();
			const layout = spyOnLayout();
			const { root } = await mount();

			const banner = query(root, 'consent-banner-root');
			expect(banner.classList.contains(classes.banner.bannerVisible)).toBe(
				true
			);
			expect(banner.classList.contains(classes.banner.bannerEntering)).toBe(
				false
			);
			expect(layout).not.toHaveBeenCalled();
		});
	});

	it('accepts from the banner and removes it', async () => {
		const { root, client } = await mount();

		query(root, 'consent-banner-accept-button').click();
		await vi.waitFor(() => expect(client.getSnapshot().activeUI).toBe('none'));

		expect(client.hasConsented()).toBe(true);
		expect(
			root.querySelector('[data-testid="consent-banner-root"]')
		).toBeNull();
	});

	it.each([
		['accept', 'consent-banner-accept-button'],
		['reject', 'consent-banner-reject-button'],
	])(
		'shows only Strictly necessary when nothing is declared, and %s dismisses the banner',
		async (_action, button) => {
			const { root, client } = await mount(
				{ trigger: { showWhen: 'after-consent' } },
				{
					consentCategories: undefined,
					policyRules: [
						{ ...policyRulePresets.europeOptIn(), match: { isDefault: true } },
					],
				}
			);
			expect(client.consentCategories).toEqual(['necessary']);
			client.openDialog();
			expect(
				root.querySelectorAll('[data-testid^="consent-widget-switch-"]')
			).toHaveLength(1);
			query(root, 'consent-widget-switch-necessary');
			client.showBanner();
			query(root, button).click();
			await vi.waitFor(() =>
				expect(client.getSnapshot().activeUI).toBe('none')
			);
			expect(client.getSnapshot().promptRequirement).toEqual({ kind: 'none' });
			expect(client.hasConsented()).toBe(true);
			expect(query(root, 'consent-dialog-trigger').hidden).toBe(false);
			expect(
				root.querySelector('[data-testid="consent-banner-root"]')
			).toBeNull();
		}
	);

	it('opens the preference centre, toggles a draft and saves it', async () => {
		const { root, client } = await mount();

		query(root, 'consent-banner-customize-button').click();

		const dialog = query(root, 'consent-dialog-root');
		expect(dialog.getAttribute('role')).toBe('dialog');
		expect(query(root, 'consent-dialog-title').textContent).toBe(
			'Privacy Settings'
		);
		const necessary = query(root, 'consent-widget-switch-necessary');
		expect(necessary.hasAttribute('disabled')).toBe(true);
		expect(necessary.getAttribute('aria-checked')).toBe('true');

		const measurement = query(root, 'consent-widget-switch-measurement');
		expect(measurement.getAttribute('data-state')).toBe('unchecked');
		measurement.click();
		expect(measurement.getAttribute('data-state')).toBe('checked');
		// A draft is not a decision yet.
		expect(client.has('measurement')).toBe(false);

		query(root, 'consent-widget-footer-save-button').click();
		await vi.waitFor(() => {
			expect(client.has('measurement')).toBe(true);
			expect(client.getSnapshot().activeUI).toBe('none');
		});

		expect(client.has('marketing')).toBe(false);
		expect(
			root.querySelector('[data-testid="consent-dialog-root"]')
		).toBeNull();
	});

	it('expands a category description from its trigger', async () => {
		const { root } = await mount();
		query(root, 'consent-banner-customize-button').click();

		const trigger = query(root, 'consent-widget-accordion-trigger-marketing');
		const content = query(root, 'consent-widget-accordion-content-marketing');
		expect(content.getAttribute('data-state')).toBe('closed');
		expect(content.hasAttribute('inert')).toBe(true);

		trigger.click();

		expect(trigger.getAttribute('aria-expanded')).toBe('true');
		expect(content.getAttribute('data-state')).toBe('open');
		expect(content.hasAttribute('inert')).toBe(false);
	});

	it('closes the preference centre on Escape', async () => {
		const { root, client } = await mount();
		client.openDialog();

		query(root, 'consent-dialog-root').dispatchEvent(
			new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' })
		);

		expect(client.getSnapshot().activeUI).toBe('none');
		expect(
			root.querySelector('[data-testid="consent-dialog-root"]')
		).toBeNull();
	});

	it('closes the preference centre on Escape pressed outside it', async () => {
		const { root, client } = await mount(
			{},
			{ presentation: { preferences: { blocking: false } } }
		);
		client.openDialog();
		const outside = document.createElement('button');
		document.body.append(outside);

		outside.dispatchEvent(
			new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' })
		);

		expect(client.getSnapshot().activeUI).toBe('none');
		expect(
			root.querySelector('[data-testid="consent-dialog-root"]')
		).toBeNull();
	});

	it('stamps the configured nonce on the injected style element', async () => {
		const { root } = await mount(
			{ css: '.probe { color: red; }' },
			{ nonce: 'page-nonce' }
		);

		const style = root.querySelector('style');
		expect(style?.nonce).toBe('page-nonce');
	});

	it('renders configured legal links with translated labels', async () => {
		const { root } = await mount({ banner: { legalLinks: ['privacyPolicy'] } });

		const link = query<HTMLAnchorElement>(
			root,
			'consent-banner-legal-link-privacyPolicy'
		);
		expect(link.getAttribute('href')).toBe('/privacy');
		expect(link.textContent).toBe('Privacy Policy');
	});

	it('shows the trigger once nothing else is open', async () => {
		const { root, client } = await mount({ trigger: true });

		const trigger = query(root, 'consent-dialog-trigger');
		expect(trigger.hidden).toBe(true);

		await client.acceptAll();

		expect(trigger.hidden).toBe(false);
		trigger.click();
		expect(client.getSnapshot().activeUI).toBe('dialog');
	});

	it('renders into the light DOM with a stylesheet owned by the mount', async () => {
		const { root, handle } = await mount({ shadow: false, styles: true });

		expect(handle.host.shadowRoot).toBeNull();
		expect(root).toBe(handle.host);
		expect(handle.host.querySelector('style')).not.toBeNull();
		expect(
			document.querySelector('[data-testid="consent-banner-root"]')
		).not.toBeNull();
	});

	it('leaves class names off with noStyle', async () => {
		const { root } = await mount({ noStyle: true });

		const banner = query(root, 'consent-banner-root');
		expect(banner.hasAttribute('class')).toBe(false);
		expect(
			query(root, 'consent-banner-accept-button').hasAttribute('class')
		).toBe(false);
	});

	it('applies an explicit dark scheme to the wrapper', async () => {
		const { root, handle } = await mount({ colorScheme: 'dark' });

		expect(
			root.querySelector('.c15t-host')?.classList.contains('c15t-dark')
		).toBe(true);
		expect(handle.host.style.colorScheme).toBe('dark');
	});

	it('tears everything down on destroy', async () => {
		const { handle } = await mount();

		handle.destroy();

		expect(document.querySelector('[data-c15t-ui]')).toBeNull();
	});

	describe('theme.slots', () => {
		it('adds slot classes and inline styles to the parts they name', async () => {
			const { root, client } = await mount({
				banner: { legalLinks: [] },
				theme: {
					slots: {
						buttonPrimary: 'brand-primary',
						buttonSecondary: { className: 'brand-secondary' },
						consentBanner: 'brand-banner',
						consentBannerCard: {
							className: 'brand-card  shadow-lg',
							style: { '--brand-accent': '#0a66ff', borderTopWidth: '4px' },
						},
						consentBannerDescription: 'brand-description',
						consentBannerFooter: 'brand-footer',
						consentBannerFooterSubGroup: 'brand-group',
						consentBannerHeader: 'brand-header',
						consentBannerTag: 'brand-tag',
						consentBannerTitle: 'brand-title',
						consentDialog: 'brand-dialog',
						consentDialogCard: 'brand-dialog-card',
						consentDialogContent: 'brand-dialog-content',
						consentDialogDescription: 'brand-dialog-description',
						consentDialogHeader: 'brand-dialog-header',
						consentDialogTag: 'brand-dialog-tag',
						consentDialogTitle: 'brand-dialog-title',
						consentWidget: 'brand-widget',
						consentWidgetAccordion: 'brand-accordion',
						consentWidgetFooter: 'brand-widget-footer',
						consentWidgetFooterSubGroup: 'brand-widget-group',
						toggle: 'brand-toggle',
					},
				},
			});

			const card = query(root, 'consent-banner-card');
			expect(card.classList.contains(classes.banner.card)).toBe(true);
			expect(card.classList.contains('brand-card')).toBe(true);
			expect(card.classList.contains('shadow-lg')).toBe(true);
			expect(card.style.getPropertyValue('--brand-accent')).toBe('#0a66ff');
			expect(card.style.borderTopWidth).toBe('4px');
			const bannerParts: [string, string][] = [
				['consent-banner-root', 'brand-banner'],
				['consent-banner-header', 'brand-header'],
				['consent-banner-title', 'brand-title'],
				['consent-banner-description', 'brand-description'],
				['consent-banner-footer', 'brand-footer'],
				['consent-banner-footer-sub-group', 'brand-group'],
				['consent-banner-branding', 'brand-tag'],
			];
			for (const [testId, className] of bannerParts) {
				expect(query(root, testId).classList, testId).toContain(className);
			}
			// Buttons take the slot for the variant the policy gives them.
			const buttons = [
				...query(root, 'consent-banner-footer').querySelectorAll('button'),
			];
			expect(
				buttons.map((button) => [
					button.dataset.variant,
					button.classList.contains('brand-primary'),
					button.classList.contains('brand-secondary'),
				])
			).toEqual(
				buttons.map((button) => [
					button.dataset.variant,
					button.dataset.variant === 'primary',
					button.dataset.variant !== 'primary',
				])
			);
			expect(
				buttons.some((button) => button.dataset.variant === 'primary')
			).toBe(true);

			client.openDialog();
			const dialogParts: [string, string][] = [
				['consent-dialog-root', 'brand-dialog'],
				['consent-dialog-card', 'brand-dialog-card'],
				['consent-dialog-header', 'brand-dialog-header'],
				['consent-dialog-title', 'brand-dialog-title'],
				['consent-dialog-description', 'brand-dialog-description'],
				['consent-dialog-content', 'brand-dialog-content'],
				['consent-dialog-branding', 'brand-dialog-tag'],
				['consent-widget-root', 'brand-widget'],
				['consent-widget-accordion', 'brand-accordion'],
				['consent-widget-footer', 'brand-widget-footer'],
				['consent-widget-footer-sub-group', 'brand-widget-group'],
				['consent-widget-switch-measurement', 'brand-toggle'],
			];
			for (const [testId, className] of dialogParts) {
				expect(query(root, testId).classList, testId).toContain(className);
			}
		});

		it('names every slotted element as a CSS part with its slot key', async () => {
			const { root, client } = await mount();

			expect(query(root, 'consent-banner-card').getAttribute('part')).toBe(
				'consentBannerCard'
			);
			expect(query(root, 'consent-banner-root').getAttribute('part')).toBe(
				'consentBanner'
			);
			for (const button of query(
				root,
				'consent-banner-footer'
			).querySelectorAll('button')) {
				expect(button.getAttribute('part')).toBe(
					button.dataset.variant === 'primary'
						? 'buttonPrimary'
						: 'buttonSecondary'
				);
			}
			client.openDialog();
			expect(query(root, 'consent-dialog-card').getAttribute('part')).toBe(
				'consentDialogCard'
			);
			expect(
				query(root, 'consent-widget-switch-measurement').getAttribute('part')
			).toBe('toggle');
		});

		it('keeps the trigger slot classes through position and visibility changes', async () => {
			const { root, client } = await mount({
				theme: {
					slots: {
						consentDialogTrigger: {
							className: 'brand-trigger',
							style: { '--brand-ring': '#0a66ff' },
						},
						consentDialogTriggerIcon: 'brand-trigger-icon',
					},
				},
				trigger: true,
			});

			const trigger = query(root, 'consent-dialog-trigger');
			expect(trigger.getAttribute('part')).toBe('consentDialogTrigger');
			expect(trigger.classList).toContain('brand-trigger');
			expect(trigger.classList).toContain(classes.trigger.trigger);
			expect(trigger.style.getPropertyValue('--brand-ring')).toBe('#0a66ff');
			const icon = trigger.querySelector('span');
			expect(icon?.classList).toContain('brand-trigger-icon');
			expect(icon?.getAttribute('part')).toBe('consentDialogTriggerIcon');

			// Showing the trigger rewrites its state classes.
			await client.acceptAll();
			expect(trigger.hidden).toBe(false);
			expect(trigger.classList).toContain('brand-trigger');
			expect(trigger.getAttribute('part')).toBe('consentDialogTrigger');
		});

		it('keeps slot classes when noStyle drops the stock ones', async () => {
			const { root } = await mount({
				noStyle: true,
				theme: { slots: { consentBannerCard: 'brand-card' } },
			});

			expect(query(root, 'consent-banner-card').getAttribute('class')).toBe(
				'brand-card'
			);
		});

		it('drops the stock classes of one part when its slot sets noStyle', async () => {
			const { root } = await mount({
				theme: {
					slots: {
						consentBannerCard: { className: 'brand-card', noStyle: true },
					},
				},
			});

			expect(query(root, 'consent-banner-card').getAttribute('class')).toBe(
				'brand-card'
			);
			expect(
				query(root, 'consent-banner-header').classList.contains(
					classes.banner.header
				)
			).toBe(true);
		});

		it('links stylesheetURLs inside the UI root with the configured nonce', async () => {
			const { root } = await mount(
				{ stylesheetURLs: ['/brand.css', 'https://cdn.example/brand.css'] },
				{ nonce: 'page-nonce' }
			);

			const links = [
				...root.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
			];
			expect(links.map((link) => link.getAttribute('href'))).toEqual([
				'/brand.css',
				'https://cdn.example/brand.css',
			]);
			expect(links.map((link) => link.nonce)).toEqual([
				'page-nonce',
				'page-nonce',
			]);
		});
	});
});
