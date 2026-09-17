/**
 * Turn a theme plus per-part overrides into the style objects a surface
 * renders with.
 *
 * This is the only place layout constants live. Everything scales off
 * `fontScale` rather than a fixed row height, because a control that keeps a
 * 44-point height while iOS renders 53-point text is a clipped button, not an
 * accessible one.
 */

import { useMemo } from 'react';
import { useColorScheme, useWindowDimensions } from 'react-native';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';

import { isConsentThemePart, MIN_TAP_TARGET } from './consent-theme-parts';
import type {
	ConsentPartStyles,
	ConsentResolvedParts,
} from './consent-theme-parts';
import {
	createConsentTheme,
	darkTheme,
	resolveConsentColorScheme,
} from './create-consent-theme';
import type { ConsentColorScheme, ConsentTheme } from './create-consent-theme';

/** What {@link useConsentStyles} hands a surface. */
export interface ConsentStyles {
	/** Effective font scale, clamped to what the layouts were sized for. */
	readonly fontScale: number;
	/** Smallest height a control may take at this font scale. */
	readonly controlMinHeight: number;
	/** Height a scrollable body may reach before it has to scroll. */
	readonly maxBodyHeight: number;
	/** Scheme the palette came from. */
	readonly scheme: ConsentColorScheme;
	/** Theme in force after the platform scheme and any host override. */
	readonly theme: ConsentTheme;
	/** Every restylable part, already merged with the host override. */
	readonly parts: ConsentResolvedParts;
}

/** Font scales beyond this stop being a layout the package can promise. */
const MAX_FONT_SCALE = 3.5;

/** At this scale and above, the body gives the surface more of its height. */
const LARGE_TEXT_SCALE = 1.6;

/** Below this, a body cannot hold a heading and one row at all. */
const MIN_BODY_HEIGHT = 148;

/** Flatten a `StyleProp` the way `StyleSheet.flatten` would, without the call. */
const flatten = function flatten(
	style: StyleProp<ViewStyle | TextStyle>
): Partial<ViewStyle & TextStyle> {
	if (style === null || style === undefined || style === false) {
		return {};
	}

	if (Array.isArray(style)) {
		return Object.assign(
			{},
			...style.map((entry) =>
				flatten(entry as StyleProp<ViewStyle | TextStyle>)
			)
		);
	}

	return style as Partial<ViewStyle & TextStyle>;
};

/**
 * Resolve the styles for one render.
 *
 * @param options - Host choices.
 * @param options.theme - Theme to use instead of the platform scheme.
 * @param options.styles - Per-part overrides.
 * @returns Styles plus the scale facts a layout needs.
 */
export const useConsentStyles = function useConsentStyles(
	options: {
		readonly styles?: ConsentPartStyles;
		readonly theme?: ConsentTheme;
	} = {}
): ConsentStyles {
	const scheme = resolveConsentColorScheme(useColorScheme());
	const { fontScale, height } = useWindowDimensions();
	const { styles, theme } = options;

	// A host theme is used exactly as given, including its colors: overriding
	// only the palette would make `createConsentTheme` surprising. Built in a
	// memo because a fresh object per render would invalidate every style memo
	// downstream of it.
	const builtTheme = useMemo(
		() => (scheme === 'dark' ? darkTheme : createConsentTheme()),
		[scheme]
	);
	const resolvedTheme = theme ?? builtTheme;

	const scaled = Math.min(Math.max(fontScale, 1), MAX_FONT_SCALE);
	// A surface that grows past the screen does not scroll, it hides its own
	// footer. Large text takes the larger bite out of the screen.
	const bodyHeight = Math.max(
		MIN_BODY_HEIGHT,
		Math.round(height * (scaled >= LARGE_TEXT_SCALE ? 0.34 : 0.46))
	);

	return useMemo(() => {
		const { colors, radius, spacing, typography } = resolvedTheme;
		const controlMinHeight = Math.max(
			MIN_TAP_TARGET,
			Math.round(typography.label.lineHeight * scaled)
		);

		const base: Record<string, ViewStyle & TextStyle> = {
			banner: {
				backgroundColor: colors.surface,
				borderRadius: radius.surface,
				gap: spacing.m,
				padding: spacing.l,
			},
			caption: { ...typography.caption, color: colors.textMuted },
			captionLink: { ...typography.caption, color: colors.text },
			categoryDescription: { ...typography.body, color: colors.textMuted },
			categoryRow: {
				alignItems: 'center',
				flexDirection: 'row',
				gap: spacing.m,
				paddingVertical: spacing.m,
			},
			categoryTitle: { ...typography.label, color: colors.text },
			description: { ...typography.body, color: colors.textMuted },
			footer: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s },
			handle: {
				alignSelf: 'center',
				backgroundColor: colors.border,
				borderRadius: radius.control,
				height: 4,
				width: 36,
			},
			header: { gap: spacing.xs },
			label: {
				...typography.label,
				color: colors.onPrimary,
				textAlign: 'center',
			},
			overlay: { backgroundColor: colors.overlay },
			primaryButton: {
				alignItems: 'center',
				backgroundColor: colors.primary,
				borderRadius: radius.control,
				flexBasis: '100%',
				justifyContent: 'center',
				minHeight: controlMinHeight,
				paddingHorizontal: spacing.l,
				paddingVertical: spacing.m,
			},
			primaryLabel: { ...typography.label, color: colors.onPrimary },
			row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s },
			scroll: { flexGrow: 0, flexShrink: 1 },
			secondaryButton: {
				alignItems: 'center',
				backgroundColor: colors.secondary,
				borderRadius: radius.control,
				flexGrow: 1,
				flexShrink: 1,
				justifyContent: 'center',
				minHeight: controlMinHeight,
				paddingHorizontal: spacing.l,
				paddingVertical: spacing.m,
			},
			secondaryLabel: { ...typography.label, color: colors.onSecondary },
			sheet: {
				backgroundColor: colors.surface,
				borderRadius: radius.surface,
				gap: spacing.l,
				paddingBottom: spacing.xl,
				paddingHorizontal: spacing.l,
				paddingTop: spacing.l,
			},
			switch: { minHeight: controlMinHeight },
			title: { ...typography.title, color: colors.text },
		};

		const parts = { ...base } as ConsentResolvedParts;

		for (const [key, override] of Object.entries(styles ?? {})) {
			if (!isConsentThemePart(key)) {
				continue;
			}

			parts[key] = { ...base[key], ...flatten(override) };
		}

		return {
			controlMinHeight,
			fontScale: scaled,
			maxBodyHeight: bodyHeight,
			parts,
			scheme,
			theme: resolvedTheme,
		};
	}, [bodyHeight, resolvedTheme, scaled, scheme, styles]);
};
