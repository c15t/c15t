import { afterEach, describe, expect, it, vi } from 'vitest';

import { createConsentClient } from '../client';
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
			reloadOnConsentRevoked: false,
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

	it('accepts from the banner and removes it', async () => {
		const { root, client } = await mount();

		query(root, 'consent-banner-accept-button').click();
		await client.ready();

		expect(client.hasConsented()).toBe(true);
		expect(
			root.querySelector('[data-testid="consent-banner-root"]')
		).toBeNull();
	});

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

	it('renders into the light DOM with the stylesheet in <head>', async () => {
		const { root, handle } = await mount({ shadow: false, styles: true });

		expect(handle.host.shadowRoot).toBeNull();
		expect(root).toBe(handle.host);
		expect(document.getElementById('c15t-styles')).not.toBeNull();
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
});
