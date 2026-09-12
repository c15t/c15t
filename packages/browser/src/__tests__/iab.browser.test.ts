import { runAxe } from '@c15t/conformance/a11y';
import { clearBrowserConsentStorage } from '@c15t/conformance/suite';
import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import { completeGVL } from '../../../iab/src/__tests__/fixtures/gvl-sample';
import { init } from '../iab';
import type { ConsentClient } from '../types';

let client: ConsentClient | undefined;
let opener: HTMLButtonElement | undefined;
const start = async (shadow: boolean) => {
	opener = document.createElement('button');
	opener.textContent = 'Open privacy settings';
	opener.setAttribute('data-c15t-action', 'customize');
	document.body.append(opener);
	client = init({
		iab: { cmpId: 28, gvl: completeGVL },
		mode: 'offline',
		overrides: { country: 'DE' },
		ui: { disableAnimation: true, shadow },
	});
	await client.ready();
	await client.runtime.iab?.whenReady?.();
	return client;
};
const activeElement = () => {
	let active = document.activeElement;
	while (active?.shadowRoot?.activeElement) {
		active = active.shadowRoot.activeElement;
	}
	return active;
};

afterEach(async () => {
	client?.dispose();
	opener?.remove();
	clearBrowserConsentStorage();
	await page.viewport(1280, 720);
});

describe.each([false, true])('IAB browser interaction, shadow=%s', (shadow) => {
	it('supports keyboard navigation, focus wrapping, and return to the page', async () => {
		const instance = await start(shadow);
		await page
			.getByRole('button', { exact: true, name: 'Open privacy settings' })
			.click();
		const close = page.getByRole('button', { exact: true, name: 'Close' });
		await close.click();
		await expect.poll(activeElement).toBe(opener);
		await userEvent.keyboard('{Enter}');
		const dialog = instance.ui?.root.querySelector<HTMLElement>(
			'[data-testid="iab-consent-dialog-card"]'
		);
		if (!dialog) {
			throw new Error('Missing IAB dialog');
		}
		await expect.poll(activeElement).toBe(dialog);
		await userEvent.tab();
		expect(activeElement()?.getAttribute('aria-label')).toBe('Close');
		await userEvent.tab({ shift: true });
		expect(activeElement()?.tagName).toBe('A');
		await userEvent.tab();
		expect(activeElement()?.getAttribute('aria-label')).toBe('Close');
		await userEvent.tab();
		await userEvent.keyboard('{ArrowRight}');
		expect(activeElement()?.id).toBe('c15t-iab-vendors-tab');
		await userEvent.tab();
		expect(activeElement()?.getAttribute('type')).toBe('search');
		await userEvent.keyboard('{Escape}');
		await expect.poll(activeElement).toBe(opener);
	});
	it('fits mobile screens and exposes accessible purpose and vendor controls', async () => {
		await page.viewport(390, 844);
		const instance = await start(shadow);
		await page
			.getByRole('button', { exact: true, name: 'Open privacy settings' })
			.click();
		const dialog = instance.ui?.root.querySelector<HTMLElement>(
			'[data-testid="iab-consent-dialog-card"]'
		);
		if (!dialog) {
			throw new Error('Missing IAB dialog');
		}
		const bounds = dialog.getBoundingClientRect();
		expect(bounds.left).toBeGreaterThanOrEqual(0);
		expect(bounds.right).toBeLessThanOrEqual(390);
		expect(bounds.top).toBeGreaterThanOrEqual(0);
		expect(bounds.bottom).toBeLessThanOrEqual(844);
		expect(await runAxe(instance.ui?.host)).toEqual([]);
		const disclosure = dialog.querySelector<HTMLElement>(
			'[data-testid="stack-item-1"] > summary'
		);
		if (!disclosure) {
			throw new Error('Missing stack disclosure');
		}
		await userEvent.click(disclosure);
		const stack = page.getByTestId('stack-item-1-consent');
		const target = stack.element().getBoundingClientRect();
		expect(target.width).toBeGreaterThanOrEqual(44);
		expect(target.height).toBeGreaterThanOrEqual(44);
		const track = stack.element().firstElementChild?.getBoundingClientRect();
		expect(track?.width).toBeGreaterThan(track?.height ?? 0);
		stack.element().focus();
		await userEvent.keyboard(' ');
		expect(stack.element().getAttribute('aria-checked')).toBe('true');
		expect(instance.getSnapshot().iab?.vendorConsents['755']).toBe(true);
		await page.getByRole('tab', { name: /Vendors/u }).click();
		const vendorDisclosure = dialog.querySelector<HTMLElement>(
			'[data-testid="iab-vendor-755"] > summary'
		);
		if (!vendorDisclosure) {
			throw new Error('Missing vendor disclosure');
		}
		await userEvent.click(vendorDisclosure);
		expect(await runAxe(instance.ui?.host)).toEqual([]);
	});
});
