/**
 * Turn a theme plus per-part overrides into the style objects the built-in
 * screens render with.
 *
 * Every number here comes from the theme, and the theme comes from the
 * platform. Layout that differs between iOS and Android, such as inset grouped
 * sections against flat Material lists, is decided once in this file, so the
 * components only place parts.
 */

import { useMemo } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';

import { useConsentSafeArea } from '../../hooks/use-consent-safe-area';
import type { ConsentSafeArea } from '../../hooks/use-consent-safe-area';
import { isConsentThemePart } from './consent-theme-parts';
import type {
	ConsentPartStyles,
	ConsentResolvedParts,
	ConsentThemePart,
} from './consent-theme-parts';
import {
	createConsentTheme,
	resolveConsentColorScheme,
} from './create-consent-theme';
import type {
	ConsentTheme,
	ConsentThemeOptions,
	ConsentTypeStyle,
} from './create-consent-theme';

/** What {@link useConsentStyles} hands a screen. */
export interface ConsentStyles {
	/** Every restylable part, already merged with the host override. */
	readonly parts: ConsentResolvedParts;
	/** The system bars and cutouts the sheet and page keep clear of. */
	readonly safeArea: ConsentSafeArea;
	/** Theme in force after the platform, the scheme, and any host override. */
	readonly theme: ConsentTheme;
}

/** Options for {@link useConsentStyles}. */
export interface UseConsentStylesOptions {
	/** Per-part overrides, merged last. */
	readonly styles?: ConsentPartStyles;
	/**
	 * Theme overrides. The color scheme follows the system unless this sets one.
	 * A full {@link ConsentTheme}, such as `darkTheme`, is accepted as well.
	 */
	readonly theme?: ConsentThemeOptions;
}

/**
 * A type role as a text style.
 *
 * Line height is set alongside the size because React Native scales both with
 * the system text size, which keeps rows from clipping at large sizes.
 *
 * @param role - Role from the theme.
 * @param color - Text color.
 * @returns The text style.
 */
const text = (role: ConsentTypeStyle, color: string): TextStyle => ({
	color,
	fontSize: role.fontSize,
	fontWeight: role.weight,
	lineHeight: role.lineHeight,
});

/**
 * The base style of every part for one theme.
 *
 * @param theme - Resolved theme.
 * @returns Every part, before host overrides.
 */
export const createConsentParts = function createConsentParts(
	theme: ConsentTheme
): ConsentResolvedParts {
	const { colors, metrics, radius, spacing, typography } = theme;
	const ios = theme.platform === 'ios';
	// iOS insets every grouped section from the screen edge. Material lists run
	// edge to edge, and their padding lives on the row.
	const sectionInset = ios ? spacing.m16 : 0;

	return {
		branding: {
			alignItems: 'center',
			flexDirection: 'row',
			gap: 5,
			justifyContent: 'center',
			minHeight: metrics.hitTarget,
			paddingVertical: spacing.m16,
		},
		button: {
			alignItems: 'center',
			borderRadius: radius.button,
			justifyContent: 'center',
			minHeight: Math.max(metrics.buttonHeight, metrics.hitTarget),
			paddingHorizontal: ios ? spacing.l24 - 4 : spacing.l24,
			paddingVertical: ios ? 14 : 10,
		},
		buttonLabel: {
			...text(typography.button, colors.primary),
			textAlign: 'center',
		},
		empty: {
			...text(typography.body, colors.secondaryLabel),
			paddingHorizontal: spacing.xl32,
			paddingVertical: spacing.xl32 * 2,
			textAlign: 'center',
		},
		footer: {
			gap: spacing.s8,
			paddingHorizontal: spacing.m16,
			paddingTop: ios ? spacing.m16 - 4 : spacing.m16,
		},
		grabber: {
			alignSelf: 'center',
			backgroundColor: colors.secondaryLabel,
			borderRadius: metrics.grabberHeight / 2,
			height: metrics.grabberHeight,
			opacity: 0.4,
			width: metrics.grabberWidth,
		},
		intro: {
			...text(typography.body, ios ? colors.label : colors.secondaryLabel),
		},
		list: { backgroundColor: colors.background, flexGrow: 1 },
		navBar: {
			alignItems: 'center',
			flexDirection: 'row',
			height: metrics.navBarHeight,
			paddingHorizontal: ios ? spacing.s8 : spacing.xs4,
		},
		navButton: {
			alignItems: 'center',
			flexDirection: 'row',
			justifyContent: 'center',
			minHeight: metrics.hitTarget,
			minWidth: metrics.hitTarget,
			paddingHorizontal: ios ? spacing.s8 : 0,
		},
		navButtonLabel: ios
			? text(typography.body, colors.primary)
			: { color: colors.label, fontSize: 24, lineHeight: 24 },
		navTitle: ios
			? {
					...text(typography.navTitle, colors.label),
					flex: 1,
					textAlign: 'center',
				}
			: {
					...text(typography.navTitle, colors.label),
					flex: 1,
					paddingHorizontal: spacing.s8,
				},
		page: { backgroundColor: colors.background, flex: 1 },
		row: {
			alignItems: 'center',
			flexDirection: 'row',
			gap: ios ? spacing.m16 - 4 : spacing.m16,
			minHeight: metrics.rowHeight,
			paddingHorizontal: spacing.m16,
			paddingVertical: ios ? 11 : spacing.s8,
		},
		rowDetail: text(typography.rowDetail, colors.secondaryLabel),
		rowTitle: text(typography.rowTitle, colors.label),
		rowValue: text(typography.rowTitle, colors.secondaryLabel),
		scrim: {
			backgroundColor: colors.scrim,
			bottom: 0,
			left: 0,
			position: 'absolute',
			right: 0,
			top: 0,
		},
		searchField: {
			...text(typography.body, colors.label),
			backgroundColor: colors.fill,
			borderRadius: radius.field,
			height: metrics.searchHeight,
			marginHorizontal: spacing.m16,
			paddingHorizontal: ios ? spacing.s8 : spacing.m16 + 4,
			paddingVertical: 0,
		},
		section: ios
			? {
					backgroundColor: colors.surface,
					borderRadius: radius.section,
					marginHorizontal: sectionInset,
					overflow: 'hidden',
				}
			: {},
		sectionFooter: {
			...text(typography.sectionFooter, colors.secondaryLabel),
			paddingHorizontal: sectionInset + spacing.m16,
			paddingTop: ios ? 6 : spacing.xs4,
		},
		sectionHeader: ios
			? {
					...text(typography.sectionHeader, colors.secondaryLabel),
					paddingBottom: 6,
					paddingHorizontal: sectionInset + spacing.m16,
					paddingTop: spacing.l24,
					textTransform: 'uppercase',
				}
			: {
					...text(typography.sectionHeader, colors.primary),
					paddingBottom: spacing.s8,
					paddingHorizontal: spacing.m16,
					paddingTop: spacing.m16,
				},
		segment: {
			alignItems: 'center',
			borderRadius: ios ? radius.field - 3 : 0,
			flex: 1,
			justifyContent: 'center',
			minHeight: ios ? metrics.segmentHeight - 4 : metrics.segmentHeight,
		},
		segmentLabel: ios
			? { color: colors.label, fontSize: 13, fontWeight: '500', lineHeight: 18 }
			: text(typography.button, colors.secondaryLabel),
		segmentedControl: ios
			? {
					backgroundColor: colors.fill,
					borderRadius: radius.field - 1,
					flexDirection: 'row',
					marginHorizontal: spacing.m16,
					padding: 2,
				}
			: {
					borderBottomColor: colors.separator,
					borderBottomWidth: StyleSheet.hairlineWidth,
					flexDirection: 'row',
				},
		sheet: {
			backgroundColor: colors.surface,
			borderTopLeftRadius: radius.sheet,
			borderTopRightRadius: radius.sheet,
			overflow: 'hidden',
		},
		title: text(typography.title, colors.label),
	};
};

/** Flatten a `StyleProp` the way `StyleSheet.flatten` would. */
const flatten = function flatten(
	style: StyleProp<ViewStyle | TextStyle>
): ViewStyle & TextStyle {
	return (StyleSheet.flatten(style) ?? {}) as ViewStyle & TextStyle;
};

/**
 * Merge host overrides onto the base parts.
 *
 * Unknown keys are dropped, so a typo in a host map can't leak a style onto
 * an element nobody named.
 *
 * @param base - Parts for the theme.
 * @param styles - Host overrides.
 * @returns Parts with every override applied.
 */
export const mergeConsentParts = function mergeConsentParts(
	base: ConsentResolvedParts,
	styles: ConsentPartStyles | undefined
): ConsentResolvedParts {
	if (!styles) {
		return base;
	}

	const parts = { ...base };

	for (const [key, override] of Object.entries(styles)) {
		if (isConsentThemePart(key) && override) {
			parts[key as ConsentThemePart] = { ...base[key], ...flatten(override) };
		}
	}

	return parts;
};

/**
 * Resolve the theme and every part for the current platform and scheme.
 *
 * @param options - Host theme and part overrides.
 * @returns The theme, the parts, and the safe area.
 * @example
 * ```tsx
 * const { parts, theme } = useConsentStyles({
 *     theme: { colors: { primary: '#0A7C55' } },
 * });
 * ```
 */
export const useConsentStyles = function useConsentStyles(
	options: UseConsentStylesOptions = {}
): ConsentStyles {
	const systemScheme = useColorScheme();
	const safeArea = useConsentSafeArea();
	const { styles, theme: themeOptions } = options;

	const theme = useMemo(
		() =>
			createConsentTheme({
				...themeOptions,
				colorScheme:
					themeOptions?.colorScheme ?? resolveConsentColorScheme(systemScheme),
			}),
		[systemScheme, themeOptions]
	);
	const parts = useMemo(
		() => mergeConsentParts(createConsentParts(theme), styles),
		[styles, theme]
	);

	return useMemo(() => ({ parts, safeArea, theme }), [parts, safeArea, theme]);
};
