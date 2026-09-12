import { deepMergeTranslations, defaultTranslationConfig } from '@c15t/core';
import type { ConsentSnapshot, Translations } from '@c15t/core';
import type { CompleteTranslations } from '@c15t/translations';
import { getTextDirection } from '@c15t/ui/utils';

/** The copy a surface renders from. */
export interface SurfaceCopy {
	/** The resolved bundle, bundled English filling any gaps. */
	t: CompleteTranslations;
	/** The resolved language, if the transport reported one. */
	language: string | undefined;
	/** Text direction for the resolved language. */
	dir: 'ltr' | 'rtl';
}

/**
 * Resolve the translations a surface should render.
 *
 * Mirrors what the React and Svelte surfaces do: the snapshot's resolved
 * bundle wins, bundled English fills anything it lacks.
 *
 * @param snapshot - The kernel snapshot.
 * @returns The copy.
 */
export const resolveCopy = function resolveCopy(
	snapshot: ConsentSnapshot
): SurfaceCopy {
	const fallback = defaultTranslationConfig.translations.en as Translations;
	const bundle = snapshot.translations?.translations as
		| Partial<Translations>
		| undefined;
	const language = snapshot.translations?.language;
	return {
		dir: getTextDirection(language),
		language,
		// Bundled English is complete, so the merge is too.
		t: (bundle
			? deepMergeTranslations(fallback, bundle)
			: fallback) as CompleteTranslations,
	};
};

/**
 * Title-case a category name for categories without a translation.
 *
 * @param name - The category name.
 * @returns A readable label.
 */
export const formatCategoryName = function formatCategoryName(
	name: string
): string {
	return name
		.replace(/_/gu, ' ')
		.replace(/\b\w/gu, (character) => character.toUpperCase());
};
