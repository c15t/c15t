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
		readonly presentation?: 'banner' | 'dialog' | 'sheet';
		readonly styles?: ConsentPartStyles;
		readonly theme?: ConsentTheme;
	} = {}
): ConsentStyles {
	const scheme = resolveConsentColorScheme(useColorScheme());
	const { fontScale, height } = useWindowDimensions();
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
		// The banner heading is larger than its copy and the sheet heading is
		// smaller than its, so the roles are picked here rather than in a part.
		const titleType =
			presentation === 'banner' ? typography.bannerTitle : typography.title;
		const bodyType =
			presentation === 'banner' ? typography.bannerBody : typography.body;
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

		// The inset every band of a card keeps from its own edge. The dialog takes
		// the web's card padding, `--consent-dialog-card-padding` at 24; the bottom
		// sheet and the banner stay on 16, which is what they were measured at. The
		// card itself pads nothing: each band carries its own, the way the web's
		// header, content, and footer do, so the footer rule runs edge to edge.
		const centered = presentation === 'dialog';
		const cardPadding = presentation === 'dialog' ? spacing.l : spacing.m;

		// The tallest a card may stand. The overlay centres what it is given, so a
		// card that resolves taller than the space between the gutters is not
		// clipped, it is pushed up: measured on a 411x914 device, a card whose only
		// bound was its content came back 1090 tall and painted its heading over the
		// status bar clock. A cap is also what the web card has -- 370x499 inside an
		// 872 viewport, with the list scrolling under a header and a footer that stay
		// put -- and the tab the card shares its wrapper with has to come off the
		// allowance, or the wrapper overflows by exactly those 28.
		const cardMaxHeight = Math.max(
			MIN_BODY_HEIGHT,
			safeHeight -
				(centered ? gutter * 2 : gutter) -
				BRANDING_TAG_HEIGHT -
				(presentation === 'sheet' ? SHEET_HANDLE_HEIGHT : 0)
		);

		const bannerLayer: ViewStyle = {
			bottom: safeArea.bottom,
			left: 0,
			paddingBottom: bottomGutter,
			paddingHorizontal: Math.max(gutter, safeArea.left, safeArea.right),
			position: 'absolute',
			right: 0,
		};

		// A sheet keeps its actions the same distance above the band as the banner
		// does, and the band is added outside the gutter rather than swapped for it:
		// a measured band moves the sheet, and the gap between the deepest control
		// and the sheet's own rounded edge stays with the footer.
		// A dialog is the same card set down in the middle of the overlay rather than
		// pushed to its bottom edge, which is what the web root does: pad 16 all
		// round and centre. A notch is against that gutter rather than added to it,
		// because a card 448 wide at most has no reason to slide under one.
		const sideGutter = Math.max(gutter, safeArea.left, safeArea.right);

		const sheetLayer: ViewStyle = {
			alignItems: centered ? 'center' : undefined,
			flex: 1,
			justifyContent: centered ? 'center' : 'flex-end',
			paddingBottom: bottomGutter + safeArea.bottom,
			paddingLeft: centered ? sideGutter : safeArea.left,
			paddingRight: centered ? sideGutter : safeArea.right,
			paddingTop: centered ? gutter + safeArea.top : safeArea.top,
		};

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
				height: CONSENT_DISCLOSURE_GEOMETRY.stroke,
				width: CONSENT_DISCLOSURE_GEOMETRY.arm,
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
			description: textStyle(
				bodyType,
				colors.textMuted,
				presentation === 'banner' ? TRACKING_EM.bannerBody : undefined
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
				gap: presentation === 'banner' ? spacing.s : spacing.xs,
				padding: cardPadding,
			},
			label: {
				...textStyle(typography.label, colors.primary),
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
			scroll: {
				flexGrow: 0,
				flexShrink: 1,
				paddingHorizontal: cardPadding,
			},
			// The list of category cards. The separation lives here because the
			// stack gap belongs between the cards, where a row's own padding would
			// also put one above the footer. The run under the last card is not the
			// card's bottom padding -- that belongs to the footer, which sits below
			// this list. It is the 24 the manager puts between each pair of its own
			// children (`margin-top: 1.5rem`), which is the first half of the 48 the
			// live widget leaves between the last card and the first action.
			scrollContent: { gap: CATEGORY_STACK_GAP, paddingBottom: cardPadding },
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
			// One part for both modal presentations, because it is the same card
			// anchored two ways. A dialog adds the web card's own border and width
			// cap; a bottom sheet runs to the screen edges and needs neither.
			sheet: {
				backgroundColor: colors.surface,
				borderColor: colors.border,
				borderRadius: radius.surface,
				borderWidth: presentation === 'dialog' ? HAIRLINE : 0,
				boxShadow: presentation === 'dialog' ? SHADOW_SM : undefined,
				flexDirection: 'column',
				maxHeight: cardMaxHeight,
				maxWidth: presentation === 'dialog' ? DIALOG_MAX_WIDTH : undefined,
				overflow: 'hidden',
			},
			switch: {
				backgroundColor: colors.switchTrack,
				borderRadius: CONSENT_SWITCH_GEOMETRY.height / 2,
				height: CONSENT_SWITCH_GEOMETRY.height,
				justifyContent: 'center',
				padding: CONSENT_SWITCH_GEOMETRY.padding,
				width: CONSENT_SWITCH_GEOMETRY.width,
			},
			title: textStyle(
				titleType,
				colors.text,
				presentation === 'banner'
					? TRACKING_EM.bannerTitle
					: TRACKING_EM.dialogTitle
			),
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
		safeHeight,
		scaled,
		scheme,
		styles,
	]);
};
