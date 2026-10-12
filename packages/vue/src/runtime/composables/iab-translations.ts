import { defaultTranslationConfig } from '@c15t/core';
import type { IABTranslations } from '@c15t/translations';
import { computed, toValue } from 'vue';
import type { ComputedRef } from 'vue';

import { useConsentInit } from './init';

type DeepPartial<Value> = {
	[Key in keyof Value]?: Value[Key] extends object
		? DeepPartial<Value[Key]>
		: Value[Key];
};

const DEFAULT_IAB_TRANSLATIONS = defaultTranslationConfig.translations.en
	?.iab as IABTranslations;

const isMergeable = function isMergeable(
	value: unknown
): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const deepMerge = function deepMerge<Section extends object>(
	defaults: Section,
	overrides?: DeepPartial<Section>
): Section {
	if (!overrides) {
		return defaults;
	}
	const result: Record<string, unknown> = {
		...(defaults as Record<string, unknown>),
	};
	const source = overrides as Record<string, unknown>;
	for (const key of Object.keys(result)) {
		const defaultValue = result[key];
		const overrideValue = source[key];
		if (overrideValue === undefined) {
			continue;
		}
		result[key] =
			isMergeable(defaultValue) && isMergeable(overrideValue)
				? deepMerge(defaultValue, overrideValue)
				: overrideValue;
	}
	return result as Section;
};

/**
 * The IAB copy, with the English defaults filled in underneath.
 *
 * A hosted backend or an i18n bundle for another language can leave IAB
 * keys out — most language files carry no `partnerSingular`, say — and
 * React and Svelte deep-merge over the English defaults before they read
 * one. This is the same merge for Vue, so a missing key renders its
 * default rather than nothing.
 *
 * @returns The complete IAB translations for the active language.
 */
export const useIabTranslations =
	function useIabTranslations(): ComputedRef<IABTranslations> {
		const init = useConsentInit();
		return computed(() => {
			const bundle = (
				toValue(init)?.translations?.translations as
					| { iab?: DeepPartial<IABTranslations> }
					| undefined
			)?.iab;
			return deepMerge(DEFAULT_IAB_TRANSLATIONS, bundle);
		});
	};
