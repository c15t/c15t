/* oxlint-disable no-script-url -- Unsafe vendor URLs exercise the disclosure link filter. */
import type { GlobalVendorList, NonIABVendor } from '@c15t/core';
import { clearGVLCache } from '@c15t/iab';
import { afterEach, describe, expect, it } from 'vitest';

import { completeGVL } from '../../../iab/src/__tests__/fixtures/gvl-sample';
import { init } from '../iab';
import { createVendorDisclosures } from '../iab/vendor-disclosures';
import type { ConsentClient } from '../types';
import { resolveCopy } from '../ui/copy';

const vendor: GlobalVendorList['vendors'][number] = {
	cookieMaxAgeSeconds: 172800,
	cookieRefresh: true,
	dataCategories: [1],
	dataRetention: {
		purposes: { 1: 0, 2: 7 },
		specialPurposes: { 1: 14 },
		stdRetention: 30,
	},
	deviceStorageDisclosureUrl: 'https://example.test/storage',
	features: [1],
	flexiblePurposes: [],
	id: 1,
	legIntPurposes: [7],
	name: 'Example Partner',
	purposes: [1, 2],
	specialFeatures: [1],
	specialPurposes: [1, 2],
	urls: [
		{
			langId: 'en',
			legIntClaim: 'https://example.test/en/interest',
			privacy: 'https://example.test/en/privacy',
		},
		{
			langId: 'fr',
			legIntClaim: 'https://example.test/fr/interest',
			privacy: 'https://example.test/fr/privacy',
		},
	],
	usesCookies: true,
	usesNonCookieAccess: true,
};
const clients: ConsentClient[] = [];
const render = async (
	value: typeof vendor | NonIABVendor = vendor,
	language = 'en'
): Promise<HTMLElement> => {
	const client = init({
		iab: {
			cmpId: 28,
			gvl: {
				...completeGVL,
				dataCategories: {
					1: {
						description: 'Identifiers stored on your device.',
						id: 1,
						name: 'Device identifiers',
					},
				},
			},
		},
		mode: 'offline',
		overrides: { country: 'DE' },
		ui: false,
	});
	clients.push(client);
	await client.ready();
	await client.runtime.iab?.whenReady?.();
	const snapshot = client.getSnapshot();
	const copy = structuredClone(resolveCopy(snapshot));
	copy.language = language;
	copy.t.iab.preferenceCenter.vendorList.maxAgeRefreshes = 'renews';
	copy.t.iab.preferenceCenter.vendorList.retainedDays =
		'Stored for {days} days';
	const element = document.createElement('div');
	element.append(createVendorDisclosures(snapshot, value, copy));
	return element;
};
const group = (
	element: HTMLElement,
	heading: string
): Element | null | undefined =>
	[...element.querySelectorAll('h3')].find(
		(entry) => entry.textContent === heading
	)?.nextElementSibling;

afterEach(() => {
	for (const client of clients.splice(0)) {
		client.dispose();
	}
	clearGVLCache();
	localStorage.clear();
});

describe('IAB vendor disclosures', () => {
	it('renders declared data categories, storage, and localized retention with specific overrides', async () => {
		const element = await render();
		expect(group(element, 'Data Categories')?.textContent).toContain(
			'Device identifiers'
		);
		expect(group(element, 'Data Categories')?.textContent).toContain(
			'Identifiers stored on your device.'
		);
		expect(group(element, 'Purposes')?.textContent).toContain(
			'Stored for 0 days'
		);
		expect(group(element, 'Purposes')?.textContent).toContain(
			'Stored for 7 days'
		);
		expect(group(element, 'Leg. Interest')?.textContent).toContain(
			'Stored for 30 days'
		);
		expect(group(element, 'Special Purposes')?.textContent).toContain(
			'Stored for 14 days'
		);
		expect(group(element, 'Special Purposes')?.textContent).toContain(
			'Stored for 30 days'
		);
		expect(group(element, 'Features')?.textContent).not.toContain('Stored for');
		expect(element.textContent).toContain('Max Age: 2d renews');
		expect(element.textContent).toContain('Non-Cookie Access');
		expect(
			element.querySelector('a[href="https://example.test/storage"]')
		).not.toBeNull();
	});

	it('selects privacy and legitimate-interest links using the resolved language', async () => {
		const element = await render(vendor, 'fr-CA');
		const links = [...element.querySelectorAll('a')];
		expect(links.map((link) => link.href)).toEqual([
			'https://example.test/fr/privacy',
			'https://example.test/fr/interest',
			'https://example.test/storage',
		]);
		for (const link of links) {
			expect(link.target).toBe('_blank');
			expect(link.rel).toBe('noopener noreferrer');
		}
	});

	it('falls back to safe URLs and excludes executable, relative, and malformed URLs', async () => {
		const element = await render(
			{
				...vendor,
				deviceStorageDisclosureUrl: 'javascript:alert(1)',
				urls: [
					{
						langId: 'fr',
						legIntClaim: 'data:text/html,bad',
						privacy: 'javascript:alert(1)',
					},
					{
						langId: 'en',
						legIntClaim: '/interest',
						privacy: 'https://example.test/safe',
					},
					{ langId: 'de', legIntClaim: 'https://', privacy: 'https://' },
				],
			},
			'fr'
		);
		expect([...element.querySelectorAll('a')].map((link) => link.href)).toEqual(
			['https://example.test/safe']
		);
	});

	it('renders custom vendor categories, privacy, and declared retention', async () => {
		const custom: NonIABVendor = {
			dataCategories: [1, 11],
			dataRetentionDays: 45,
			id: 'custom',
			name: 'Custom Partner',
			privacyPolicyUrl: 'https://example.test/custom',
			purposes: [1],
		};
		const element = await render(custom);
		expect(group(element, 'Data Categories')?.textContent).toContain(
			'Device identifiers'
		);
		expect(group(element, 'Data Categories')?.textContent).toContain('11');
		expect(group(element, 'Purposes')?.textContent).toContain(
			'Stored for 45 days'
		);
		expect(element.querySelector('a')?.href).toBe(custom.privacyPolicyUrl);
		expect(element.textContent).not.toContain('Max Age');
	});

	it('does not invent zero-day retention when optional declarations are absent', async () => {
		const element = await render({
			...vendor,
			cookieMaxAgeSeconds: null,
			cookieRefresh: false,
			dataCategories: undefined,
			dataRetention: undefined,
		});
		expect(element.textContent).not.toContain('Stored for');
		expect(element.textContent).not.toContain('Retention');
		expect(element.textContent).not.toContain('Max Age');
		expect(element.textContent).not.toContain('renews');
		expect(group(element, 'Data Categories')).toBeUndefined();
	});

	it('ignores invalid durations and treats explicit zero retention as a declaration', async () => {
		const element = await render({
			...vendor,
			cookieMaxAgeSeconds: Number.NaN,
			dataRetention: {
				purposes: { 1: -1, 2: Number.POSITIVE_INFINITY },
				stdRetention: 0,
			},
		});
		expect(group(element, 'Purposes')?.textContent).toContain(
			'Stored for 0 days'
		);
		expect(element.textContent).not.toContain('Infinity');
		expect(element.textContent).not.toContain('NaN');
		expect(element.textContent).not.toContain('-1');
		expect(element.textContent).not.toContain('Max Age');
	});
});
