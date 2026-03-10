import type { ConsentStoreState } from 'c15t';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderIabPanel } from '../../panels/iab';

function createIabState(): ConsentStoreState {
	return {
		model: 'iab',
		iab: {
			tcString: 'TCF_STRING',
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
			vendorConsents: { '755': true },
		},
	} as unknown as ConsentStoreState;
}

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
			onSetPurposeConsent,
			onSetVendorConsent,
			onSetSpecialFeatureOptIn,
			onAcceptAll: vi.fn(),
			onRejectAll: vi.fn(),
			onSave: vi.fn(),
			onReset: vi.fn(),
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
			onSetPurposeConsent: vi.fn(),
			onSetVendorConsent: vi.fn(),
			onSetSpecialFeatureOptIn: vi.fn(),
			onAcceptAll,
			onRejectAll,
			onSave,
			onReset,
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
