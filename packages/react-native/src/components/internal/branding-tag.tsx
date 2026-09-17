/**
 * The "Secured by c15t" tab welded to a consent surface.
 *
 * On web this is an anchor rendered from an SVG path. React Native ships no SVG
 * renderer, so the glyph is the same path rasterised at build time by
 * `scripts/generate-branding-mark.ts` and picked at the screen's density.
 *
 * The tab is not part of the card. It sits just outside it, shares two of its
 * corners, and gives up the border on the edge they meet, so the pair reads as
 * one outline rather than two stacked boxes. That is also why it cannot live
 * inside the sheet: both cards clip, and a clipped tab is a cut-off tab.
 */

import type { ReactNode } from 'react';
import {
	Image,
	Linking,
	PixelRatio,
	Pressable,
	Text,
	View,
} from 'react-native';
import type { ViewStyle } from 'react-native';

import type { ConsentResolvedParts } from '../theme/consent-theme-parts';
import { selectBrandingMark } from './branding-mark';
import type { ConsentSurfacePresentation } from './consent-surface';

/**
 * Where the tab links.
 *
 * Web appends `?ref=<hostname>` so the visit is attributable. There is no
 * hostname to attribute from inside an app, and guessing one from a bundle
 * identifier would be a different claim, so the mobile link stays bare.
 */
const C15T_HREF = 'https://c15t.com';

/** The brand the tab carries. */
const WORDMARK = 'c15t';

/**
 * The mark's edge: `height: 0.9375rem` on `.brandingC15TMark`.
 *
 * Square, though the glyph's viewBox is 446 by 445. The raster is drawn into a
 * square viewport, and 0.2% is nothing at this size.
 */
const MARK_SIZE = 15;

/** `gap: 0.3125rem` on `.brandingWordmark`, between the mark and the wordmark. */
const WORDMARK_GAP = 5;

const WORDMARK_ROW: ViewStyle = { flexDirection: 'row', gap: WORDMARK_GAP };

const MARK_STYLE = { height: MARK_SIZE, width: MARK_SIZE };

/**
 * How the tab attaches, per presentation.
 *
 * Both are `align-self: flex-end`, at the card's own inset: 12 on the banner
 * (`margin-inline-end: .75rem`) and 16 on the sheet
 * (`right: var(--consent-dialog-card-padding-mobile)`, which is that sheet's
 * content padding). The banner variant gives up its bottom border and lifts 1px
 * into the card, so the card's hairline runs under the tab instead of across it.
 *
 * The sheet carries no border of its own, so the modal variant needs no overlap
 * to hide a seam: it butts against the sheet's bottom edge with the top corners
 * squared and the top border gone, and that is the whole of it.
 */
const ATTACHMENT: Record<
	ConsentSurfacePresentation,
	(radius: number) => ViewStyle
> = {
	banner: (radius) => ({
		alignSelf: 'flex-end',
		borderBottomLeftRadius: 0,
		borderBottomRightRadius: 0,
		borderBottomWidth: 0,
		borderTopLeftRadius: radius,
		borderTopRightRadius: radius,
		marginBottom: -1,
		marginRight: 12,
	}),
	modal: (radius) => ({
		alignSelf: 'flex-end',
		borderBottomLeftRadius: radius,
		borderBottomRightRadius: radius,
		borderTopLeftRadius: 0,
		borderTopRightRadius: 0,
		borderTopWidth: 0,
		marginRight: 16,
	}),
};

/** Props for {@link ConsentBrandingTag}. */
export interface ConsentBrandingTagProps {
	/** Where the press goes. */
	readonly href?: string;
	/** "Secured by", already resolved to the subject's language. */
	readonly label: string;
	/** Parts in force for this surface. */
	readonly parts: ConsentResolvedParts;
	/** Which card the tab attaches to. */
	readonly presentation: ConsentSurfacePresentation;
	/** Corner radius of that card, so the two agree on the round corners. */
	readonly radius: number;
}

/**
 * Render the branding tab.
 *
 * @example
 * ```tsx
 * <ConsentBrandingTag
 *     label="Secured by"
 *     parts={parts}
 *     presentation="banner"
 *     radius={12}
 * />
 * ```
 *
 * @param props - Copy, parts, and which card to attach to.
 * @returns The pressable tab.
 */
export const ConsentBrandingTag = ({
	href = C15T_HREF,
	label,
	parts,
	presentation,
	radius,
}: ConsentBrandingTagProps): ReactNode => {
	const open = async (): Promise<void> => {
		try {
			await Linking.openURL(href);
		} catch {
			// `openURL` rejects when nothing on the device claims https. Worth
			// swallowing: a branding link that cannot open is not a consent failure,
			// and there is no second choice to offer for it.
		}
	};

	return (
		<Pressable
			accessibilityLabel={`${label} ${WORDMARK}`}
			accessibilityRole="link"
			onPress={() => {
				void open();
			}}
			style={[parts.branding, ATTACHMENT[presentation](radius)]}
		>
			<Text style={parts.brandingLabel}>{label}</Text>
			<View style={WORDMARK_ROW}>
				<Image
					resizeMode="contain"
					source={{ uri: selectBrandingMark(PixelRatio.get()) }}
					style={MARK_STYLE}
				/>
				<Text style={parts.brandingLabel}>{WORDMARK}</Text>
			</View>
		</Pressable>
	);
};
