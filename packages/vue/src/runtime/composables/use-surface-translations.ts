import { defaultTranslationConfig } from '@c15t/core';
import type { CompleteTranslations, Translations } from '@c15t/translations';
import { computed } from 'vue';
import type { ComputedRef } from 'vue';

import { useConsentInit } from './init';

const ENGLISH = defaultTranslationConfig.translations
	.en as CompleteTranslations;

/** The copy a consent surface reads, each key falling back to English. */
export interface SurfaceTranslations {
	/** Resolved translation bundle for the active language, if any. */
	bundle: Partial<Translations> | undefined;
	/** English defaults, for any key the bundle leaves out. */
	english: CompleteTranslations;
}

/**
 * The init translations for the active language next to the English
 * defaults, so a surface renders its default copy in the visitor's language
 * and still has text before init has delivered any.
 *
 * @returns The active bundle and the English fallback.
 * @internal
 */
export const useSurfaceTranslations =
	function useSurfaceTranslations(): ComputedRef<SurfaceTranslations> {
		const init = useConsentInit();
		return computed(() => ({
			bundle: init.value?.translations?.translations as
				| Partial<Translations>
				| undefined,
			english: ENGLISH,
		}));
	};
