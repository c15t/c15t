/**
 * Tests for IAB translation utilities.
 *
 * Tests getIABTranslations which resolves IAB-specific translations
 * with deep merge fallback to defaults.
 */

import type { TranslationConfig } from 'c15t';
import { defaultTranslationConfig } from 'c15t';
import { describe, expect, it } from 'vitest';
import { getIABTranslations } from '../iab-translations';

/**
 * Helper to create a TranslationConfig with IAB overrides.
 * The config must pass isTranslations() which requires cookieBanner,
 * consentManagerDialog, consentTypes, and common keys.
 */
function createConfigWithIABOverrides(
	iabOverrides: Record<string, unknown>
): TranslationConfig {
	const defaultEn = defaultTranslationConfig.translations.en!;
	return {
		translations: {
			en: {
				...defaultEn,
				iab: {
					...(defaultEn as any).iab,
					...iabOverrides,
				},
			} as any,
		},
		defaultLanguage: 'en',
	};
}

describe('getIABTranslations', () => {
	describe('with no config', () => {
		it('returns default English IAB translations', () => {
			const translations = getIABTranslations();

			expect(translations).toBeDefined();
			expect(typeof translations).toBe('object');
		});

		it('has all expected top-level keys', () => {
			const translations = getIABTranslations();

			expect(translations).toHaveProperty('banner');
			expect(translations).toHaveProperty('common');
			expect(translations).toHaveProperty('preferenceCenter');
		});

		it('banner has all expected fields', () => {
			const { banner } = getIABTranslations();

			expect(banner.title).toBeTypeOf('string');
			expect(banner.description).toBeTypeOf('string');
			expect(banner.partnersLink).toBeTypeOf('string');
			expect(banner.andMore).toBeTypeOf('string');
			expect(banner.legitimateInterestNotice).toBeTypeOf('string');
			expect(banner.scopeServiceSpecific).toBeTypeOf('string');
			expect(banner.scopeGroup).toBeTypeOf('string');
		});

		it('common has all expected fields', () => {
			const { common } = getIABTranslations();

			expect(common.acceptAll).toBeTypeOf('string');
			expect(common.rejectAll).toBeTypeOf('string');
			expect(common.customize).toBeTypeOf('string');
			expect(common.saveSettings).toBeTypeOf('string');
			expect(common.loading).toBeTypeOf('string');
			expect(common.showingSelectedVendor).toBeTypeOf('string');
			expect(common.clearSelection).toBeTypeOf('string');
			expect(common.customPartner).toBeTypeOf('string');
		});

		it('preferenceCenter has all expected nested structures', () => {
			const { preferenceCenter } = getIABTranslations();

			expect(preferenceCenter.title).toBeTypeOf('string');
			expect(preferenceCenter.description).toBeTypeOf('string');

			expect(preferenceCenter.tabs.purposes).toBeTypeOf('string');
			expect(preferenceCenter.tabs.vendors).toBeTypeOf('string');

			expect(preferenceCenter.purposeItem.partners).toBeTypeOf('string');
			expect(
				preferenceCenter.purposeItem.vendorsUseLegitimateInterest
			).toBeTypeOf('string');
			expect(preferenceCenter.purposeItem.examples).toBeTypeOf('string');

			expect(preferenceCenter.specialPurposes.title).toBeTypeOf('string');
			expect(preferenceCenter.specialPurposes.tooltip).toBeTypeOf('string');

			expect(preferenceCenter.vendorList.search).toBeTypeOf('string');
			expect(preferenceCenter.vendorList.showingCount).toBeTypeOf('string');
			expect(preferenceCenter.vendorList.privacyPolicy).toBeTypeOf('string');

			expect(preferenceCenter.footer.consentStorage).toBeTypeOf('string');
		});

		it('default strings are non-empty', () => {
			const translations = getIABTranslations();

			expect(translations.banner.title.length).toBeGreaterThan(0);
			expect(translations.common.acceptAll.length).toBeGreaterThan(0);
			expect(translations.preferenceCenter.title.length).toBeGreaterThan(0);
		});
	});

	describe('with partial overrides', () => {
		it('overrides banner.title while keeping other defaults', () => {
			const defaults = getIABTranslations();
			const config = createConfigWithIABOverrides({
				banner: { title: 'Custom Banner Title' },
			});
			const translations = getIABTranslations(config);

			expect(translations.banner.title).toBe('Custom Banner Title');
			expect(translations.banner.description).toBe(defaults.banner.description);
			expect(translations.banner.partnersLink).toBe(
				defaults.banner.partnersLink
			);
		});

		it('overrides nested preferenceCenter.tabs values', () => {
			const defaults = getIABTranslations();
			const config = createConfigWithIABOverrides({
				preferenceCenter: {
					tabs: {
						purposes: 'Zwecke',
						vendors: 'Anbieter',
					},
				},
			});
			const translations = getIABTranslations(config);

			expect(translations.preferenceCenter.tabs.purposes).toBe('Zwecke');
			expect(translations.preferenceCenter.tabs.vendors).toBe('Anbieter');
			expect(translations.preferenceCenter.title).toBe(
				defaults.preferenceCenter.title
			);
			expect(translations.preferenceCenter.footer.consentStorage).toBe(
				defaults.preferenceCenter.footer.consentStorage
			);
		});

		it('overrides common.acceptAll only', () => {
			const defaults = getIABTranslations();
			const config = createConfigWithIABOverrides({
				common: { acceptAll: 'Alle akzeptieren' },
			});
			const translations = getIABTranslations(config);

			expect(translations.common.acceptAll).toBe('Alle akzeptieren');
			expect(translations.common.rejectAll).toBe(defaults.common.rejectAll);
			expect(translations.common.customize).toBe(defaults.common.customize);
			expect(translations.common.saveSettings).toBe(
				defaults.common.saveSettings
			);
		});
	});

	describe('with no iab translations in config', () => {
		it('returns defaults when translations config has no iab section', () => {
			const defaults = getIABTranslations();
			const translations = getIABTranslations({
				defaultLanguage: 'en',
				translations: {
					en: {},
				},
			});

			expect(translations).toEqual(defaults);
		});

		it('returns defaults when translations config is empty object', () => {
			const defaults = getIABTranslations();
			const translations = getIABTranslations({});

			expect(translations).toEqual(defaults);
		});
	});

	describe('deep merge behavior', () => {
		it('merges nested objects correctly without replacing entire subtrees', () => {
			const defaults = getIABTranslations();
			const config = createConfigWithIABOverrides({
				preferenceCenter: {
					purposeItem: {
						partners: 'Custom Partners',
					},
				},
			});
			const translations = getIABTranslations(config);

			expect(translations.preferenceCenter.purposeItem.partners).toBe(
				'Custom Partners'
			);
			expect(translations.preferenceCenter.purposeItem.examples).toBe(
				defaults.preferenceCenter.purposeItem.examples
			);
			expect(
				translations.preferenceCenter.purposeItem.vendorsUseLegitimateInterest
			).toBe(
				defaults.preferenceCenter.purposeItem.vendorsUseLegitimateInterest
			);
			expect(translations.preferenceCenter.vendorList.search).toBe(
				defaults.preferenceCenter.vendorList.search
			);
		});

		it('does not replace defaults with undefined overrides', () => {
			const defaults = getIABTranslations();
			const config = createConfigWithIABOverrides({
				banner: { title: undefined },
			});
			const translations = getIABTranslations(config);

			expect(translations.banner.title).toBe(defaults.banner.title);
		});

		it('can override multiple sections simultaneously', () => {
			const defaults = getIABTranslations();
			const config = createConfigWithIABOverrides({
				banner: { title: 'New Banner' },
				common: { rejectAll: 'Decline All' },
				preferenceCenter: { title: 'Privacy Preferences' },
			});
			const translations = getIABTranslations(config);

			expect(translations.banner.title).toBe('New Banner');
			expect(translations.common.rejectAll).toBe('Decline All');
			expect(translations.preferenceCenter.title).toBe('Privacy Preferences');

			expect(translations.banner.description).toBe(defaults.banner.description);
			expect(translations.common.acceptAll).toBe(defaults.common.acceptAll);
			expect(translations.preferenceCenter.description).toBe(
				defaults.preferenceCenter.description
			);
		});
	});
});
