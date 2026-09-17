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

import { useConsentSafeArea } from '../../hooks/use-consent-safe-area';
import type { ConsentSafeArea } from '../../hooks/use-consent-safe-area';
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
	/** Height a scrollable body may reach inside the safe area before it scrolls. */
	readonly maxBodyHeight: number;
	/** The bands in force, and whether the host measured them. */
	readonly safeArea: ConsentSafeArea;
	/**
	 * The absolutely positioned layer a banner mounts in, with its bottom edge
	 * lifted out of the bottom band and its sides narrowed to the side bands.
	 */
	readonly bannerLayer: ViewStyle;
	/**
	 * The full-screen layer a modal sheet is pushed to the bottom of, inset on
	 * every band so the sheet's own chrome stays inside the safe area.
	 */
	readonly sheetLayer: ViewStyle;
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
	const safeArea = useConsentSafeArea();
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
	// The bands come off before the ratio is applied. A body sized against the
	// whole window is sized including the strip under the home indicator, and the
	// sheet that result pushes upward lands its own heading by the clock.
	const safeHeight = Math.max(0, height - safeArea.top - safeArea.bottom);
	// A surface that grows past the screen does not scroll, it hides its own
	// footer. Large text takes the larger bite out of the screen.
	const bodyHeight = Math.max(
		MIN_BODY_HEIGHT,
		Math.round(safeHeight * (scaled >= LARGE_TEXT_SCALE ? 0.34 : 0.46))
	);

	return useMemo(() => {
		const { colors, radius, spacing, typography } = resolvedTheme;
		const controlMinHeight = Math.max(
			MIN_TAP_TARGET,
			Math.round(typography.label.lineHeight * scaled)
		);

		// The gutter a floating banner keeps off the screen edge, and the gap a
		// bottom sheet keeps below itself. The bands are added outside both, so a
		// measurement moves the surface and never its internal rhythm.
		const gutter = spacing.l;

		// The band is not the clearance. A swipe up at a home indicator starts
		// inside the band and travels upward, so a control sitting just outside it
		// is still in the gesture's path. The layer reserves a full interaction row
		// past the band, which keeps the deepest control at least one control high
		// above it on every device. The floor is the same minimum the theme already
		// forces on a control, never a guess at one device's inset, so it behaves
		// the same on a notched iPhone, an iPad with a 20-point band, and a phone
		// that reports no band at all.
		const bottomGutter = Math.max(gutter, MIN_TAP_TARGET);

		const bannerLayer: ViewStyle = {
			bottom: safeArea.bottom,
			left: 0,
			paddingBottom: bottomGutter,
			paddingHorizontal: Math.max(gutter, safeArea.left, safeArea.right),
			position: 'absolute',
			right: 0,
		};

		// The sheet reaches the same floor by adding the band to its own bottom
		// padding, so a measured band moves the sheet without touching the gap
		// between its last control and its own rounded edge.
		const sheetLayer: ViewStyle = {
			flex: 1,
			justifyContent: 'flex-end',
			paddingBottom: spacing.xl + safeArea.bottom,
			paddingLeft: safeArea.left,
			paddingRight: safeArea.right,
			paddingTop: safeArea.top,
		};

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
			bannerLayer,
			controlMinHeight,
			fontScale: scaled,
			maxBodyHeight: bodyHeight,
			parts,
			safeArea,
			scheme,
			sheetLayer,
			theme: resolvedTheme,
		};
		// `bannerLayer` and `sheetLayer` are built inside: they move with
		// `safeArea`, `bodyHeight`, and the theme, which are all listed.
	}, [bodyHeight, resolvedTheme, safeArea, scaled, scheme, styles]);
};
