import { clearGVLCache } from '@c15t/iab';
import { afterEach, describe, expect, it } from 'vitest';

import { completeGVL } from '../../../iab/src/__tests__/fixtures/gvl-sample';
import { init } from '../iab';
import type { ConsentClient, ConsentClientOptions } from '../types';

const clients: ConsentClient[] = [];
const start = async (
	iab: ConsentClientOptions['iab'] = {}
): Promise<ConsentClient> => {
	const client = init({
		iab: { cmpId: 28, gvl: completeGVL, ...iab },
		mode: 'offline',
		overrides: { country: 'DE' },
		ui: { styles: false },
	});
	clients.push(client);
	await client.ready();
	await client.runtime.iab?.whenReady?.();
	client.openDialog();
	return client;
};
const control = (client: ConsentClient, id: string): HTMLButtonElement => {
	const found = client.ui?.root.querySelector<HTMLButtonElement>(
		`button[data-testid="${id}"]`
	);
	if (!found) {
		throw new Error(`Missing ${id}`);
	}
	return found;
};

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

describe('IAB purpose and stack controls', () => {
	it('toggles consent-based partners with a purpose without changing LI partners', async () => {
		const client = await start();
		const handle = client.runtime.iab;
		handle?.setVendorConsent(10, true);
		handle?.setVendorLegitimateInterest(10, true);
		const toggle = control(client, 'purpose-item-2-consent');
		toggle.click();
		expect(client.getSnapshot().iab).toMatchObject({
			purposeConsents: { 2: true },
			vendorConsents: { 1: true, 10: true, 2: true, 755: true },
			vendorLegitimateInterests: { 10: true },
		});
		toggle.click();
		expect(client.getSnapshot().iab).toMatchObject({
			purposeConsents: { 2: false },
			vendorConsents: { 1: false, 10: true, 2: false, 755: false },
			vendorLegitimateInterests: { 10: true },
		});
	});

	it('cascades purpose objections to LI partners without changing consent', async () => {
		const client = await start();
		const handle = client.runtime.iab;
		handle?.setPurposeConsent(2, true);
		handle?.setVendorConsent(1, true);
		handle?.setPurposeLegitimateInterest(2, true);
		handle?.setVendorLegitimateInterest(10, true);
		const toggle = control(client, 'purpose-item-2-li');
		toggle.click();
		expect(client.getSnapshot().iab).toMatchObject({
			purposeConsents: { 2: true },
			purposeLegitimateInterests: { 2: false },
			vendorConsents: { 1: true },
			vendorLegitimateInterests: { 10: false },
		});
		toggle.click();
		expect(client.getSnapshot().iab).toMatchObject({
			purposeLegitimateInterests: { 2: true },
			vendorLegitimateInterests: { 10: true },
		});
	});

	it('includes custom consent and LI partners in the matching purpose action', async () => {
		const client = await start({
			customVendors: [
				{
					id: 'custom-consent',
					name: 'Custom consent partner',
					privacyPolicyUrl: 'https://example.com/privacy',
					purposes: [2],
				},
				{
					id: 'custom-li',
					legIntPurposes: [2],
					name: 'Custom LI partner',
					privacyPolicyUrl: 'https://example.com/privacy',
					purposes: [],
				},
			],
		});
		control(client, 'purpose-item-2-consent').click();
		expect(client.getSnapshot().iab?.vendorConsents['custom-consent']).toBe(
			true
		);
		expect(Boolean(client.getSnapshot().iab?.vendorConsents['custom-li'])).toBe(
			false
		);
		control(client, 'purpose-item-2-li').click();
		expect(
			client.getSnapshot().iab?.vendorLegitimateInterests['custom-li']
		).toBe(true);
	});

	it('exposes a mixed stack state and toggles its purposes and consent partners together', async () => {
		const client = await start();
		const handle = client.runtime.iab;
		handle?.setPurposeConsent(3, true);
		handle?.setSpecialFeatureOptIn(1, true);
		const stack = control(client, 'stack-item-1-consent');
		expect(stack.getAttribute('role')).toBe('checkbox');
		expect(stack.getAttribute('aria-checked')).toBe('false');
		control(client, 'purpose-item-2-consent').click();
		expect(stack.getAttribute('aria-checked')).toBe('mixed');
		stack.focus();
		stack.click();
		expect(stack.getAttribute('aria-checked')).toBe('true');
		expect(control(client, 'stack-item-1-consent')).toBe(stack);
		expect(document.activeElement?.shadowRoot?.activeElement).toBe(stack);
		expect(client.getSnapshot().iab).toMatchObject({
			purposeConsents: { 2: true, 3: true, 7: true },
			specialFeatureOptIns: { 1: true },
			vendorConsents: { 1: true, 2: true, 755: true },
		});
		expect(Boolean(client.getSnapshot().iab?.vendorConsents['10'])).toBe(false);
		expect((await client.saveIAB()).ok).toBe(true);
		expect(client.getSnapshot().iab?.authority).toMatchObject({
			purposeConsents: { 2: true, 3: true, 7: true },
			vendorConsents: { 1: true, 2: true, 755: true },
		});
		client.openDialog();
		control(client, 'stack-item-1-consent').click();
		expect(client.getSnapshot().iab).toMatchObject({
			purposeConsents: { 2: false, 3: true, 7: false },
			specialFeatureOptIns: { 1: true },
			vendorConsents: { 1: false, 2: false, 755: false },
		});
		expect(
			control(client, 'stack-item-1-consent').getAttribute('aria-checked')
		).toBe('false');
	});

	it('toggles special-feature partners while keeping the same-numbered purpose separate', async () => {
		const client = await start();
		const toggle = control(client, 'special-feature-item-1-consent');
		toggle.click();
		expect(client.getSnapshot().iab).toMatchObject({
			specialFeatureOptIns: { 1: true },
			vendorConsents: { 1: true, 755: true },
		});
		expect(Boolean(client.getSnapshot().iab?.purposeConsents[1])).toBe(false);
		expect(Boolean(client.getSnapshot().iab?.vendorConsents['2'])).toBe(false);
		toggle.click();
		expect(client.getSnapshot().iab).toMatchObject({
			specialFeatureOptIns: { 1: false },
			vendorConsents: { 1: false, 755: false },
		});
	});
});
