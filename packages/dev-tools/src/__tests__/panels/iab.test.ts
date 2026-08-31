import type { ConsentStoreState } from '@c15t/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderIabPanel } from '../../panels/iab';

const createIabState = function createIabState(): ConsentStoreState {
	return {
		iab: {
			gvl: {
				purposes: {
					1: { name: 'Purpose 1' },
				},
				specialFeatures: {
					1: { name: 'Feature 1' },
				},
				vendors: {
					755: { name: 'Vendor 755' },
				},
			},
			purposeConsents: { 1: true },
			specialFeatureOptIns: { 1: false },
			tcString: 'TCF_STRING',
			vendorConsents: { '755': true },
		},
		model: 'iab',
	} as unknown as ConsentStoreState;
};

describe('iab panel', () => {
	let container: HTMLDivElement;

	beforeEach(() => {
		container = document.createElement('div');
	});

	it('invokes interactive handlers for purpose, feature, and vendor toggles', () => {
		const onSetPurposeConsent = vi.fn();
		const onSetSpecialFeatureOptIn = vi.fn();
		const onSetVendorConsent = vi.fn();

		renderIabPanel(container, {
			getState: () => createIabState(),
			onAcceptAll: vi.fn(),
			onRejectAll: vi.fn(),
			onReset: vi.fn(),
			onSave: vi.fn(),
			onSetPurposeConsent,
			onSetSpecialFeatureOptIn,
			onSetVendorConsent,
		});

		(
			container.querySelector(
				'[aria-label="Toggle purpose 1"]'
			) as HTMLButtonElement
		)?.click();
		(
			container.querySelector(
				'[aria-label="Toggle feature 1"]'
			) as HTMLButtonElement
		)?.click();
		(
			container.querySelector(
				'[aria-label="Toggle vendor 755"]'
			) as HTMLButtonElement
		)?.click();

		expect(onSetPurposeConsent).toHaveBeenCalledWith(1, false);
		expect(onSetSpecialFeatureOptIn).toHaveBeenCalledWith(1, true);
		expect(onSetVendorConsent).toHaveBeenCalledWith(755, false);
	});

	it('invokes action buttons', () => {
		const onAcceptAll = vi.fn();
		const onRejectAll = vi.fn();
		const onSave = vi.fn();
		const onReset = vi.fn();

		renderIabPanel(container, {
			getState: () => createIabState(),
			onAcceptAll,
			onRejectAll,
			onReset,
			onSave,
			onSetPurposeConsent: vi.fn(),
			onSetSpecialFeatureOptIn: vi.fn(),
			onSetVendorConsent: vi.fn(),
		});

		const buttons = [...container.querySelectorAll('button')];
		buttons
			.find((button) => button.textContent?.includes('Accept All'))
			?.click();
		buttons
			.find((button) => button.textContent?.includes('Reject All'))
			?.click();
		buttons.find((button) => button.textContent?.includes('Save'))?.click();
		buttons.find((button) => button.textContent?.includes('Reset'))?.click();

		expect(onAcceptAll).toHaveBeenCalledTimes(1);
		expect(onRejectAll).toHaveBeenCalledTimes(1);
		expect(onSave).toHaveBeenCalledTimes(1);
		expect(onReset).toHaveBeenCalledTimes(1);
	});
});
