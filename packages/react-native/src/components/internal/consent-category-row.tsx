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
 */

import { useState } from 'react';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { ViewStyle } from 'react-native';

import type { ConsentResolvedParts } from '../theme/consent-theme-parts';
import type { ConsentTheme } from '../theme/create-consent-theme';
import { CONSENT_DISCLOSURE_GEOMETRY } from '../theme/use-consent-styles';
import type { ConsentCategoryRow as CategoryRow } from './categories';
import { ConsentSwitch } from './consent-switch';

/** The text column takes the width the disclosure and the switch do not need. */
const TEXT_COLUMN: ViewStyle = { flex: 1, minWidth: 0 };

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
