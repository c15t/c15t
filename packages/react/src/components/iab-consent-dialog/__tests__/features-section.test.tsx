/**
 * IAB Consent Dialog Features section tests.
 *
 * TCF Policies v5.0.b: Features are informational. They show the IAB
 * standard text, their illustrations, and no controls. Special Purposes stay
 * in the locked section.
 */

import { iab } from '@c15t/iab';
import styles from '@c15t/ui/styles/components/iab-consent-dialog.module.js';
import type { GlobalVendorList } from 'c15t';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import {
	ConsentManagerProvider,
	clearConsentRuntimeCache,
} from '~/providers/consent-manager-provider';
import { mockGVL } from '../../iab/__tests__/fixtures/mock-consent-state';
import { IABConsentDialog } from '../iab-consent-dialog';

const GVL_STANDARD_TEXT = 'Standard features text from the vendor list.';
const FALLBACK_TEXT =
	'These means of processing can be used solely in pursuit of one or several purposes for which you are given a choice in this notice.';
const FEATURE_ILLUSTRATION =
	'A vendor combines data from your visit here with data from another site.';

type GVLFeature = GlobalVendorList['features'][string];
type GVLSpecialPurpose = GlobalVendorList['specialPurposes'][string];
type GVLVendor = GlobalVendorList['vendors'][string];

const feature1 = mockGVL.features[1] as GVLFeature;
const specialPurpose1 = mockGVL.specialPurposes[1] as GVLSpecialPurpose;
const vendor1 = mockGVL.vendors[1] as GVLVendor;

const gvlWithStandardText: GlobalVendorList = {
	...mockGVL,
	features: {
		...mockGVL.features,
		1: {
			...feature1,
			illustrations: [FEATURE_ILLUSTRATION],
		},
	},
	standardTexts: { features: GVL_STANDARD_TEXT },
};

const { standardTexts: _unused, ...gvlWithoutStandardText } =
	gvlWithStandardText;

function renderDialog(gvl: GlobalVendorList) {
	return render(
		<ConsentManagerProvider
			options={{
				mode: 'offline',
				iab: iab({ cmpId: 160, cmpVersion: 1, gvl }),
				offlinePolicy: { policy: { id: 'iab_test', model: 'iab' } },
			}}
		>
			<IABConsentDialog open />
		</ConsentManagerProvider>
	);
}

async function findFeaturesSection(): Promise<HTMLElement> {
	return vi.waitFor(
		() => {
			const section = document.querySelector<HTMLElement>(
				'[data-testid="iab-features-section"]'
			);
			expect(section).not.toBeNull();
			return section as HTMLElement;
		},
		{ timeout: 5000 }
	);
}

function getTrigger(root: ParentNode, text: string): HTMLButtonElement {
	const trigger = Array.from(
		root.querySelectorAll<HTMLButtonElement>(
			'[data-slot="preference-item-trigger"]'
		)
	).find((button) => button.textContent?.includes(text));
	expect(trigger).toBeDefined();
	return trigger as HTMLButtonElement;
}

describe('IAB Consent Dialog - Features section', () => {
	beforeEach(() => {
		window.localStorage.clear();
		vi.clearAllMocks();
		clearConsentRuntimeCache();
		delete (window as { __tcfapi?: unknown }).__tcfapi;
	});

	test('shows the standard text from the vendor list', async () => {
		renderDialog(gvlWithStandardText);

		const section = await findFeaturesSection();
		const headingId = section.getAttribute('aria-labelledby');
		const heading = headingId ? document.getElementById(headingId) : null;

		expect(section.tagName).toBe('SECTION');
		expect(heading?.textContent).toBe('Features');
		expect(section.textContent).toContain(GVL_STANDARD_TEXT);
		expect(section.textContent).not.toContain(FALLBACK_TEXT);
		expect(section.textContent).toContain(feature1.name);
	});

	test('falls back to the translated text when the vendor list has none', async () => {
		renderDialog(gvlWithoutStandardText);

		const section = await findFeaturesSection();

		expect(section.textContent).toContain(FALLBACK_TEXT);
		expect(section.textContent).not.toContain(GVL_STANDARD_TEXT);
	});

	test('lets users reach feature illustrations', async () => {
		renderDialog(gvlWithStandardText);

		const section = await findFeaturesSection();
		await userEvent.click(getTrigger(section, feature1.name));

		const examplesTrigger = getTrigger(section, 'Examples (1)');
		await userEvent.click(examplesTrigger);

		await vi.waitFor(() => {
			const illustration = Array.from(section.querySelectorAll('li')).find(
				(item) => item.textContent === FEATURE_ILLUSTRATION
			);
			expect(illustration).toBeDefined();
			expect(
				illustration
					?.closest('[data-slot="preference-item-content"]')
					?.getAttribute('aria-hidden')
			).toBe('false');
		});
	});

	test('renders no switch, checkbox, or lock inside the section', async () => {
		renderDialog(gvlWithStandardText);

		const section = await findFeaturesSection();

		// Expand every feature and its partner list to check nested content too.
		for (const feature of Object.values(mockGVL.features)) {
			await userEvent.click(getTrigger(section, feature.name));
		}
		for (const trigger of Array.from(
			section.querySelectorAll<HTMLButtonElement>(`.${styles.vendorsToggle}`)
		)) {
			await userEvent.click(trigger);
		}

		expect(section.textContent).toContain(vendor1.name);
		expect(
			section.querySelectorAll(
				'[role="switch"], [role="checkbox"], input[type="checkbox"], [aria-checked]'
			)
		).toHaveLength(0);
		expect(section.querySelectorAll(`.${styles.lockIcon}`)).toHaveLength(0);
		expect(section.textContent).not.toMatch(/required/i);
	});

	test('keeps Special Purposes in the locked section', async () => {
		renderDialog(gvlWithStandardText);

		const section = await findFeaturesSection();
		const specialPurposesSection = document.querySelector<HTMLElement>(
			`.${styles.specialPurposesSection}`
		);
		expect(specialPurposesSection).not.toBeNull();
		expect(specialPurposesSection?.contains(section)).toBe(false);
		expect(
			specialPurposesSection?.querySelector(`.${styles.lockIcon}`)
		).not.toBeNull();

		const expandButton = specialPurposesSection?.querySelector('button');
		await userEvent.click(expandButton as HTMLButtonElement);

		const specialPurposeItem = await vi.waitFor(() => {
			const item = specialPurposesSection?.querySelector<HTMLElement>(
				'[data-testid="purpose-item-1"]'
			);
			expect(item).not.toBeNull();
			return item as HTMLElement;
		});

		expect(specialPurposeItem.textContent).toContain(specialPurpose1.name);
		const lockedSwitch = specialPurposeItem.querySelector('[role="switch"]');
		expect(lockedSwitch?.getAttribute('aria-checked')).toBe('true');
		expect(lockedSwitch?.hasAttribute('disabled')).toBe(true);

		// Features are no longer listed in the locked section.
		for (const feature of Object.values(mockGVL.features)) {
			expect(specialPurposesSection?.textContent).not.toContain(feature.name);
		}
	});
});
