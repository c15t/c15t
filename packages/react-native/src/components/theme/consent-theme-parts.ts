/**
 * The named parts a host app can restyle.
 *
 * The list is closed on purpose: a component may expose a part, and a host may
 * override one, but neither side invents a selector. Anything the list does not
 * cover belongs in a theme token. The names follow the platform elements in
 * `native/UI.md`, so a SwiftUI or Compose port can offer the same hooks.
 */

import type { StyleProp, TextStyle, ViewStyle } from 'react-native';

/** Every part a built-in screen exposes. */
export const CONSENT_THEME_PARTS = [
	'branding',
	'button',
	'buttonLabel',
	'empty',
	'footer',
	'grabber',
	'intro',
	'list',
	'navBar',
	'navButton',
	'navButtonLabel',
	'navTitle',
	'page',
	'row',
	'rowDetail',
	'rowTitle',
	'rowValue',
	'scrim',
	'searchField',
	'section',
	'sectionFooter',
	'sectionHeader',
	'segment',
	'segmentLabel',
	'segmentedControl',
	'sheet',
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

/** The smallest tap target Apple accepts. Android asks for 48. */
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
