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
 * The web switch geometry: the small consent switch, a 28x16 fully rounded
 * track padded by 2 around a 10-point thumb.
 *
 * `packages/ui` ships a 32x20 switch too, and the consent surfaces ask the
 * primitive for `size="small"`, so the smaller box is the one a subject sees
 * next to a category row. Exported because the control has to draw the thumb
 * from the numbers the track was sized with, and a thumb that disagrees with its
 * own track is the exact kind of drift this package exists to stop.
 */
export const CONSENT_SWITCH_GEOMETRY = {
	height: 16,
	padding: 2,
	thumb: 10,
	width: 28,
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

/**
 * The branding tab's elevation: the web tag's `0 1px 2px rgb(15 23 42 / 0.12)`.
 *
 * The other half of the web shadow is `inset 0 1px 0 rgb(255 255 255 / 0.16)`,
 * which is the drop the tag carries on its own part below.
 */
const TAG_SHADOW = '0 1px 2px rgba(15, 23, 42, 0.12)';

/** The web card border: one hairline in the border token, on both surfaces. */
const HAIRLINE = 1;

/**
 * The banner footer's left and right inset: 20.
 *
 * `prompt.module.css` pads `.footer` `1rem 1.25rem`, so the band is 16 deep and
 * 20 in from the card edge, which is 4 wider than the header above it. The
 * measurement agrees: card border to button border is 46 image px at dsf 2.
 * 20 is not a step on the 4/8/16/24/32 scale, so it stays its own constant
 * rather than bending the scale, which every other rhythm reads from.
 */
export const BANNER_FOOTER_PADDING_HORIZONTAL = 20;

/**
 * A button's vertical padding: 10.
 *
 * `button.module.css` pads `0.625rem 1rem`. It only decides the height when the
 * label plus this padding beats `MIN_TAP_TARGET`, which on a phone it does not,
 * so a control still lands at 44 and the padding is what a large system font
 * grows the button from.
 */
const BUTTON_PADDING_VERTICAL = 10;

/**
 * The gap between two category cards: 12.
 *
 * `accordion.module.css` stacks `.item`s with `--accordion-stack-gap`, which is
 * `0.75rem`. The cards are separated rather than divided, so the gap belongs to
 * the list and not to a row, which is why it lives on the scroll content.
 */
const CATEGORY_STACK_GAP = 12;

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
		/**
		 * Which surface is asking, because the type roles differ.
		 *
		 * A banner reads `bannerTitle` over `bannerBody` and a sheet reads `title`
		 * over `body`. Defaults to a sheet, which is the pair the scale had before
		 * the banner roles existed.
		 */
		readonly presentation?: 'banner' | 'modal';
		readonly styles?: ConsentPartStyles;
		readonly theme?: ConsentTheme;
	} = {}
): ConsentStyles {
	const scheme = resolveConsentColorScheme(useColorScheme());
	const { fontScale, height } = useWindowDimensions();
	const safeArea = useConsentSafeArea();
	const { presentation = 'modal', styles, theme } = options;

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
		// The banner heading is larger than its copy and the sheet heading is
		// smaller than its, so the roles are picked here rather than in a part.
		const titleType =
			presentation === 'banner' ? typography.bannerTitle : typography.title;
		const bodyType =
			presentation === 'banner' ? typography.bannerBody : typography.body;
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
			// The "Secured by c15t" tab. Every measurement here is `.brandingTag`:
			// `min-height 1.75rem`, `padding .28125rem .625rem`, `gap .375rem`, and a
			// `0.6875rem` label at `line-height: 1`, which is why the line height is the
			// size rather than a step on the type scale. Which corners stay round, and
			// which edge loses its border, depends on the card it is welded to, so that
			// half lives with the tab.
			branding: {
				alignItems: 'center',
				backgroundColor: colors.primary,
				borderColor: colors.primaryBorder,
				borderRadius: radius.surface,
				// React Native cannot draw an inset shadow. At this size a 1px
				// translucent white top border reads the same as the web's
				// `inset 0 1px 0 rgb(255 255 255 / 0.16)`, so that is what stands in.
				borderTopColor: 'rgba(255, 255, 255, 0.16)',
				borderWidth: HAIRLINE,
				boxShadow: TAG_SHADOW,
				flexDirection: 'row',
				gap: 6,
				minHeight: 28,
				paddingBottom: 4.5,
				paddingHorizontal: 10,
				paddingTop: 4.5,
				// Above the card, so the card's own fill cannot paint over the 1px the
				// tab overlaps it by. The web rule carries the same value.
				zIndex: 2,
			},
			brandingLabel: {
				color: colors.onPrimary,
				fontSize: 11,
				lineHeight: 11,
			},
			caption: textStyle(typography.caption, colors.textMuted),
			captionLink: textStyle(typography.caption, colors.text),
			// `accordion.module.css` paints the description at `0.875rem` too, so a
			// category row and the banner body read from one small-copy role.
			categoryDescription: textStyle(typography.bannerBody, colors.textMuted),
			// One bordered card per category, not a divided list: `.item` is a 1px
			// border in the border token with `.triggerRow` padded by `space-sm`.
			// The radius is the accordion's own `radius-md`, which measures 8 rather
			// than the 12 a dialog card carries.
			categoryRow: {
				alignItems: 'center',
				backgroundColor: colors.surface,
				borderColor: colors.border,
				borderRadius: radius.control,
				borderWidth: HAIRLINE,
				flexDirection: 'row',
				gap: spacing.xs,
				padding: spacing.s,
			},
			// The web title sits at 14 too, and drops to the inherited weight:
			// `.trigger` asks for `--c15t-font-weight-regular`, which the token map
			// never emits, so the declaration is invalid and the row inherits 400.
			// The medium stays because the row keeps no disclosure icon to say "this
			// is the heading", which leaves weight as the one cue that is not colour.
			categoryTitle: textStyle(typography.label, colors.text),
			description: textStyle(bodyType, colors.textMuted),
			// The band, the rule above it, the padding, and the step between the
			// action rows are all facts about the presentation rather than the
			// theme. `ConsentSurfaceFooter` adds them under this part, so a host
			// override here still wins.
			footer: {
				alignItems: 'stretch',
				flexDirection: 'column',
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
				paddingVertical: BUTTON_PADDING_VERTICAL,
			},
			primaryLabel: {
				...textStyle(typography.label, colors.primary),
				textAlign: 'center',
			},
			row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.m },
			scroll: { flexGrow: 0, flexShrink: 1, paddingHorizontal: spacing.m },
			// The list of category cards. The separation lives here because the
			// stack gap belongs between the cards, where a row's own padding would
			// also put one above the footer.
			scrollContent: { gap: CATEGORY_STACK_GAP },
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
				paddingVertical: BUTTON_PADDING_VERTICAL,
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
			title: textStyle(titleType, colors.text),
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
	}, [
		bodyHeight,
		presentation,
		resolvedTheme,
		safeArea,
		scaled,
		scheme,
		styles,
	]);
};
