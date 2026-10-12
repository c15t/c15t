/**
 * IAB Consent Dialog Features section.
 *
 * TCF Policies v5.0.b: the Features standard text sits with the Features,
 * each Feature shows its illustrations, and Features are never displayed
 * next to a control that cannot be disabled. Special purposes keep their
 * locked section.
 */

import type { GlobalVendorList } from '@c15t/core';
import styles from '@c15t/ui/styles/components/iab-consent-dialog';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import { ComponentFixtureProvider as ConsentProvider } from '~/__tests__/component-fixture-provider';
import type { ComponentFixtureOptions as ConsentProviderOptions } from '~/__tests__/component-fixture-provider';
import { policyFixture } from '~/__tests__/policy-fixture';
import { mockGVL } from '~/components/iab/__tests__/fixtures/mock-consent-state';
import { offline } from '~/transports/offline';

import { IABConsentDialog } from '../iab-panel';

const FALLBACK_TEXT =
	'These means of processing can be used solely in pursuit of one or several purposes for which you are given a choice in this notice.';
const CONTROLS =
	'[role="switch"], [role="checkbox"], input, [data-disabled], [disabled]';

const optionsFor = (gvl: GlobalVendorList): ConsentProviderOptions => ({
	iab: { cmpId: 160, cmpVersion: 1, gvl },
	mode: offline(),
	prefetch: policyFixture(undefined, {
		categories: undefined,
		id: 'iab_features_test',
		model: 'iab',
		prompt: 'choice',
		scopeMode: 'strict',
	}),
});

const renderDialog = async (options = optionsFor(mockGVL)) => {
	await render(
		<ConsentProvider options={options}>
			<IABConsentDialog open />
		</ConsentProvider>
	);
	return vi.waitFor(
		() => {
			const section = document.querySelector<HTMLElement>(
				'[data-testid="iab-consent-dialog-features"]'
			);
			expect(section).not.toBeNull();
			return section as HTMLElement;
		},
		{ timeout: 5000 }
	);
};

const triggerIn = (root: Element, label: string): HTMLButtonElement => {
	const trigger = Array.from(
		root.querySelectorAll<HTMLButtonElement>(
			'[data-slot="preference-item-trigger"]'
		)
	).find((button) => button.textContent?.includes(label));
	if (!trigger) {
		throw new Error(`Missing trigger "${label}"`);
	}
	return trigger;
};

describe('IAB consent dialog features section', () => {
	beforeEach(() => {
		localStorage.clear();
		delete (window as { __tcfapi?: unknown }).__tcfapi;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	test('is a labelled region under the GVL standard text', async () => {
		const section = await renderDialog();

		expect(section.tagName).toBe('SECTION');
		expect(section.getAttribute('aria-label')).toBe('Features');
		expect(section.querySelector('h3')?.textContent).toBe('Features');
		expect(section.textContent).toContain(mockGVL.standardTexts?.features);
		expect(
			Array.from(section.querySelectorAll('[data-testid^="feature-item-"]'))
				.map((row) => row.getAttribute('data-testid'))
				.sort()
		).toEqual(['feature-item-1', 'feature-item-2', 'feature-item-3']);
	});

	test('falls back to the translated text when the GVL has none', async () => {
		const section = await renderDialog(
			optionsFor({ ...mockGVL, standardTexts: undefined })
		);

		expect(section.textContent).toContain(FALLBACK_TEXT);
	});

	test('shows illustrations and vendor names with no control or lock', async () => {
		const section = await renderDialog();
		const feature = section.querySelector('[data-testid="feature-item-1"]');
		if (!feature) {
			throw new Error('Missing feature-item-1');
		}

		await userEvent.click(
			triggerIn(feature, 'Match and combine data from other data sources')
		);
		await userEvent.click(
			await vi.waitFor(() => triggerIn(feature, 'Examples'))
		);
		await userEvent.click(
			await vi.waitFor(() => triggerIn(feature, 'IAB Registered Vendors'))
		);

		await vi.waitFor(() => {
			expect(feature.textContent).toContain(
				mockGVL.features[1]?.illustrations[0]
			);
			expect(feature.textContent).toContain(mockGVL.vendors[1]?.name);
		});
		expect(section.querySelectorAll(CONTROLS)).toHaveLength(0);
		expect(section.querySelector(`.${styles.lockIcon}`)).toBeNull();
		expect(section.textContent).not.toMatch(/required/iu);
	});

	test('keeps special purposes locked and features out of that section', async () => {
		await renderDialog();
		const specialPurposes = document.querySelector<HTMLElement>(
			`.${styles.specialPurposesSection}`
		);
		if (!specialPurposes) {
			throw new Error('Missing special purposes section');
		}
		expect(specialPurposes.querySelector(`.${styles.lockIcon}`)).not.toBeNull();

		const toggle = specialPurposes.querySelector<HTMLButtonElement>(
			'button[aria-expanded]'
		);
		if (!toggle) {
			throw new Error('Missing special purposes toggle');
		}
		await userEvent.click(toggle);

		const row = await vi.waitFor(() => {
			const found = specialPurposes.querySelector(
				'[data-testid="special-purpose-item-1"]'
			);
			expect(found).not.toBeNull();
			return found as HTMLElement;
		});
		expect(row.querySelector(`.${styles.lockIcon}`)).not.toBeNull();
		expect(
			row.querySelector('[role="switch"]')?.getAttribute('data-disabled')
		).toBe('');
		expect(
			specialPurposes.querySelector('[data-testid^="feature-item-"]')
		).toBeNull();
	});
});
