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
import type {
	ConsentColorScheme,
	ConsentTheme,
	ConsentTypeStyle,
} from './create-consent-theme';

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
 * The web switch geometry: a 32x20 fully rounded track, padded by 2, holding a
 * 12-point thumb that travels the rest of the width.
 *
 * Exported because the control has to draw the thumb from the numbers the track
 * was sized with, and a thumb that disagrees with its own track is the exact
 * kind of drift this package exists to stop.
 */
export const CONSENT_SWITCH_GEOMETRY = {
	height: 20,
	padding: 2,
	thumb: 12,
	width: 32,
} as const;

/**
 * The banner's elevation, which is the web `shadow-lg` token verbatim.
 *
 * `boxShadow` is the CSS-shaped style React Native reads on both platforms, so
 * the card carries the same offset, blur, and alpha as the web banner rather
 * than a platform guess. A host on a version that cannot read it loses the
 * shadow and nothing else.
 */
const BANNER_SHADOW = '0 8px 24px rgba(0, 0, 0, 0.12)';

/** The web card border: one hairline in the border token, on both surfaces. */
const HAIRLINE = 1;

/**
 * A text style, from a type token and a colour.
 *
 * A theme spells its weight `weight` because that is the shorter name in a type
 * scale a host writes by hand, and React Native only reads `fontWeight`. The two
 * names meet here, once, rather than in every part that carries text: spread the
 * token straight into a style and the weight is silently dropped, which leaves a
 * semibold heading and a medium button label rendering at 400.
 *
 * @param type - The type token to read.
 * @param color - Foreground the part draws with.
 * @returns A text style React Native applies.
 */
const textStyle = function textStyle(
	type: ConsentTypeStyle,
	color: string
): TextStyle {
	return {
		color,
		fontSize: type.fontSize,
		fontWeight: type.weight,
		lineHeight: type.lineHeight,
	};
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
		const gutter = spacing.m;

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

		// The sheet keeps its actions the same distance above the band as the
		// banner does, and the band is added outside the reserve rather than
		// swapped for it: a measured band moves the sheet, and the gap between the
		// deepest control and the sheet's own rounded edge stays with the footer.
		const sheetLayer: ViewStyle = {
			flex: 1,
			justifyContent: 'flex-end',
			paddingBottom: bottomGutter + safeArea.bottom,
			paddingLeft: safeArea.left,
			paddingRight: safeArea.right,
			paddingTop: safeArea.top,
		};

		const base: Record<string, ViewStyle & TextStyle> = {
			banner: {
				backgroundColor: colors.surface,
				borderColor: colors.border,
				borderRadius: radius.surface,
				borderWidth: HAIRLINE,
				boxShadow: BANNER_SHADOW,
				flexDirection: 'column',
				gap: spacing.m,
				overflow: 'hidden',
				paddingBottom: 0,
				paddingHorizontal: 0,
				paddingTop: spacing.m,
			},
			caption: textStyle(typography.caption, colors.textMuted),
			captionLink: textStyle(typography.caption, colors.text),
			categoryDescription: textStyle(typography.body, colors.textMuted),
			categoryRow: {
				alignItems: 'center',
				flexDirection: 'row',
				gap: spacing.m,
				paddingVertical: spacing.m,
			},
			categoryTitle: textStyle(typography.label, colors.text),
			description: textStyle(typography.body, colors.textMuted),
			// The band a footer sits on, and the step between its action rows, are
			// facts about the presentation. `ConsentSurfaceFooter` adds them under
			// this part, so a host override here still wins.
			footer: {
				alignItems: 'stretch',
				flexDirection: 'column',
				paddingHorizontal: spacing.m,
				paddingVertical: spacing.m,
			},
			handle: {
				alignSelf: 'center',
				backgroundColor: colors.border,
				borderRadius: radius.control,
				height: 4,
				width: 36,
			},
			header: { gap: spacing.s, paddingHorizontal: spacing.m },
			label: {
				...textStyle(typography.label, colors.primary),
				textAlign: 'center',
			},
			overlay: { backgroundColor: colors.overlay },
			primaryButton: {
				alignItems: 'center',
				backgroundColor: colors.surface,
				borderColor: colors.primary,
				borderRadius: radius.control,
				borderWidth: HAIRLINE,
				flexBasis: 0,
				flexGrow: 1,
				flexShrink: 1,
				justifyContent: 'center',
				minHeight: controlMinHeight,
				paddingHorizontal: spacing.m,
				paddingVertical: spacing.s,
			},
			primaryLabel: {
				...textStyle(typography.label, colors.primary),
				textAlign: 'center',
			},
			row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.m },
			scroll: { flexGrow: 0, flexShrink: 1, paddingHorizontal: spacing.m },
			secondaryButton: {
				alignItems: 'center',
				backgroundColor: colors.surface,
				borderColor: colors.border,
				borderRadius: radius.control,
				borderWidth: HAIRLINE,
				flexBasis: 0,
				flexGrow: 1,
				flexShrink: 1,
				justifyContent: 'center',
				minHeight: controlMinHeight,
				paddingHorizontal: spacing.m,
				paddingVertical: spacing.s,
			},
			secondaryLabel: {
				...textStyle(typography.label, colors.text),
				textAlign: 'center',
			},
			sheet: {
				backgroundColor: colors.surface,
				borderRadius: radius.surface,
				flexDirection: 'column',
				gap: spacing.m,
				overflow: 'hidden',
				paddingBottom: 0,
				paddingHorizontal: 0,
				paddingTop: spacing.m,
			},
			switch: {
				backgroundColor: colors.switchTrack,
				borderRadius: CONSENT_SWITCH_GEOMETRY.height / 2,
				height: CONSENT_SWITCH_GEOMETRY.height,
				justifyContent: 'center',
				padding: CONSENT_SWITCH_GEOMETRY.padding,
				width: CONSENT_SWITCH_GEOMETRY.width,
			},
			title: textStyle(typography.title, colors.text),
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
