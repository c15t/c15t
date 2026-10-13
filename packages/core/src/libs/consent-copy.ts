/** Resolve the copy a consent UI renders from the active translations. */
import type { PolicyPrompt, PolicyRight } from '@c15t/schema/types';
import type { Translations } from '@c15t/translations';
// The `/en` entry, not the package root: the React components that share a
// chunk with lazy surfaces call these helpers, and importing the root (with
// its stock-language registry) from that chunk gives Rolldown a static cycle
// that splits every shared module into its own file.
import { translations as enTranslations } from '@c15t/translations/en';

import type { PresentationAction } from './policy-actions';

/** Rights a surface exposes as a control. `disclosure` is carried by legal links. */
export type PreferenceControl = Exclude<PolicyRight, 'disclosure'>;

/** Banner heading and body text under the active policy prompt. */
export interface PromptCopy {
	title: string;
	description: string;
}

/**
 * Banner title and description for a policy prompt.
 *
 * @remarks
 * A notice prompt reads `noticeTitle` and `noticeDescription` so it informs
 * rather than asks. A language that has not translated the notice copy falls
 * back to its own choice copy before English.
 *
 * @param translations - The active language bundle. Missing keys use English.
 * @param prompt - The prompt of the active policy rule.
 * @returns The title and description to render.
 *
 * @example
 * ```ts
 * const { title, description } = resolvePromptCopy(translations, rule.prompt);
 * ```
 */
export const resolvePromptCopy = function resolvePromptCopy(
	translations: Partial<Translations> | undefined,
	prompt: PolicyPrompt
): PromptCopy {
	const banner = translations?.cookieBanner;
	const fallback = enTranslations.cookieBanner;
	if (prompt === 'notice') {
		return {
			description:
				banner?.noticeDescription ??
				banner?.description ??
				fallback.noticeDescription,
			title: banner?.noticeTitle ?? banner?.title ?? fallback.noticeTitle,
		};
	}
	return {
		description: banner?.description ?? fallback.description,
		title: banner?.title ?? fallback.title,
	};
};

/**
 * Button labels for every presentation action.
 *
 * @remarks
 * Pairs with `actionGroups` from `resolveConsentPresentation`, so a custom
 * UI can render any resolved action without its own label map. `dismiss`
 * reads `common.acknowledge`, then `common.dismiss`.
 *
 * @param translations - The active language bundle. Missing keys use English.
 * @returns A label for each action.
 *
 * @example
 * ```ts
 * const labels = resolveActionLabels(translations);
 * presentation.orderedActions.map((action) => labels[action]);
 * ```
 */
export const resolveActionLabels = function resolveActionLabels(
	translations: Partial<Translations> | undefined
): Record<PresentationAction, string> {
	const common = translations?.common;
	const fallback = enTranslations.common;
	return {
		accept: common?.acceptAll ?? fallback.acceptAll,
		customize: common?.customize ?? fallback.customize,
		dismiss: common?.acknowledge ?? common?.dismiss ?? fallback.acknowledge,
		reject: common?.rejectAll ?? fallback.rejectAll,
		save: common?.save ?? fallback.save,
	};
};

/**
 * Labels for the controls that open preferences.
 *
 * @remarks
 * Pairs with `preferenceControls` from `resolveConsentPresentation`. The
 * `opt-out` label keeps its statutory "do not sell or share" meaning, so
 * translate it rather than reusing the preferences label.
 *
 * @param translations - The active language bundle. Missing keys use English.
 * @returns A label for each preference control.
 *
 * @example
 * ```ts
 * const labels = resolvePreferenceControlLabels(translations);
 * presentation.preferenceControls.map((control) => labels[control]);
 * ```
 */
export const resolvePreferenceControlLabels =
	function resolvePreferenceControlLabels(
		translations: Partial<Translations> | undefined
	): Record<PreferenceControl, string> {
		const rights = translations?.rights;
		const fallback = enTranslations.rights;
		return {
			'opt-out': rights?.optOut ?? fallback.optOut,
			preferences: rights?.preferences ?? fallback.preferences,
		};
	};
