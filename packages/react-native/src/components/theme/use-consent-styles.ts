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
import { I18nManager, useColorScheme, useWindowDimensions } from 'react-native';
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
	/**
	 * The height a control's touch area may not fall below at this font scale.
	 *
	 * Reported rather than applied: a built-in control draws the web's 35.5 and
	 * reaches the touch floor through its hit area, so this is the number a host
	 * sizing its own control should clear, not a `minHeight` to put on one.
	 */
	readonly controlMinHeight: number;
	/** Height a scrollable body may reach inside the safe area before it scrolls. */
	readonly maxBodyHeight: number;
	/**
	 * How far a drawer sits off screen while closed, signed along the X axis.
	 *
	 * A drawer arrives from the trailing edge, and the trailing edge is the right
	 * hand one only in a left-to-right layout. Travel is therefore the whole
	 * window width, negated when the layout is right-to-left, so the page starts
	 * exactly one screen off on whichever side the reader's thumb is waiting on.
	 *
	 * It is the window and not the safe width because the card slides over the
	 * notch rather than stopping short of it: a travel measured to the band would
	 * leave a sliver of the page visible down one edge while it was shut.
	 */
	readonly drawerTravel: number;
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

/**
 * The height of the "Secured by c15t" tab, which shares the wrapper a card is
 * mounted in rather than the card itself.
 *
 * `min-height: 1.75rem` on `.brandingTag`. It has to come off the height a card
 * is allowed, or the wrapper the two share is taller than the overlay that
 * centres it and the card is pushed off the top of the screen.
 */
const BRANDING_TAG_HEIGHT = 28;

/** The grab handle above a bottom sheet, from the `handle` part. */
const SHEET_HANDLE_HEIGHT = 4;

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
 * The box a consent switch draws itself at.
 *
 * Structural rather than `typeof {@link CONSENT_SWITCH_GEOMETRY}`, because the
 * disclosure asks for a second size: a plain quadruple of numbers is what lets
 * one primitive serve the consent dialog's 28x16 and the IAB row's 32x20 without
 * a union of two literals at every call site.
 */
export interface ConsentSwitchGeometry {
	/** Track height. */
	readonly height: number;
	/** Inset between the track's edge and the thumb. */
	readonly padding: number;
	/** Thumb diameter. */
	readonly thumb: number;
	/** Track width. */
	readonly width: number;
}

/**
 * The larger of the two switches `packages/ui` ships: a 32x20 fully rounded
 * track, padded by 2 around a 12-point thumb.
 *
 * The IAB disclosure asks the primitive for its default size and the consent
 * dialog asks for `size="small"`, so the two surfaces really do carry different
 * controls. Measured on the live panel at a 411 CSS px viewport: the track box is
 * 32 x 20 with `padding: 2px` and `border-radius: 9999px`, and the thumb inside
 * it is 12 x 12.
 */
export const CONSENT_IAB_SWITCH_GEOMETRY = {
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
 * The web `--c15t-shadow-sm`: `0 1px 2px 0 rgb(0 0 0 / 0.05)`.
 *
 * It is the whole elevation budget of the light surfaces. A dialog card carries
 * it, and so does every consent action, which is why a button reads as a raised
 * outline rather than a flat stroke; the banner is the one element with a lift of
 * its own.
 */
const SHADOW_SM = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';

/**
 * The branding tab's vertical padding: 5.
 *
 * `.brandingTag` asks for `0.28125rem`, and the `max-width: 480px` query every
 * phone matches restates it as `0.3125rem`. React Native only ever renders the
 * phone case, so it takes the query's value, which is what the live banner at 402
 * wide measures.
 */
const TAG_PADDING_VERTICAL = 5;

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
 * A button's padding: 8 vertical, 12 horizontal.
 *
 * `button.module.css` pads `0.5rem 0.75rem`. Together with a 17.5 line height and
 * two hairlines that is the 35.5 a web action measures, which is less than
 * `MIN_TAP_TARGET` on purpose: the 44 is a touch requirement, so it belongs on the
 * control's hit area and not on the box that gets drawn.
 */
const BUTTON_PADDING_VERTICAL = 8;

/** The horizontal half of that padding. */
const BUTTON_PADDING_HORIZONTAL = 12;

/**
 * The tracking each text role carries, in `em`.
 *
 * Web writes `letter-spacing` in `em` and React Native only takes an absolute
 * length, so `track` multiplies the figure by the size the same rule draws it at:
 * `-0.011em` on a 16pt banner heading is `-0.176`, `-0.025em` on the 14pt dialog
 * heading is `-0.35`. The product is taken per render rather than written out as
 * a literal so a host that scales its type keeps the same relative squeeze.
 *
 * A role missing from this table is tracked at nothing, which is also a measured
 * choice. `.trigger` and `.content` in the consent accordion both say
 * `letter-spacing: inherit` under a card that never sets it, and the dialog's own
 * `.description` declares none, so a category row and the dialog's supporting copy
 * run at the platform default. Only the banner's small copy declares `-0.006em` of
 * its own, and it belongs to the banner alone.
 */
const TRACKING_EM = {
	bannerBody: -0.006,
	bannerTitle: -0.011,
	brandingLabel: 0.01,
	brandingWordmark: -0.03,
	dialogTitle: -0.025,
} as const;

/**
 * The heading and supporting line of an IAB disclosure, in points.
 *
 * `--iab-cd-title-font-size` is `1.125rem` at semibold over `line-height: 1.25`,
 * which is 18 over 22.5, and `--iab-cd-description-font-size` is `0.75rem` over
 * `--iab-cd-description-line-height`, the `line-height-normal` token, so 12 over
 * 18. Neither is on this package's type scale: the scale carries the banner and
 * the consent dialog, and `iab-panel.module.css` declares its own pair. They are
 * spelled as constants here rather than added to `ConsentThemeTypography` because
 * they belong to one surface, the same reason the branding tab's 11 and 10 are
 * not on the scale either.
 *
 * The heading carries no tracking. `.title` in that sheet sets a size, a weight,
 * and a line height, and stops there, so this is one of the roles `TRACKING_EM`
 * deliberately has no entry for.
 */
const IAB_TITLE = { fontSize: 18, lineHeight: 22.5, weight: '600' } as const;

/** The supporting line under {@link IAB_TITLE}. */
const IAB_DESCRIPTION = {
	fontSize: 12,
	lineHeight: 18,
	weight: '400',
} as const;

/**
 * The rows of an IAB disclosure, in points, one entry per web class.
 *
 * Each figure is the sub-`768px` rule in `iab-panel.module.css`, which is the
 * only one a phone matches:
 *
 * - `tabHeight` / `tabFontSize`: `.tabButton` is `height: 2rem` with
 *   `font-size: .8125rem` at weight 500 and `padding: 0 .75rem`.
 * - `tabListPadding` / `tabListGap`: `.tabsList` pads `.25rem` and gaps
 *   `.25rem`, on `--c15t-radius-lg`.
 * - `rowHeaderPadding` / `rowHeaderGap`: `.purposeHeader` is `padding: .75rem`
 *   with `gap: .75rem`.
 * - `rowTitleSize`: `.purposeName` and `.vendorListName` are both `.875rem` at
 *   weight 500.
 * - `rowMetaSize`: `.purposeMeta`, `.stackMeta`, and `.vendorListMetaText` are
 *   all `.75rem` in the muted tone.
 * - `rowDescriptionSize` / `rowDescriptionLineHeight`: `.purposeDescription` is
 *   `.75rem` over `line-height: 1.5`.
 * - `listGap`: `.purposeItem` and `.stackItem` separate by
 *   `margin-bottom: .5rem`. The vendors list separates its rows by `.375rem`,
 *   which is 6, and the drawer renders 8 there: one part carries the gap, and 8
 *   is the row pitch the purposes tab is graded on. The 2pt is recorded rather
 *   than hidden.
 */
const IAB_ROWS = {
	listGap: 8,
	rowDescriptionLineHeight: 18,
	rowDescriptionSize: 12,
	rowHeaderGap: 12,
	rowHeaderPadding: 12,
	rowMetaSize: 12,
	rowTitleSize: 14,
	tabFontSize: 13,
	tabHeight: 32,
	tabListGap: 4,
	tabListPadding: 4,
} as const;

/**
 * The padding of each band of an IAB disclosure.
 *
 * The header and the footer both say `.75rem 1rem` -- 12 above and below, 16 in
 * from the card edge -- and the scrolling content says `.75rem` on all four
 * sides. The tabs sit between the header and the content with
 * `.75rem .75rem 0 .75rem`, so they lean on the content's own 12 below them
 * rather than declaring a bottom of their own.
 *
 * `footerGap` is the step between the two action rows. `.actionRoot` is `gap:
 * 1rem`, which is 16 and not the 8 the banner and the dialog footers use --
 * those two carry `[data-split]`, which is what drops the web's own step to
 * `.5rem`, and the disclosure has no such attribute. Measured row to row: 16.0.
 */
export const IAB_BANDS = {
	contentPadding: 12,
	footerGap: 16,
	footerPaddingHorizontal: 16,
	footerPaddingVertical: 12,
	headerPaddingHorizontal: 16,
	headerPaddingVertical: 12,
	tabPaddingBottom: 0,
	tabPaddingHorizontal: 12,
	tabPaddingTop: 12,
} as const;

/**
 * The gap between two category cards: 12.
 *
 * `accordion.module.css` stacks `.item`s with `--accordion-stack-gap`, which is
 * `0.75rem`. The cards are separated rather than divided, so the gap belongs to
 * the list and not to a row, which is why it lives on the scroll content.
 */
const CATEGORY_STACK_GAP = 12;

/**
 * How wide a dialog card may get: 448.
 *
 * `--consent-dialog-max-width` is `28rem`, and the card is `min(100%, that)`, so
 * on a phone the 16pt gutter decides the width and this only bites on a tablet or
 * a fold, where an unbounded card would stretch a two-line label across a hand.
 */
const DIALOG_MAX_WIDTH = 448;

/**
 * The disclosure glyph: a 20pt box holding a plus whose arms are 11.67 long and
 * 1.67 thick.
 *
 * `.arrow` is `--accordion-icon-size`, `1.25rem`. The arms come from lucide's
 * `plus` (`M5 12h14M12 5v14`), whose strokes run 14 units of a 24 unit view box
 * at 2 units wide, scaled into that box. Exported because React Native has no SVG
 * renderer, so the row draws the glyph from two bars and the second one needs the
 * same numbers as the first: a plus whose arms disagree is a plus with a stub.
 *
 * The vertical arm disappears when the row opens, which is what turns the plus
 * into the minus web shows for an open category.
 */
export const CONSENT_DISCLOSURE_GEOMETRY = {
	arm: (14 / 24) * 20,
	box: 20,
	stroke: (2 / 24) * 20,
} as const;

/**
 * The same glyph one size down, for the rows of an IAB disclosure.
 *
 * `.purposeArrow` and the vendor row's chevron are both `1rem` rather than the
 * accordion's `1.25rem`, so the plus a disclosure row carries is 16 on the same
 * lucide ratio: 9.33 of arm and 1.33 of stroke.
 */
export const CONSENT_IAB_DISCLOSURE_GEOMETRY = {
	arm: (14 / 24) * 16,
	box: 16,
	stroke: (2 / 24) * 16,
} as const;

/**
 * The floor the web puts under a collapsed row's content: 24.
 *
 * `.trigger` asks for `min-height: calc(var(--accordion-icon-size) + 0.25rem)`,
 * the disclosure's 20 plus a quarter rem, and that is a floor on the web's
 * *content* box: the row's own 8 of padding sits outside it. So a collapsed card
 * is 8 + 24 + 8 plus the card's two hairlines, which is the 42 the live accordion
 * measures, and the 44 a fingertip wants is nowhere in that arithmetic.
 *
 * React Native reads `minHeight` as the border box, so this number cannot go
 * straight onto the part. Write 24 there and the padding is spent out of the
 * floor, the row draws 36, and the disclosure is the thing that loses.
 * `categoryTriggerHeight` adds the padding back so both platforms draw one card.
 */
const CATEGORY_TRIGGER_CONTENT_FLOOR = CONSENT_DISCLOSURE_GEOMETRY.box + 4;

/**
 * The line the revealed description sits on: 21.
 *
 * `.content` is `0.875rem` over `line-height: 1.5`, which is the dialog's normal
 * leading rather than the banner copy's `1.25rem`. It is spelled here because the
 * small-copy token it otherwise reads from is the banner body's, and that one is
 * measured against `prompt.module.css` at 20.
 */
const CATEGORY_CONTENT_LINE_HEIGHT = 21;

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
 * @param trackingEm - `letter-spacing` in `em`, omitted where the web declares none.
 * @returns A text style React Native applies.
 */
const textStyle = function textStyle(
	type: ConsentTypeStyle,
	color: string,
	trackingEm?: number
): TextStyle {
	return {
		color,
		fontSize: type.fontSize,
		fontWeight: type.weight,
		...(trackingEm === undefined
			? null
			: { letterSpacing: Number((trackingEm * type.fontSize).toFixed(4)) }),
		lineHeight: type.lineHeight,
	};
};

/** The four surfaces a host can ask for, as the `presentation` option takes them. */
type SurfacePresentation = 'banner' | 'dialog' | 'drawer' | 'sheet';

/**
 * How a presentation sits in its layer, in the facts that depend on neither a
 * theme, a window, nor a safe-area band.
 *
 * A table rather than a ternary at each fact. The builder below is the largest
 * function in the package, and a surface choice read out of one of these costs it
 * nothing, where eighteen conditionals spread over its card, bands, and footer
 * push it past the branch budget the lint holds it to. The four entries are the
 * whole difference between the surfaces; a fifth row is the whole of adding one.
 */
interface SurfaceLayout {
	/** How the card is held across the layer's cross axis. */
	readonly alignItems: ViewStyle['alignItems'];
	/** Whether the card is set down in the middle of its overlay. */
	readonly centered: boolean;
	/** The arrow a row of this surface opens with. */
	readonly disclosureGeometry: Readonly<{
		arm: number;
		box: number;
		stroke: number;
	}>;
	/** Steps of `gutter` the overlay spends over the card, above and below. */
	readonly gutterSteps: number;
	/** Whether a grab handle has to come off the card's height allowance. */
	readonly handled: boolean;
	/** How the card is placed along the layer's main axis. */
	readonly justifyContent: ViewStyle['justifyContent'];
	/** Whether the surface is the page rather than a card set down on one. */
	readonly page: boolean;
	/** The track this surface's rows switch with. */
	readonly switchGeometry: Readonly<{
		height: number;
		padding: number;
		thumb: number;
		width: number;
	}>;
	/** Whether a branding tag shares the wrapper and has to come off too. */
	readonly tagged: boolean;
}

/** One entry per {@link SurfacePresentation}. */
const SURFACE_LAYOUTS: Record<SurfacePresentation, SurfaceLayout> = {
	banner: {
		alignItems: undefined,
		centered: false,
		disclosureGeometry: CONSENT_DISCLOSURE_GEOMETRY,
		gutterSteps: 1,
		handled: false,
		justifyContent: 'flex-end',
		page: false,
		switchGeometry: CONSENT_SWITCH_GEOMETRY,
		tagged: true,
	},
	dialog: {
		alignItems: 'center',
		centered: true,
		disclosureGeometry: CONSENT_DISCLOSURE_GEOMETRY,
		gutterSteps: 2,
		handled: false,
		justifyContent: 'center',
		page: false,
		switchGeometry: CONSENT_SWITCH_GEOMETRY,
		tagged: true,
	},
	drawer: {
		// Stretched over the layer instead of parked at an edge of it, so the layer's
		// only job is the bands: the page's heading has to sit below the clock and
		// its footer above the home indicator. There is no gutter, because a page has
		// no screen edge to keep off -- the inset the web card buys with
		// `padding: 16` on `.root` is paid here by the page filling the viewport,
		// which is what the graded geometry compares.
		alignItems: 'stretch',
		centered: false,
		disclosureGeometry: CONSENT_IAB_DISCLOSURE_GEOMETRY,
		gutterSteps: 0,
		handled: false,
		justifyContent: 'flex-start',
		page: true,
		switchGeometry: CONSENT_IAB_SWITCH_GEOMETRY,
		tagged: false,
	},
	sheet: {
		alignItems: undefined,
		centered: false,
		disclosureGeometry: CONSENT_DISCLOSURE_GEOMETRY,
		gutterSteps: 1,
		handled: true,
		justifyContent: 'flex-end',
		page: false,
		switchGeometry: CONSENT_SWITCH_GEOMETRY,
		tagged: true,
	},
};

/**
 * What the parts disagree on between the presentations.
 *
 * The other half of {@link SURFACE_LAYOUTS}: that table holds the facts a
 * placement needs and can settle at module scope, this one holds the numbers a
 * part draws with, which cannot settle there because most of them are a theme
 * token. The builder reads the row for the presentation it is building. Written
 * as four rows rather than a ternary at each part for the branch budget
 * {@link SurfaceLayout} gives: eighteen of them spread over the card, the bands,
 * and the type roles is what put this file over the limit.
 */
interface SurfacePartFacts {
	/** Tracking of the copy under a heading, or none. */
	readonly bodyTracking: number | undefined;
	/** The type role of the copy under a heading. */
	readonly bodyType: ConsentTypeStyle;
	/** The card's own border. Only the dialog has one: a sheet and a page run to the screen edges. */
	readonly cardBorderWidth: number;
	/** The card's `flex`, which a page needs because it is the whole layer. */
	readonly cardFlex: ViewStyle['flex'];
	/** How wide the card may get, which the page and the sheet leave unbounded. */
	readonly cardMaxWidth: ViewStyle['maxWidth'];
	/** The inset each band of the card keeps from its own edge. */
	readonly cardPadding: number;
	/** The card's corner radius. A page has none, or the dimmed app shows through four round notches. */
	readonly cardRadius: number;
	/** The card's elevation, which only the dialog carries. */
	readonly cardShadow: ViewStyle['boxShadow'];
	/** Space the scrolling body keeps above its first row. */
	readonly contentPaddingTop: number;
	/** Step between the heading and the copy under it. */
	readonly headerGap: number;
	/** Sideways inset of the heading band, which the disclosure pads itself. */
	readonly headerPaddingHorizontal: number;
	/** Vertical inset of the heading band, on the same two edges. */
	readonly headerPaddingVertical: number;
	/** The rule under the heading band. `.header` in the disclosure is the only one that draws it. */
	readonly headerRuleWidth: number;
	/** Step between the rows of a list. */
	readonly listGap: number;
	/** Tracking of the heading, which the disclosure leaves at zero. */
	readonly titleTracking: number | undefined;
	/** The type role of the heading. */
	readonly titleType: ConsentTypeStyle;
}

/**
 * The tallest a card may stand, in the room the overlay leaves it.
 *
 * The overlay centres what it is given, so a card that resolves taller than the
 * space between the gutters is not clipped, it is pushed up: measured on a
 * 411x914 device, a card whose only bound was its content came back 1090 tall and
 * painted its heading over the status bar clock. A cap is also what the web card
 * has -- 370x499 inside an 872 viewport, with the list scrolling under a header
 * and a footer that stay put -- and the tag the card shares its wrapper with has
 * to come off the allowance, or the wrapper overflows by exactly those 28. A page
 * takes everything between the two bands: no gutter above or below, no tag to find
 * room for, and no handle.
 *
 * @param layout - Presentation being built.
 * @param safeHeight - Window height less both bands.
 * @param gutter - The overlay's own inset, in points.
 * @returns A `maxHeight` no card can resolve taller than.
 */
const cardMaxHeightFor = function cardMaxHeightFor(
	layout: SurfaceLayout,
	safeHeight: number,
	gutter: number
): number {
	return Math.max(
		MIN_BODY_HEIGHT,
		safeHeight -
			layout.gutterSteps * gutter -
			(layout.tagged ? BRANDING_TAG_HEIGHT : 0) -
			(layout.handled ? SHEET_HANDLE_HEIGHT : 0)
	);
};

/**
 * The layer a sheet, dialog, or page is centred in.
 *
 * A sheet keeps its actions the same distance above the band as the banner does,
 * and the band is added outside the gutter rather than swapped for it: a measured
 * band moves the sheet, and the gap between the deepest control and the sheet's
 * own rounded edge stays with the footer. A dialog is the same card set down in the
 * middle of the overlay rather than pushed to its bottom edge, which is what the
 * web root does -- pad 16 all round and centre -- and a notch is against that
 * gutter rather than added to it, because a card 448 wide at most has no reason to
 * slide under one.
 *
 * @param layout - Presentation being built.
 * @param insets - The gutters and the bands in force.
 * @returns A style for the layer under the card.
 */
const sheetLayerFor = function sheetLayerFor(
	layout: SurfaceLayout,
	insets: {
		bottomGutter: number;
		gutter: number;
		safeArea: ConsentSafeArea;
		sideGutter: number;
	}
): ViewStyle {
	return {
		alignItems: layout.alignItems,
		flex: 1,
		justifyContent: layout.justifyContent,
		paddingBottom:
			(layout.page ? 0 : insets.bottomGutter) + insets.safeArea.bottom,
		paddingLeft: layout.centered ? insets.sideGutter : insets.safeArea.left,
		paddingRight: layout.centered ? insets.sideGutter : insets.safeArea.right,
		paddingTop: (layout.centered ? insets.gutter : 0) + insets.safeArea.top,
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
		 * Which surface is asking, because both the type roles and the rhythm differ.
		 *
		 * A banner reads `bannerTitle` over `bannerBody`; a dialog and a bottom sheet
		 * both read `title` over `body`, and differ from each other only in how the
		 * card is anchored and padded. Defaults to the dialog, which is the shape the
		 * web surface has.
		 */
		/**
		 * `drawer` is the fourth: a card that fills the screen and slides in along
		 * the trailing edge, which is what the IAB disclosure is on a phone and the
		 * reason this one is not a centred dialog. It keeps the same card, the same
		 * bands, and the same footer, and drops the border, the corner radius, the
		 * width cap, and the 16pt gutter, because a page has no edge to keep off.
		 */
		readonly presentation?: 'banner' | 'dialog' | 'drawer' | 'sheet';
		readonly styles?: ConsentPartStyles;
		readonly theme?: ConsentTheme;
	} = {}
): ConsentStyles {
	const scheme = resolveConsentColorScheme(useColorScheme());
	const { fontScale, height, width } = useWindowDimensions();
	const safeArea = useConsentSafeArea();
	const { presentation = 'dialog', styles, theme } = options;

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
		const layout = SURFACE_LAYOUTS[presentation];
		// The banner heading is larger than its copy, the sheet heading is smaller
		// than its, and the disclosure brings a third pairing, so the roles -- and
		// every other number the parts disagree on -- are read out of one row of this
		// table rather than decided at each part. The theme tokens are read here, so a
		// host theme still decides them; only the disagreement between surfaces is
		// fixed by the row. See {@link SurfacePartFacts}.
		const facts: SurfacePartFacts = {
			banner: {
				bodyTracking: TRACKING_EM.bannerBody,
				bodyType: typography.bannerBody,
				cardBorderWidth: 0,
				cardFlex: undefined,
				cardMaxWidth: undefined,
				cardPadding: spacing.m,
				cardRadius: radius.surface,
				cardShadow: undefined,
				contentPaddingTop: 0,
				headerGap: spacing.s,
				headerPaddingHorizontal: spacing.m,
				headerPaddingVertical: spacing.m,
				headerRuleWidth: 0,
				listGap: CATEGORY_STACK_GAP,
				titleTracking: TRACKING_EM.bannerTitle,
				titleType: typography.bannerTitle,
			},
			dialog: {
				bodyTracking: undefined,
				bodyType: typography.body,
				cardBorderWidth: HAIRLINE,
				cardFlex: undefined,
				cardMaxWidth: DIALOG_MAX_WIDTH,
				cardPadding: spacing.l,
				cardRadius: radius.surface,
				cardShadow: SHADOW_SM,
				contentPaddingTop: 0,
				headerGap: spacing.xs,
				headerPaddingHorizontal: spacing.l,
				headerPaddingVertical: spacing.l,
				headerRuleWidth: 0,
				listGap: CATEGORY_STACK_GAP,
				titleTracking: TRACKING_EM.dialogTitle,
				titleType: typography.title,
			},
			drawer: {
				bodyTracking: undefined,
				bodyType: IAB_DESCRIPTION,
				cardBorderWidth: 0,
				cardFlex: 1,
				cardMaxWidth: undefined,
				cardPadding: IAB_BANDS.contentPadding,
				cardRadius: 0,
				cardShadow: undefined,
				contentPaddingTop: IAB_BANDS.contentPadding,
				headerGap: spacing.xs,
				headerPaddingHorizontal: IAB_BANDS.headerPaddingHorizontal,
				headerPaddingVertical: IAB_BANDS.headerPaddingVertical,
				headerRuleWidth: HAIRLINE,
				// The disclosure separates its rows by `.5rem`, and the run under the
				// last row is the scrolling body's own 12 rather than the 24 the cards
				// put under their last one.
				listGap: IAB_ROWS.listGap,
				titleTracking: undefined,
				titleType: IAB_TITLE,
			},
			sheet: {
				bodyTracking: undefined,
				bodyType: typography.body,
				cardBorderWidth: 0,
				cardFlex: undefined,
				cardMaxWidth: undefined,
				cardPadding: spacing.m,
				cardRadius: radius.surface,
				cardShadow: undefined,
				contentPaddingTop: 0,
				headerGap: spacing.xs,
				headerPaddingHorizontal: spacing.m,
				headerPaddingVertical: spacing.m,
				headerRuleWidth: 0,
				listGap: CATEGORY_STACK_GAP,
				titleTracking: TRACKING_EM.dialogTitle,
				titleType: typography.title,
			},
		}[presentation];
		// The height a control's touch area may not fall below once the platform has
		// scaled its text. The drawn box is the web's 8 + 17.5 + 8 plus two hairlines
		// at scale 1, which is under the touch floor, so the floor decides there; past
		// about 1.5x the box passes the floor on its own and reports its own height.
		const controlMinHeight = Math.max(
			MIN_TAP_TARGET,
			Math.round(
				BUTTON_PADDING_VERTICAL * 2 +
					typography.label.lineHeight * scaled +
					HAIRLINE * 2
			)
		);
		// What a collapsed trigger row draws, already carrying its own padding: at
		// scale 1 the web's 24 floor wins and the row is 40, which with the card's
		// hairlines is the 42 the web accordion measures. Past about 1.4x the
		// label's line box passes that floor, and the row grows with the text rather
		// than clipping it. The 44 a fingertip needs never enters here: it belongs on
		// the row's hit area, which is what `hitSlopFor` in the row reaches.
		const categoryTriggerHeight =
			Math.ceil(
				Math.max(
					CATEGORY_TRIGGER_CONTENT_FLOOR,
					typography.label.lineHeight * scaled
				)
			) +
			spacing.s * 2;

		// The gutter a floating banner keeps off the screen edge, and the gap a
		// bottom sheet keeps below itself. The bands are added outside both, so a
		// measurement moves the surface and never its internal rhythm.
		const gutter = spacing.m;

		// The card sits the gutter clear of the band, which is what the web does at
		// the viewport edge: its banner root pads 16 and the card measures 16 from
		// the bottom of an 872 viewport. Reserving a whole control height on top of
		// the gutter, as this did, put the card 88 above the bottom of the screen
		// and left it floating in the middle of the display.
		const bottomGutter = gutter;

		// The disclosure asks the switch primitive for its default size and the
		// consent dialog asks for the small one, so the track this part draws depends
		// on which surface is being built. The control's thumb reads the matching
		// constant rather than assuming the dialog's.
		// The glyph that opens a row moves with the switch: the disclosure's own
		// arrows are `1rem`, a sixth smaller than the accordion's `1.25rem`.
		const { disclosureGeometry, switchGeometry } = layout;

		// The tallest a card may stand. The overlay centres what it is given, so a
		// card that resolves taller than the space between the gutters is not
		// clipped, it is pushed up: measured on a 411x914 device, a card whose only
		// bound was its content came back 1090 tall and painted its heading over the
		// status bar clock. A cap is also what the web card has -- 370x499 inside an
		// 872 viewport, with the list scrolling under a header and a footer that stay
		// put -- and the tab the card shares its wrapper with has to come off the
		// allowance, or the wrapper overflows by exactly those 28.
		const cardMaxHeight = cardMaxHeightFor(layout, safeHeight, gutter);

		const bannerLayer: ViewStyle = {
			bottom: safeArea.bottom,
			left: 0,
			paddingBottom: bottomGutter,
			paddingHorizontal: Math.max(gutter, safeArea.left, safeArea.right),
			position: 'absolute',
			right: 0,
		};

		// How far a floating card has to keep clear of the notch on the sideways
		// axis. `sheetLayerFor` spends it on the dialog alone, and reads the bands
		// off the same safe area.
		const sideGutter = Math.max(gutter, safeArea.left, safeArea.right);

		const sheetLayer = sheetLayerFor(layout, {
			bottomGutter,
			gutter,
			safeArea,
			sideGutter,
		});

		const base: Record<string, ViewStyle & TextStyle> = {
			banner: {
				backgroundColor: colors.surface,
				borderColor: colors.border,
				borderRadius: radius.surface,
				borderWidth: HAIRLINE,
				boxShadow: BANNER_SHADOW,
				flexDirection: 'column',
				overflow: 'hidden',
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
				minHeight: BRANDING_TAG_HEIGHT,
				paddingBottom: TAG_PADDING_VERTICAL,
				paddingHorizontal: 10,
				paddingTop: TAG_PADDING_VERTICAL,
				// Above the card, so the card's own fill cannot paint over the 1px the
				// tab overlaps it by. The web rule carries the same value.
				zIndex: 2,
			},
			// The two runs of the tag are not the same size, which is the only reason
			// they are two parts. Both ask for `--consent-dialog-branding-label-size`,
			// 11pt, but the `max-width: 480px` query every phone matches restates
			// `.brandingWordmarkLabel` as `0.625rem`, and it wins on specificity: it
			// carries the same `:not(.headless)` as the rule it displaces and comes
			// later. Its own sibling `.brandingCopy` is spelled without the `:not()`
			// in that query, so it loses, and stays at 11. The live banner at 411 wide
			// measures "Secured by" at 11 and `c15t` at 10, and the crop shows the
			// brand sitting visibly smaller than the words in front of it -- a single
			// part for both cannot draw that. Both carry a line of their own size,
			// which is `.brandingText`'s and `.brandingWordmarkLabel`'s `line-height: 1`.
			// They also part company on tracking, which is how the brand hugs its mark:
			// `.brandingTag .brandingCopy` opens by `.01em`, +0.11 at 11pt, and the
			// wordmark closes by `.03em`, -0.3 at 10.
			brandingLabel: {
				color: colors.onPrimary,
				fontSize: 11,
				letterSpacing: Number((TRACKING_EM.brandingLabel * 11).toFixed(4)),
				lineHeight: 11,
			},
			brandingWordmark: {
				color: colors.onPrimary,
				fontSize: 10,
				letterSpacing: Number((TRACKING_EM.brandingWordmark * 10).toFixed(4)),
				lineHeight: 10,
			},
			caption: textStyle(typography.caption, colors.textMuted),
			captionLink: textStyle(typography.caption, colors.text),
			// The revealed description. It starts where the label starts, a box and a
			// step past the card's edge, so the two lines of text share a margin.
			categoryContent: {
				paddingBottom: spacing.s,
				paddingLeft: CONSENT_DISCLOSURE_GEOMETRY.box + 4,
				paddingRight: spacing.s,
			},
			// The accordion's own small copy: same 14pt as the label above it, on a
			// 21 line, in `.content`'s colour, and tracked at nothing because both
			// `.content` and `.contentInner` inherit rather than declare.
			categoryDescription: textStyle(
				{
					...typography.bannerBody,
					lineHeight: CATEGORY_CONTENT_LINE_HEIGHT,
				},
				colors.contentText
			),
			// The glyph itself, as the two bars the row draws: this style is the
			// horizontal one, and the vertical one swaps its own width and height, so
			// one part carries the colour and the weight of the plus and its minus.
			categoryDisclosure: {
				backgroundColor: colors.disclosure,
				height: disclosureGeometry.stroke,
				width: disclosureGeometry.arm,
			},
			// One bordered card per category, not a divided list: `.item` is nothing
			// but a 1px border in the border token and `radius-md`, which measures 8
			// rather than the 12 a dialog card carries. Its padding belongs on the
			// trigger inside it, because the description that a tap reveals sits
			// outside that padding and lines up with the label instead.
			categoryRow: {
				backgroundColor: colors.surface,
				borderColor: colors.border,
				borderRadius: radius.control,
				borderWidth: HAIRLINE,
				flexDirection: 'column',
			},
			// The row label is the button label's size and line height at the body's
			// weight: `.trigger` is `font-size: sm` over `line-height-tight` at
			// regular. It used to sit at medium here, which stood in for the
			// disclosure glyph the row did not have; with the glyph present the web's
			// own weight reads, and the loudest thing on the row is the switch.
			categoryTitle: textStyle(
				{ ...typography.label, weight: '400' },
				colors.text
			),
			// `.triggerRow`: 8 of padding, a 4 step, and a row of
			// `[minmax(0,1fr), auto]`, which in React Native is a flexing text
			// column against a switch that keeps its own width. `minHeight` is the web's
			// disclosure floor plus that padding, because React Native reads it as the
			// border box, and it is the whole collapsed card: 40 here plus the card's two
			// hairlines is the 42 web draws. Nothing in the row may carry the 44pt touch
			// floor as a drawn size, or the card measures 60 on a device again -- which
			// is why the switch reaches its own floor through a hit area too.
			categoryTrigger: {
				alignItems: 'center',
				flexDirection: 'row',
				gap: spacing.xs,
				minHeight: categoryTriggerHeight,
				padding: spacing.s,
			},
			// The box the close control draws: `.closeButton` is `padding: .375rem`
			// on `--c15t-radius-md` over the muted tone, with no border and no fill
			// until hover. The 44 a fingertip needs is reached through `hitSlop` in
			// the control itself, exactly as every other control here does it, so the
			// header stays the height the web header measures.
			closeButton: {
				alignItems: 'center',
				borderRadius: radius.control,
				height: 28,
				justifyContent: 'center',
				padding: 6,
				width: 28,
			},
			// One bar of the cross. The web draws a 1rem lucide `x` at `stroke-width:
			// 2`, which is two 16pt strokes 2pt thick crossing at the centre; React
			// Native has no SVG, so the control renders this bar twice, rotated through
			// +45 and -45 degrees. Both bars are the same part, which is what keeps a
			// thicker cross from ever being half-drawn in another colour.
			closeGlyph: {
				backgroundColor: colors.textMuted,
				height: 2,
				position: 'absolute',
				width: 16,
			},
			description: textStyle(
				facts.bodyType,
				colors.textMuted,
				facts.bodyTracking
			),
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
			// The heading band. The web banner leads with `1rem` of padding and a
			// `0.5rem` step between heading and copy; the dialog leads with the card
			// padding and a `--consent-dialog-header-gap` of 4.
			header: {
				// The banner puts 8 between its heading and its copy and the dialog 4;
				// the disclosure puts 4 too, because `.description` carries
				// `margin: .25rem 0 0` under the heading rather than the band
				// declaring a gap. It is the only band with a rule under it:
				// `.header` draws a `border-bottom` in the border token, which is what
				// separates the heading from the segmented control below it.
				borderBottomColor: colors.border,
				borderBottomWidth: facts.headerRuleWidth,
				gap: facts.headerGap,
				// Two longhands rather than `padding` plus an override, because React
				// Native resolves a longhand over a shorthand whichever order they are
				// written in: `padding` here with a `paddingVertical: 0` under it would
				// have quietly flattened the dialog's own 24 of heading inset to pay for
				// a number the drawer does not use.
				paddingHorizontal: facts.headerPaddingHorizontal,
				paddingVertical: facts.headerPaddingVertical,
			},
			label: {
				...textStyle(typography.label, colors.primary),
				textAlign: 'center',
			},
			// The Object / Objected control on a partner's legitimate-interest leg.
			// `.objectButton` is `.6875rem` at weight 500 on `padding: .25rem .5rem`, one
			// hairline in the border token on `--c15t-radius-sm`, which is 4 and not this
			// theme's own 8. It measures 53.6 x 23.8 at a 411 CSS px viewport, so the 44
			// a fingertip needs comes from `hitSlop` here too rather than from the box.
			objectButton: {
				alignItems: 'center',
				borderColor: colors.border,
				borderRadius: 4,
				borderWidth: HAIRLINE,
				justifyContent: 'center',
				paddingHorizontal: 8,
				paddingVertical: 4,
			},
			// The control's own words. `.objectButton` writes them in the muted tone
			// over nothing, and `.objectButtonActive` inverts the pair to the card's
			// colour once the objection is held -- that second colour is a state, so it
			// is applied by the control over this part.
			objectLabel: {
				...textStyle(
					{ fontSize: 11, lineHeight: 13.75, weight: '500' },
					colors.textMuted
				),
				textAlign: 'center',
			},
			overlay: { backgroundColor: colors.overlay },
			// The accent action. Web draws it as a neutral button with an accent ring
			// laid *inside* the border (`inset 0 0 0 1px var(--button-primary)`), so the
			// ring is 2px wide in total and the box is unchanged: the ring lies over
			// the padding. React Native has no inset ring, so the accent becomes a 2pt
			// border and a point of padding comes off each side to pay for it, which
			// lands the same two numbers: 9pt from the edge to the label, and 35.5 tall,
			// exactly what the neutral outline next to it measures.
			primaryButton: {
				alignItems: 'center',
				backgroundColor: colors.surface,
				borderColor: colors.primary,
				borderRadius: radius.control,
				borderWidth: HAIRLINE + 1,
				boxShadow: SHADOW_SM,
				justifyContent: 'center',
				paddingHorizontal: BUTTON_PADDING_HORIZONTAL - HAIRLINE,
				paddingVertical: BUTTON_PADDING_VERTICAL - HAIRLINE,
			},
			primaryLabel: {
				...textStyle(typography.label, colors.primary),
				textAlign: 'center',
			},
			row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.m },
			// One row of the disclosure. `.purposeItem`, `.stackItem`, and
			// `.specialPurposesSection` are the same bordered card: a hairline in the
			// border token on `--c15t-radius-md`, which is this theme's own `control`
			// radius, filled with the card colour. A partner row is the same card with
			// the fill taken away, which is `.vendorListItem`.
			rowCard: {
				backgroundColor: colors.surface,
				borderColor: colors.border,
				borderRadius: radius.control,
				borderWidth: HAIRLINE,
				flexDirection: 'column',
			},
			// The disclosure a row opens to: a rule above it, 12 of air over that
			// rule, and 12 of padding on the sides and below. `.purposeContent` is
			// `padding: 0 .75rem .75rem` plus `margin-top: .75rem` plus
			// `padding-top: .75rem` and a `border-top`, and the `marginTop` here is
			// that margin -- the gap sits above the rule, not below it.
			rowContent: {
				borderTopColor: colors.border,
				borderTopWidth: HAIRLINE,
				marginTop: IAB_ROWS.rowHeaderPadding,
				paddingBottom: IAB_ROWS.rowHeaderPadding,
				paddingHorizontal: IAB_ROWS.rowHeaderPadding,
				paddingTop: IAB_ROWS.rowHeaderPadding,
			},
			// `.purposeDescription` and `.stackDescription`: the GVL's own words, 12
			// over an explicit `line-height: 1.5`, in the muted tone.
			rowDescription: textStyle(
				{
					fontSize: IAB_ROWS.rowDescriptionSize,
					lineHeight: IAB_ROWS.rowDescriptionLineHeight,
					weight: '400',
				},
				colors.textMuted
			),
			// The tappable head of a row: 12 of padding all round, 12 between the
			// disclosure, the text column, and the switch, and the tops of those three
			// lined up, which is `.purposeHeader`'s `align-items: flex-start`. A title
			// that wraps to two lines therefore pushes the switch down rather than
			// centring itself against it, the way the web row does.
			rowHeader: {
				alignItems: 'flex-start',
				flexDirection: 'row',
				gap: IAB_ROWS.rowHeaderGap,
				padding: IAB_ROWS.rowHeaderPadding,
			},
			// One entry in a list inside an opened partner row -- a purpose name, a
			// special purpose, a feature. `.vendorPurposeItem` hangs a 12pt muted line 8
			// off a 2px rule: `padding-left: .5rem` and `border-left: 2px solid` in the
			// border token. That rule is the only 2px line on the surface, and it is
			// what makes a claim read as belonging to the heading above it.
			rowListItem: {
				borderLeftColor: colors.border,
				borderLeftWidth: 2,
				color: colors.textMuted,
				flexDirection: 'row',
				fontSize: 12,
				gap: 8,
				lineHeight: 15,
				paddingLeft: 8,
			},
			// The padlock beside a locked row's name. One part for two shapes: the
			// component paints the body from `backgroundColor` and the shackle from
			// `borderColor`, both of which the web paints in the same muted tone, so a
			// host that retints one retints the whole glyph.
			rowLock: {
				backgroundColor: colors.textMuted,
				borderColor: colors.textMuted,
			},
			// `{count} partners` under a row's name: `.purposeMeta` is `.75rem` in the
			// muted tone and declares no line height, so it inherits the sheet's
			// `line-height-tight`, the same 1.25 that puts a 14 label on a 17.5 line.
			rowMeta: textStyle(
				{ fontSize: IAB_ROWS.rowMetaSize, lineHeight: 15, weight: '400' },
				colors.textMuted
			),
			// The standing notice under a partner's legitimate-interest claim: the
			// right to object. `.liExplanation` is `.6875rem` in italics, in the muted
			// tone, on the same hovered surface as the band it sits in.
			rowNotice: {
				...textStyle(
					{ fontSize: 11, lineHeight: 13.75, weight: '400' },
					colors.textMuted
				),
				fontStyle: 'italic',
			},
			// A heading inside an opened partner row -- `Purposes (4)`, `Legitimate
			// Interest`, `Features`. `.vendorPurposesTitle` is `.75rem` at weight 500 in
			// the plain text colour with 4 under it. It is not the uppercase 10pt form
			// the purpose row's own sub-headings use, and the two are separate parts for
			// that reason.
			rowSectionTitle: {
				...textStyle(
					{ fontSize: 12, lineHeight: 15, weight: '500' },
					colors.text
				),
				marginBottom: 4,
			},
			// `.purposeName`, `.stackName`, and `.vendorListName`: 14 at weight 500 on
			// the inherited tight line, which is this scale's own `label` box one
			// weight up. The category label next door stays at 400 -- that row's label
			// is regular on the web, and the two rows are not the same row.
			rowTitle: textStyle({ ...typography.label, weight: '500' }, colors.text),
			scroll: {
				flexGrow: 0,
				flexShrink: 1,
				paddingHorizontal: facts.cardPadding,
				// `.content` in the disclosure pads all four sides, so the list carries
				// its own 12 above the first row. The two card surfaces do not: their
				// `.content` is `padding: 0 24 24` and the heading band above is what
				// separates the list from it, so they keep the 0 they were measured with.
				paddingTop: facts.contentPaddingTop,
			},
			// The list of category cards. The separation lives here because the
			// stack gap belongs between the cards, where a row's own padding would
			// also put one above the footer. The run under the last card is not the
			// card's bottom padding -- that belongs to the footer, which sits below
			// this list. It is the 24 the manager puts between each pair of its own
			// children (`margin-top: 1.5rem`), which is the first half of the 48 the
			// live widget leaves between the last card and the first action.
			scrollContent: {
				gap: facts.listGap,
				paddingBottom: facts.cardPadding,
			},
			// Both decisions, and every action that only moves the subject around: the
			// neutral outline, which is 1px of the border token over the card fill with
			// the same `shadow-sm` the accent action carries.
			secondaryButton: {
				alignItems: 'center',
				backgroundColor: colors.surface,
				borderColor: colors.border,
				borderRadius: radius.control,
				borderWidth: HAIRLINE,
				boxShadow: SHADOW_SM,
				justifyContent: 'center',
				paddingHorizontal: BUTTON_PADDING_HORIZONTAL,
				paddingVertical: BUTTON_PADDING_VERTICAL,
			},
			secondaryLabel: {
				...textStyle(typography.label, colors.text),
				textAlign: 'center',
			},
			// The heading over a list inside an opened row -- `With Your Permission`
			// and `Legitimate Interest` in a purpose row, and the two partner groups in
			// a vendors list. `.vendorSectionHeading` is `.75rem` at weight 600 in the
			// plain text colour on `padding: .375rem 0 .25rem`, which is the 26 the live
			// panel measures for the box.
			sectionHeading: textStyle(
				{ fontSize: 12, lineHeight: 15, weight: '600' },
				colors.text
			),
			// One part for both modal presentations, because it is the same card
			// anchored three ways. A dialog adds the web card's own border and width
			// cap; a bottom sheet runs to the screen edges and needs neither; a drawer
			// is the screen, so it stretches over the whole layer and takes no radius,
			// no hairline, and no elevation. A page that kept the dialog's 12pt corner
			// would show the dimmed app through four round notches, which reads as a
			// sheet that failed to finish opening.
			sheet: {
				backgroundColor: colors.surface,
				borderColor: colors.border,
				borderRadius: facts.cardRadius,
				borderWidth: facts.cardBorderWidth,
				boxShadow: facts.cardShadow,
				flex: facts.cardFlex,
				flexDirection: 'column',
				maxHeight: cardMaxHeight,
				maxWidth: facts.cardMaxWidth,
				overflow: 'hidden',
			},
			// The band a stack opens to: `.stackContent` is `padding: .5rem` over
			// `--iab-cd-surface-hover` under a hairline. The rows inside it are ordinary
			// purpose rows, which is what a stack is -- a shortcut over N decisions
			// rather than a further decision of its own.
			stackContent: {
				backgroundColor: colors.surfaceRaised,
				borderTopColor: colors.border,
				borderTopWidth: HAIRLINE,
				gap: IAB_ROWS.listGap,
				padding: 8,
			},
			switch: {
				backgroundColor: colors.switchTrack,
				borderRadius: switchGeometry.height / 2,
				height: switchGeometry.height,
				justifyContent: 'center',
				padding: switchGeometry.padding,
				width: switchGeometry.width,
			},
			// One tab of the segmented control. `.tabButton` is a fixed `height: 2rem`
			// with `padding: 0 .75rem` on `--c15t-radius-md`, and the two of them are
			// `1fr` tracks of `.tabsList`, which in React Native is a flexing child
			// over a zero basis. It carries no fill of its own: the web slides one
			// `.tabIndicator` behind the active trigger, and a selected tab here takes
			// the card colour from the component, which is the same two pixels of
			// difference arrived at by a different mechanism.
			tab: {
				alignItems: 'center',
				borderRadius: radius.control,
				flexBasis: 0,
				flexGrow: 1,
				flexShrink: 1,
				height: IAB_ROWS.tabHeight,
				justifyContent: 'center',
				paddingHorizontal: 12,
			},
			// The band the segmented control stands in, between the header's rule and
			// the scrolling list. `.tabsContainer` is `padding: .75rem .75rem 0`, so the
			// tabs lean on the content's own 12 below them rather than declaring a
			// bottom of their own -- which is why the 0 under them is written down here
			// instead of being left to a parent that knows nothing about tabs.
			tabBand: {
				paddingBottom: IAB_BANDS.tabPaddingBottom,
				paddingHorizontal: IAB_BANDS.tabPaddingHorizontal,
				paddingTop: IAB_BANDS.tabPaddingTop,
			},
			// The tab's own words and count. `.tabButton` is `.8125rem` at weight 500
			// and declares no line height, so it inherits the sheet's
			// `line-height-tight`, which is the 1.25 that puts 13 on a 16.25 line. The
			// colour here is the inactive one; an active tab reads plain text, and that
			// is a state rather than a part.
			tabLabel: {
				color: colors.textMuted,
				fontSize: IAB_ROWS.tabFontSize,
				fontWeight: '500',
				lineHeight: 16.25,
			},
			// The segmented control the two tabs sit in: `.tabsList` is a `0.25rem`
			// grid with a `0.25rem` gap on `--c15t-radius-lg`, filled with
			// `--iab-cd-surface-hover` so the pair reads as one control with a hole
			// punched in it rather than two buttons side by side.
			tabList: {
				alignItems: 'stretch',
				backgroundColor: colors.surfaceRaised,
				borderRadius: radius.surface,
				flexDirection: 'row',
				gap: IAB_ROWS.tabListGap,
				padding: IAB_ROWS.tabListPadding,
			},
			title: textStyle(facts.titleType, colors.text, facts.titleTracking),
			// The band a partner row opens to. `.vendorListContent` is the same hovered
			// fill and hairline as `.stackContent` at `padding: 0 .625rem .625rem`, so it
			// starts flush with the row's header instead of adding a second 10 above the
			// rule, and it keeps its own 10 sideways rather than a stack's 8.
			vendorContent: {
				backgroundColor: colors.surfaceRaised,
				borderTopColor: colors.border,
				borderTopWidth: HAIRLINE,
				gap: 12,
				paddingBottom: 10,
				paddingHorizontal: 10,
			},
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
			drawerTravel: I18nManager.isRTL ? -width : width,
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
		safeHeight,
		scaled,
		scheme,
		styles,
		// `drawerTravel` is the whole window width, so a rotation has to recompute it
		// rather than hand back the travel the previous orientation was sized for.
		width,
	]);
};
