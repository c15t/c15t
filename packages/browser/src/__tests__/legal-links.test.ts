import { clearGVLCache } from '@c15t/iab';
import { afterEach, describe, expect, it } from 'vitest';

import { completeGVL } from '../../../iab/src/__tests__/fixtures/gvl-sample';
import { readPageOptions } from '../auto-init';
import { init as initIAB } from '../iab';
import { init } from '../index';
import type { ConsentClient, ConsentClientOptions } from '../types';

const clients: ConsentClient[] = [];

const scriptWith = (attributes: Record<string, string>): HTMLScriptElement => {
	const script = document.createElement('script');
	for (const [name, value] of Object.entries(attributes)) {
		script.setAttribute(name, value);
	}
	return script;
};

const legalAttributes = {
	'data-cookie-policy-url': '/cookies',
	'data-privacy-policy-url': '/privacy',
	'data-terms-url': '/terms',
};
const legalURLs = ['/privacy', '/cookies', '/terms'];

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

describe.each(['ordinary', 'IAB'])('%s script-tag legal links', (variant) => {
	const start = async (
		attributes: Record<string, string> = legalAttributes,
		configs: ConsentClientOptions[] = []
	): Promise<ConsentClient> => {
		const { options } = readPageOptions(scriptWith(attributes), configs);
		const clientOptions: ConsentClientOptions = {
			mode: 'offline',
			overrides: { country: 'DE' },
			...options,
			ui:
				options.ui === false
					? false
					: {
							disableAnimation: true,
							styles: false,
							...options.ui,
						},
		};
		const client =
			variant === 'IAB'
				? initIAB({ ...clientOptions, iab: { cmpId: 28, gvl: completeGVL } })
				: init(clientOptions);
		clients.push(client);
		await client.ready();
		await client.runtime.iab?.whenReady?.();
		return client;
	};

	const links = (client: ConsentClient): (string | null)[] =>
		Array.from(
			client.ui?.root.querySelectorAll('[data-testid*="-legal-link-"]') ?? []
		).map((link) => link.getAttribute('href'));

	it('renders all URL attributes in the banner and dialog', async () => {
		const client = await start();
		expect(links(client)).toEqual(legalURLs);

		client.openDialog();
		expect(links(client)).toEqual(legalURLs);
	});

	it('keeps links when branding is hidden through attributes and queued config', async () => {
		const client = await start(
			{ ...legalAttributes, 'data-hide-branding': '' },
			[
				{
					ui: {
						banner: { hideBranding: true },
						dialog: { hideBranding: true },
					},
				},
			]
		);
		expect(links(client)).toEqual(legalURLs);
		expect(
			client.ui?.root.querySelector('[data-testid$="-branding"]') !== null
		).toBe(variant === 'IAB');

		client.openDialog();
		expect(links(client)).toEqual(legalURLs);
		expect(
			client.ui?.root.querySelector('[data-testid$="-branding"]')
		).toBeNull();
	});

	it('uses the queued link selection independently for each surface', async () => {
		const client = await start(legalAttributes, [
			{
				ui: {
					banner: { legalLinks: ['cookiePolicy'] },
					dialog: { legalLinks: ['termsOfService', 'privacyPolicy'] },
				},
			},
		]);
		expect(links(client)).toEqual(['/cookies']);

		client.openDialog();
		expect(links(client)).toEqual(['/terms', '/privacy']);
	});

	it.each([null, []])(
		'hides links when queued config selects %j',
		async (legalLinks) => {
			const client = await start(legalAttributes, [
				{
					ui: { banner: { legalLinks }, dialog: { legalLinks } },
				},
			]);
			expect(links(client)).toEqual([]);

			client.openDialog();
			expect(links(client)).toEqual([]);
		}
	);

	it('does not mount UI when the tag has data-no-ui', async () => {
		const client = await start({ ...legalAttributes, 'data-no-ui': '' });
		expect(client.ui).toBeNull();
		expect(document.querySelector('[data-c15t-ui]')).toBeNull();
	});
});
