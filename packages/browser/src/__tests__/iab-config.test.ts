import { clearGVLCache } from '@c15t/iab';
import { afterEach, describe, expect, it } from 'vitest';

import { completeGVL } from '../../../iab/src/__tests__/fixtures/gvl-sample';
import { init } from '../iab';
import type { ConsentClient, ConsentClientOptions } from '../types';

const clients: ConsentClient[] = [];
const start = async (
	options: ConsentClientOptions = {}
): Promise<ConsentClient> => {
	const client = init({
		iab: { cmpId: 28, gvl: completeGVL },
		mode: 'offline',
		overrides: { country: 'DE' },
		...options,
		ui: { styles: false, ...(options.ui || {}) },
	});
	clients.push(client);
	await client.ready();
	await client.runtime.iab?.whenReady?.();
	return client;
};
const query = (client: ConsentClient, id: string): HTMLElement | null =>
	client.ui?.root.querySelector<HTMLElement>(`[data-testid="${id}"]`) ?? null;

afterEach(() => {
	for (const client of clients.splice(0)) {
		client.dispose();
	}
	clearGVLCache();
	localStorage.clear();
	for (const entry of document.cookie.split(';')) {
		document.cookie = `${entry.split('=')[0]?.trim()}=; Max-Age=0; path=/`;
	}
	document.body.replaceChildren();
});

describe('IAB browser configuration', () => {
	it('applies banner copy without removing purpose or legitimate-interest disclosures', async () => {
		const client = await start({
			ui: {
				banner: {
					acceptButtonText: 'Allow partners',
					customizeButtonText: 'Review partners',
					description: 'Choose from {partnerCount} partners.',
					rejectButtonText: 'Decline partners',
					title: 'Your privacy choices',
				},
			},
		});
		const banner = query(client, 'iab-consent-banner-card');
		expect(banner?.querySelector('h2')?.textContent).toBe(
			'Your privacy choices'
		);
		expect(banner?.textContent).toContain(
			`Choose from ${Object.keys(completeGVL.vendors).length} partners.`
		);
		expect(banner?.textContent).toContain('legitimate interest');
		expect(banner?.querySelectorAll('li').length).toBeGreaterThan(0);
		expect(query(client, 'iab-consent-banner-accept-button')?.textContent).toBe(
			'Allow partners'
		);
		expect(query(client, 'iab-consent-banner-reject-button')?.textContent).toBe(
			'Decline partners'
		);
		query(client, 'iab-consent-banner-customize-button')?.click();
		expect(query(client, 'iab-consent-dialog-card')).not.toBeNull();
		expect(
			query(client, 'iab-consent-dialog-accept-button')?.textContent
		).not.toBe('Allow partners');
	});
	it('selects legal links independently in banner and dialog', async () => {
		const client = await start({
			legalLinks: {
				cookiePolicy: { href: '/cookies', label: 'Our cookies' },
				privacyPolicy: { href: '/privacy' },
				termsOfService: { href: '/terms' },
			},
			ui: {
				banner: { legalLinks: ['cookiePolicy'] },
				dialog: { legalLinks: ['termsOfService', 'privacyPolicy'] },
			},
		});
		expect(
			query(client, 'iab-consent-banner-legal-link-cookiePolicy')?.textContent
		).toBe('Our cookies');
		expect(
			query(client, 'iab-consent-banner-legal-link-privacyPolicy')
		).toBeNull();
		client.openDialog();
		expect(
			query(
				client,
				'iab-consent-dialog-legal-link-privacyPolicy'
			)?.getAttribute('href')
		).toBe('/privacy');
		expect(
			query(
				client,
				'iab-consent-dialog-legal-link-termsOfService'
			)?.getAttribute('href')
		).toBe('/terms');
		expect(
			query(client, 'iab-consent-dialog-legal-link-cookiePolicy')
		).toBeNull();
	});
	it.each([null, []])(
		'allows omitting legal links with %j',
		async (legalLinks) => {
			const client = await start({
				legalLinks: { privacyPolicy: { href: '/privacy' } },
				ui: { banner: { legalLinks }, dialog: { legalLinks } },
			});
			expect(
				query(client, 'iab-consent-banner-legal-link-privacyPolicy')
			).toBeNull();
			client.openDialog();
			expect(
				query(client, 'iab-consent-dialog-legal-link-privacyPolicy')
			).toBeNull();
		}
	);
	it('allows hidden dialog branding and keeps the IAB banner branding', async () => {
		const client = await start({
			ui: { banner: { hideBranding: true }, dialog: { hideBranding: true } },
		});
		expect(query(client, 'iab-consent-banner-branding')).not.toBeNull();
		client.openDialog();
		expect(query(client, 'iab-consent-dialog-branding')).toBeNull();
	});
	it('maps legacy banner focus and scroll options through presentation rules', async () => {
		const client = await start({
			ui: { banner: { scrollLock: true, trapFocus: true } },
		});
		expect(
			query(client, 'iab-consent-banner-card')?.getAttribute('aria-modal')
		).toBe('true');
		expect(query(client, 'iab-consent-banner-overlay')).not.toBeNull();
		expect(document.body.style.overflow).toBe('hidden');
	});
	it('lets explicit presentation blocking override legacy banner options', async () => {
		const client = await start({
			presentation: {
				preferences: { blocking: false },
				prompt: { blocking: false },
			},
			ui: { banner: { scrollLock: true, trapFocus: true } },
		});
		expect(
			query(client, 'iab-consent-banner-card')?.hasAttribute('aria-modal')
		).toBe(false);
		expect(query(client, 'iab-consent-banner-overlay')).toBeNull();
		expect(document.body.style.overflow).not.toBe('hidden');
		client.openDialog();
		expect(query(client, 'iab-consent-dialog-card')?.getAttribute('role')).toBe(
			'dialog'
		);
		expect(
			query(client, 'iab-consent-dialog-card')?.hasAttribute('aria-modal')
		).toBe(false);
		expect(query(client, 'iab-consent-dialog-overlay')).toBeNull();
	});
	it('retains required actions, balanced prominence and wall blocking', async () => {
		const client = await start({
			presentation: {
				prompt: {
					blocking: false,
					layout: ['accept'],
					variant: 'wall',
				},
			},
			ui: { banner: { scrollLock: false, trapFocus: false } },
		});
		expect(
			query(client, 'iab-consent-banner-card')?.getAttribute('aria-modal')
		).toBe('true');
		expect(query(client, 'iab-consent-banner-reject-button')).not.toBeNull();
		expect(
			query(client, 'iab-consent-banner-accept-button')?.getAttribute(
				'data-variant'
			)
		).toBe(
			query(client, 'iab-consent-banner-reject-button')?.getAttribute(
				'data-variant'
			)
		);
	});
});
