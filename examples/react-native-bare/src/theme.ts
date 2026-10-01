/**
 * The look the host screens share with the consent surfaces.
 *
 * Every colour, radius, and step here is read off the package's own theme rather
 * than copied into a parallel stylesheet, so the app chrome and the banner the
 * SDK draws are the same design. When a token changes in the package, this screen
 * moves with it, which is the point: a demo whose chrome disagrees with the
 * surfaces it hosts teaches the wrong lesson about the default theme.
 */

import type { ConsentColorScheme, ConsentTheme } from '@c15t/react-native';
import {
	darkTheme,
	lightTheme,
	resolveConsentColorScheme,
} from '@c15t/react-native';
import { useColorScheme } from 'react-native';

/** What the reviewer picked in the header control. */
export const APPEARANCES = ['light', 'dark', 'system'] as const;

/** One entry of {@link APPEARANCES}. */
export type Appearance = (typeof APPEARANCES)[number];

/** Label for the control, and the value a deep link takes. */
export const APPEARANCE_LABELS: Record<Appearance, string> = {
	dark: 'Dark',
	light: 'Light',
	system: 'System',
};

/** The three choices, spelled the way a deep link spells them. */
export const APPEARANCE_HINT = APPEARANCES.join(' | ');

/**
 * Whether a value from a deep link names an appearance.
 *
 * @param value - Candidate, usually a path segment or query parameter.
 * @returns `true` when it is one of {@link APPEARANCES}.
 */
export const isAppearance = (value: unknown): value is Appearance =>
	typeof value === 'string' &&
	(APPEARANCES as readonly string[]).includes(value);

/**
 * The theme to hand the built-in surfaces for a chosen appearance.
 *
 * `system` answers `undefined`, which is the documented way to leave the choice
 * with the platform: the surfaces then read `useColorScheme()` themselves. A
 * light or dark pick is passed as one of the package's finished themes, which are
 * module-scope constants, so the identity the surfaces memoize on never moves.
 *
 * @param appearance - Value from the header control or a deep link.
 * @returns A finished theme, or `undefined` to follow the platform.
 */
export const surfaceTheme = (
	appearance: Appearance
): ConsentTheme | undefined => {
	if (appearance === 'system') {
		return undefined;
	}

	return appearance === 'dark' ? darkTheme : lightTheme;
};

/** What {@link useAppTheme} reports for one render. */
export interface AppTheme {
	/** Which palette is in force, after `system` resolves. */
	readonly scheme: ConsentColorScheme;
	/** The theme to render the host chrome with. */
	readonly theme: ConsentTheme;
}

/**
 * Resolve the palette the host screens draw with.
 *
 * This is the host's half of the same decision the surfaces make in
 * `useConsentStyles`, made from the same input, so a forced scheme moves the
 * chrome and the sheet together.
 *
 * @param appearance - Value from the header control or a deep link.
 * @returns The scheme in force and the theme to draw with.
 */
export const useAppTheme = (appearance: Appearance): AppTheme => {
	const platform = useColorScheme();
	const scheme = resolveConsentColorScheme(
		appearance === 'system' ? platform : appearance
	);

	return { scheme, theme: scheme === 'dark' ? darkTheme : lightTheme };
};
