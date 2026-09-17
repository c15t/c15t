/**
 * The named parts a host app can restyle.
 *
 * The list is closed on purpose: a component may expose a part, and a host may
 * override one, but neither side invents a selector. Anything the list does not
 * cover belongs in a theme token.
 */

import type { StyleProp, TextStyle, ViewStyle } from 'react-native';

/** Every part a built-in surface exposes. */
export const CONSENT_THEME_PARTS = [
	'banner',
	'branding',
	'brandingLabel',
	'caption',
	'captionLink',
	'categoryDescription',
	'categoryRow',
	'categoryTitle',
	'description',
	'footer',
	'handle',
	'header',
	'label',
	'overlay',
	'primaryButton',
	'primaryLabel',
	'row',
	'scroll',
	'scrollContent',
	'secondaryButton',
	'secondaryLabel',
	'sheet',
	'switch',
	'title',
] as const;

/** One restylable part. */
export type ConsentThemePart = (typeof CONSENT_THEME_PARTS)[number];

/** Styles a host app passes to override individual parts. */
export type ConsentPartStyles = Partial<
	Record<ConsentThemePart, StyleProp<ViewStyle | TextStyle>>
>;

/** Every part, resolved to a plain style object. */
export type ConsentResolvedParts = Record<
	ConsentThemePart,
	ViewStyle & TextStyle
>;

/** The smallest tap target Apple and Google accept. */
export const MIN_TAP_TARGET = 44;

/**
 * Whether a value is one of the restylable parts.
 *
 * @param part - Candidate key from a host-supplied style map.
 * @returns `true` when the key is a real part.
 */
export const isConsentThemePart = function isConsentThemePart(
	part: string
): part is ConsentThemePart {
	return (CONSENT_THEME_PARTS as readonly string[]).includes(part);
};
