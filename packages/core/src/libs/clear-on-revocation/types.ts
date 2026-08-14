/**
 * @packageDocumentation
 * Types for clearing first-party cookies and Web Storage keys when consent
 * for a category is not granted.
 */

import type { AllConsentNames } from '../../types/consent-types';

/**
 * A cookie to delete - a name, a `prefix*` pattern, or an object with a
 * `path` if the cookie wasn't set on `/`.
 *
 * Deletion only works if the write matches the cookie's original `Path`
 * and `Domain`. We retry against the root domain automatically, but we
 * can't guess a non-default path - so if a tracking script scopes its
 * cookie to something like `/checkout`, spell that out here.
 *
 * @public
 */
export interface ClearOnRevocationCookieTarget {
	/** Cookie name, or a `prefix*` pattern (e.g. `_ga_*`). */
	name: string;

	/** Path the cookie was set with, if not `/`. */
	path?: string;
}

/**
 * What to remove for a single consent category.
 *
 * Names match exactly, or as a prefix when they end in `*` (`_ga_*` picks
 * up `_ga_ABCDEF1234`, GA4's per-property cookie).
 *
 * Only JS-readable cookies can be cleared this way - `HttpOnly` cookies
 * set by the server aren't visible to `document.cookie`, so they're just
 * left alone.
 *
 * @public
 */
export interface ClearOnRevocationTargets {
	/**
	 * Cookies to delete when the category isn't granted. Use a
	 * `{ name, path }` object instead of a string for non-default paths.
	 */
	cookies?: (string | ClearOnRevocationCookieTarget)[];

	/** `localStorage` keys (or `prefix*` patterns) to remove. */
	localStorage?: string[];

	/** `sessionStorage` keys (or `prefix*` patterns) to remove. */
	sessionStorage?: string[];
}

/**
 * Per-category cleanup config.
 *
 * @example
 * ```typescript
 * clearOnRevocation: {
 *   marketing: { cookies: ['_fbq', '_ga_*'], localStorage: ['foobar'] },
 * }
 * ```
 *
 * @public
 */
export type ClearOnRevocationConfig = Partial<
	Record<AllConsentNames, ClearOnRevocationTargets>
>;
