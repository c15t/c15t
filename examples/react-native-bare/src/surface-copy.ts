/**
 * The consent copy this app draws itself.
 *
 * The built-in surfaces resolve their own strings. This app has one control of
 * its own that belongs to the same flow, the entry point that reopens the
 * preference centre, and a list of category names, so it reads the same bundle the
 * surfaces read: `snapshot.translations` is carried through the cores untouched,
 * which makes it the source a host is meant to use for copy the surfaces do not
 * name. The fallbacks below are the package's own English defaults, applied the
 * same way, so host and surfaces agree string for string whether the backend
 * serves a bundle, a partial one, or nothing.
 */

import type { AllConsentNames, ConsentSnapshot } from '@c15t/react-native';
import { CONSENT_CATEGORIES } from '@c15t/react-native';

/**
 * What the package shows when the bundle does not name a category.
 *
 * `measurement` reads `Analytics`, following the web list, so one category answers
 * to one word wherever the subject meets it.
 */
const FALLBACK_TITLES: Record<AllConsentNames, string> = {
	experience: 'Experience',
	functionality: 'Functionality',
	marketing: 'Marketing',
	measurement: 'Analytics',
	necessary: 'Strictly Necessary',
};

/** What the package shows when no bundle carries the entry-point label. */
const FALLBACK_PREFERENCES = 'Manage preferences';

/** Use a served string when it carries text, the served bundle's own rule. */
const text = (value: string | null | undefined, fallback: string): string =>
	typeof value === 'string' && value.trim() !== '' ? value : fallback;

/** The category names, in the order the scopes list them. */
export const CATEGORY_NAMES = CONSENT_CATEGORIES;

/**
 * Read one category's served title.
 *
 * @param snapshot - Snapshot to read the bundle from.
 * @param category - Category to name.
 * @returns The served title, or the package default.
 */
export const categoryTitle = (
	snapshot: ConsentSnapshot,
	category: AllConsentNames
): string =>
	text(
		snapshot.translations?.translations.consentTypes?.[category]?.title,
		FALLBACK_TITLES[category]
	);

/**
 * Read the label for the standing entry point to the preference centre.
 *
 * @param snapshot - Snapshot to read the bundle from.
 * @returns The served label, or the package default.
 */
export const preferencesLabel = (snapshot: ConsentSnapshot): string =>
	text(
		snapshot.translations?.translations.rights?.preferences,
		FALLBACK_PREFERENCES
	);
