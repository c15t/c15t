/**
 * Screens for the standard (non-IAB) consent flow.
 *
 * Two screens: the first layer, shown as a bottom sheet, and the preferences
 * list it pushes. Both take resolved copy and category rows rather than a
 * snapshot, so a Swift or Kotlin port can feed them from its own core.
 */

import type { ConsentCategoryRow } from '../components/internal/categories';
import type { ConsentCopy } from '../components/internal/copy';
import type { AllConsentNames } from '../protocol/vocabulary';
import type { Screen, ScreenRow } from './types';

/** Screen id of the first layer. */
export const FIRST_LAYER_SCREEN = 'firstLayer';

/** Screen id of the preferences list. */
export const PREFERENCES_SCREEN = 'preferences';

/** Prefix of every category row id. */
const CATEGORY_ROW_PREFIX = 'category.';

/**
 * Build the first layer.
 *
 * In choice mode Accept all and Reject all share `parity`, so no renderer can
 * make refusing harder than agreeing. In notice mode the subject has nothing to
 * decide, so the screen offers one acknowledgement.
 *
 * @param input - What the screen shows.
 * @param input.copy - Copy in the subject's language.
 * @param input.notice - Whether the policy asks for a notice, not a choice.
 * @returns The first-layer screen.
 *
 * @example
 * ```ts
 * const screen = buildFirstLayer({ copy, notice: false });
 * screen.actions.map((action) => action.id);
 * // ['acceptAll', 'rejectAll', 'manage']
 * ```
 */
export const buildFirstLayer = function buildFirstLayer({
	copy,
	notice,
}: {
	readonly copy: ConsentCopy;
	readonly notice: boolean;
}): Screen {
	return {
		actions: notice
			? [
					{ emphasis: 'primary', id: 'acknowledge', label: copy.acknowledge },
					{ emphasis: 'text', id: 'manage', label: copy.preferences },
				]
			: [
					{ emphasis: 'parity', id: 'acceptAll', label: copy.acceptAll },
					{ emphasis: 'parity', id: 'rejectAll', label: copy.rejectAll },
					{ emphasis: 'text', id: 'manage', label: copy.preferences },
				],
		id: FIRST_LAYER_SCREEN,
		intro: notice ? copy.noticeDescription : copy.bannerDescription,
		sections: [],
		title: notice ? copy.noticeTitle : copy.bannerTitle,
	};
};

/**
 * The row id for one category.
 *
 * @param category - Category the row decides.
 * @returns The row id, such as `category.marketing`.
 */
export const categoryRowId = function categoryRowId(
	category: AllConsentNames
): string {
	return `${CATEGORY_ROW_PREFIX}${category}`;
};

/**
 * The category a row id names.
 *
 * @param rowId - Row id from a preferences screen.
 * @returns The category, or `null` when the id is not a category row.
 */
export const categoryFromRowId = function categoryFromRowId(
	rowId: string
): AllConsentNames | null {
	if (!rowId.startsWith(CATEGORY_ROW_PREFIX)) {
		return null;
	}

	const category = rowId.slice(CATEGORY_ROW_PREFIX.length);

	return category === 'necessary' ||
		category === 'experience' ||
		category === 'functionality' ||
		category === 'marketing' ||
		category === 'measurement'
		? category
		: null;
};

/**
 * Build the preferences list.
 *
 * One switch row per category in scope. Necessary arrives disabled and on, and
 * a restricted category arrives disabled and off, because
 * `buildConsentCategoryRows` already settled both. Save is the one primary
 * action; Reject all and Accept all follow as an equal tonal pair.
 *
 * @param input - What the screen shows.
 * @param input.copy - Copy in the subject's language.
 * @param input.hideBranding - Whether to drop the "Secured by c15t" footnote.
 * @param input.rows - Category rows with any pending switch applied.
 * @returns The preferences screen.
 */
export const buildPreferences = function buildPreferences({
	copy,
	hideBranding = false,
	rows,
}: {
	readonly copy: ConsentCopy;
	readonly hideBranding?: boolean;
	readonly rows: readonly ConsentCategoryRow[];
}): Screen {
	const listed: ScreenRow[] = rows.map((row) => ({
		control: { disabled: row.disabled, kind: 'switch', value: row.value },
		detail: row.description,
		id: categoryRowId(row.key),
		title: row.label,
	}));

	const screen: Screen = {
		actions: [
			{ emphasis: 'primary', id: 'save', label: copy.save },
			{ emphasis: 'tonal', id: 'rejectAll', label: copy.rejectAll },
			{ emphasis: 'tonal', id: 'acceptAll', label: copy.acceptAll },
		],
		id: PREFERENCES_SCREEN,
		intro: copy.dialogDescription,
		sections: [{ id: 'categories', rows: listed }],
		title: copy.dialogTitle,
	};
	if (!hideBranding) {
		return { ...screen, branding: copy.securedBy };
	}
	return screen;
};
