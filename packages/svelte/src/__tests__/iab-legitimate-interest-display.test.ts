/**
 * Untouched legitimate interest controls in the Svelte IAB dialog must show
 * the same state that a plain Save encodes in the TC string.
 */
import { custom } from '@c15t/core';
import type { ConsentKernel } from '@c15t/core';
import { resolvePolicyRules } from '@c15t/schema/types';
import { mount, tick, unmount } from 'svelte';
import { expect, onTestFinished, test, vi } from 'vitest';
import '@c15t/iab';

import { completeGVL } from '../../../iab/src/__tests__/fixtures/gvl-sample';
import { decodeTCString } from '../../../iab/src/tcf/tc-string';
import ConformanceFixture from './fixtures/conformance-fixture.svelte';

test('untouched legitimate interest controls match what a plain Save encodes', async () => {
	const target = document.createElement('div');
	onTestFinished(() => target.remove());
	document.body.append(target);
	let kernel: ConsentKernel | undefined;
	const mounted: { app?: ReturnType<typeof mount> } = {};
	onTestFinished(async () => {
		if (mounted.app) {
			await unmount(mounted.app);
		}
		localStorage.clear();
	});

	// Vendor 10 declares purposes 2 and 7 on LI; the restriction moves
	// vendor 755 onto LI for purpose 7. With an empty draft, Save encodes
	// purpose 7 and vendor 755 as allowed and purpose 2 and vendor 10 as
	// objected.
	mounted.app = mount(ConformanceFixture, {
		props: {
			component: 'iab-consent-dialog',
			onKernel: (value) => {
				kernel = value;
			},
			options: {
				disableAnimation: true,
				iab: {
					cmpId: 28,
					gvl: completeGVL,
					publisherRestrictions: [
						{ purposeId: 7, restrictionType: 2, vendorIds: [755] },
					],
				},
				mode: custom({}),
				persistence: false,
				prefetch: {
					initialIab: {
						cmpId: 28,
						enabled: true,
						gvl: completeGVL,
					},
					initialPolicyResolution: resolvePolicyRules({
						countryCode: 'DE',
						regionCode: null,
						rules: [
							{
								id: 'iab',
								match: { isDefault: true },
								model: 'iab',
								prompt: 'choice',
							},
						],
					}),
				},
			},
		},
		target,
	});

	await vi.waitFor(() => {
		expect(kernel).toBeDefined();
		expect(kernel?.getSnapshot().iab?.gvl).toBeDefined();
		expect(kernel?.getSnapshot().iab?.publisherRestrictions).toHaveLength(1);
	});
	kernel?.set.activeUI('dialog');
	await tick();

	const clickTrigger = async (selector: string) => {
		const el = await vi.waitFor(() => {
			const node = document.querySelector<HTMLElement>(selector);
			expect(node).not.toBeNull();
			return node as HTMLElement;
		});
		el.click();
		await tick();
	};

	await clickTrigger(
		'[data-testid="stack-item-1"] [data-slot="preference-item-trigger"]'
	);
	await clickTrigger(
		'[data-testid="purpose-item-2"] [data-slot="preference-item-trigger"]'
	);
	await clickTrigger(
		'[data-testid="purpose-item-7"] [data-slot="preference-item-trigger"]'
	);

	const purpose2Pressed = document
		.querySelector('[data-testid="purpose-item-2"] button[aria-pressed]')
		?.getAttribute('aria-pressed');
	const purpose7Pressed = document
		.querySelector('[data-testid="purpose-item-7"] button[aria-pressed]')
		?.getAttribute('aria-pressed');

	const vendorsTab = Array.from(
		document.querySelectorAll<HTMLButtonElement>('[role="tab"]')
	).find((button) => button.textContent?.toLowerCase().includes('vendor'));
	expect(vendorsTab).toBeDefined();
	vendorsTab?.click();
	await tick();

	await clickTrigger('#vendor-10 [data-slot="preference-item-trigger"]');
	await clickTrigger('#vendor-755 [data-slot="preference-item-trigger"]');

	const vendor10Pressed = document
		.querySelector('#vendor-10 button[aria-pressed]')
		?.getAttribute('aria-pressed');
	const vendor755Pressed = document
		.querySelector('#vendor-755 button[aria-pressed]')
		?.getAttribute('aria-pressed');

	const saveButton = document.querySelector<HTMLButtonElement>(
		'[data-testid="iab-consent-dialog-root"] [data-action="customize"]'
	);
	expect(saveButton).not.toBeNull();
	saveButton?.click();

	const tcString = await vi.waitFor(() => {
		const value = kernel?.getSnapshot().iab?.authority?.tcString;
		expect(value).toBeTruthy();
		return value as string;
	});
	const decoded = await decodeTCString(tcString);

	expect(purpose2Pressed).toBe(
		String(decoded.purposeLegitimateInterests[2] !== true)
	);
	expect(purpose7Pressed).toBe(
		String(decoded.purposeLegitimateInterests[7] !== true)
	);
	expect(vendor10Pressed).toBe(
		String(decoded.vendorLegitimateInterests[10] !== true)
	);
	expect(vendor755Pressed).toBe(
		String(decoded.vendorLegitimateInterests[755] !== true)
	);
	expect(purpose2Pressed).toBe('true');
	expect(purpose7Pressed).toBe('false');
	expect(vendor10Pressed).toBe('true');
	expect(vendor755Pressed).toBe('false');
});
