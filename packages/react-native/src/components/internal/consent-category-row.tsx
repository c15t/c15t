/**
 * One category, its switch, and the description hidden behind a disclosure.
 *
 * The card is collapsed until the subject opens it, which is what the web
 * accordion does and what keeps five categories on one screen. The whole trigger
 * row is the control, so the label, the glyph, and the space between them all
 * open the card; the switch sits inside that row and keeps its own touch target,
 * because React Native hands a touch to the innermost responder.
 *
 * The row is deliberately not `accessible`: folding it into one stop in the
 * reader tree would hide the switch inside it, and the switch is the one thing on
 * the row a subject can act on rather than only read.
 *
 * The row draws at the height the web card does and reaches the platform's
 * fingertip floor through `hitSlop`, exactly as `ConsentButton` does. Putting the
 * 44 on the drawn box instead is what made every closed card 60 tall on a device.
 */

import { useState } from 'react';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { ViewStyle } from 'react-native';

import { MIN_TAP_TARGET } from '../theme/consent-theme-parts';
import type { ConsentResolvedParts } from '../theme/consent-theme-parts';
import type { ConsentTheme } from '../theme/create-consent-theme';
import { CONSENT_DISCLOSURE_GEOMETRY } from '../theme/use-consent-styles';
import type { ConsentCategoryRow as CategoryRow } from './categories';
import { ConsentSwitch } from './consent-switch';

/** The text column takes the width the disclosure and the switch do not need. */
const TEXT_COLUMN: ViewStyle = { flex: 1, minWidth: 0 };

/**
 * How far a touch area may reach past the box it belongs to, one edge at a time.
 *
 * Spelled here for the reason `consent-button.tsx` spells it: `Pressable`'s
 * `hitSlop` type is a structural shape React Native has renamed between releases,
 * and this component only ever passes plain points.
 */
interface TouchInset {
	bottom?: number;
	left?: number;
	right?: number;
	top?: number;
}

/** A style length that can be added to, or nothing when the host wrote a percentage. */
const points = function points(candidate: unknown, fallback = 0): number {
	return typeof candidate === 'number' && Number.isFinite(candidate)
		? candidate
		: fallback;
};

/**
 * The touch area the row asks for, derived from the box it was drawn with.
 *
 * A collapsed card is 42 tall and a finger still needs 44, so the shortfall goes on
 * the hit area and not on `minHeight`: the design keeps its height and the thumb
 * still gets its room. Deriving the inset from the parts in force rather than
 * hardcoding it means a host theme that pushes the row past 44 asks for no slop at
 * all, and one between 42 and 44 asks for less.
 *
 * @param parts - Parts in force for this surface.
 * @returns An inset for `hitSlop`, or `undefined` when the box clears the floor.
 */
const hitSlopFor = function hitSlopFor(
	parts: ConsentResolvedParts
): TouchInset | undefined {
	const box = parts.categoryTrigger;
	// The row is padded with the shorthand, so both spellings have to read.
	const padding = points(box.paddingVertical, points(box.padding));
	// `minHeight` already carries the padding and the disclosure floor, so where the
	// host left it in it *is* the drawn height; a host that removed it is back to a
	// row of padding around the label's own line box.
	const drawn = Math.max(
		points(box.minHeight),
		padding * 2 + points(parts.categoryTitle.lineHeight)
	);
	const inset = Math.ceil((MIN_TAP_TARGET - drawn) / 2);

	if (inset <= 0) {
		return undefined;
	}

	return { bottom: inset, left: inset, right: inset, top: inset };
};

/**
 * The square the glyph is drawn in.
 *
 * It is decorative, so it carries no label: a reader hears the category name from
 * the row and a second announcement for a plus sign is noise.
 */
const GLYPH_BOX: ViewStyle = {
	alignItems: 'center',
	height: CONSENT_DISCLOSURE_GEOMETRY.box,
	justifyContent: 'center',
	position: 'relative',
	width: CONSENT_DISCLOSURE_GEOMETRY.box,
};

/**
 * The vertical arm of the plus, centred on the horizontal one.
 *
 * The horizontal arm is a restylable part; this is the same bar turned through 90
 * degrees, so it borrows the part's colour and takes its size from the geometry
 * the part was built from.
 */
const GLYPH_STALK: ViewStyle = {
	height: CONSENT_DISCLOSURE_GEOMETRY.arm,
	position: 'absolute',
	width: CONSENT_DISCLOSURE_GEOMETRY.stroke,
};

/** Props for {@link ConsentCategoryRow}. */
export interface ConsentCategoryRowProps {
	/** Row to render. */
	readonly row: CategoryRow;
	/** Parts in force for this surface. */
	readonly parts: ConsentResolvedParts;
	/** Theme, for the switch track and thumb. */
	readonly theme: ConsentTheme;
	/**
	 * Record the position the subject moved the switch to.
	 *
	 * @param value - New position.
	 */
	readonly onToggle: (value: boolean) => void;
}

/**
 * A category card: a collapsed row with a switch, which opens to say what the
 * category covers.
 *
 * @param props - Row props.
 * @param props.onToggle - Called with the new position.
 * @param props.parts - Parts in force.
 * @param props.row - Row to render.
 * @param props.theme - Theme in force.
 * @returns The row.
 */
export const ConsentCategoryRow = ({
	onToggle,
	parts,
	row,
	theme,
}: ConsentCategoryRowProps): ReactNode => {
	const [open, setOpen] = useState(false);
	const glyphColor = parts.categoryDisclosure.backgroundColor;

	return (
		<View style={parts.categoryRow}>
			<Pressable
				accessibilityLabel={row.label}
				accessibilityRole="button"
				accessibilityState={{ expanded: open }}
				hitSlop={hitSlopFor(parts)}
				onPress={() => {
					setOpen((current) => !current);
				}}
				style={parts.categoryTrigger}
			>
				<View style={GLYPH_BOX}>
					<View style={parts.categoryDisclosure} />
					{open ? null : (
						<View
							style={[
								GLYPH_STALK,
								{
									backgroundColor:
										typeof glyphColor === 'string'
											? glyphColor
											: theme.colors.disclosure,
								},
							]}
						/>
					)}
				</View>
				<Text style={[parts.categoryTitle, TEXT_COLUMN]}>{row.label}</Text>
				<ConsentSwitch
					disabled={row.disabled}
					label={row.label}
					onValueChange={onToggle}
					parts={parts}
					theme={theme}
					value={row.value}
				/>
			</Pressable>
			{open ? (
				<View style={parts.categoryContent}>
					<Text style={parts.categoryDescription}>{row.description}</Text>
				</View>
			) : null}
		</View>
	);
};
