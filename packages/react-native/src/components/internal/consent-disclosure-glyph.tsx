/**
 * The plus that becomes a minus when a row opens.
 *
 * React Native has no SVG renderer, so the glyph is two bars: the horizontal one
 * is a restylable part, and the vertical one is the same bar turned through 90
 * degrees, borrowing the part's colour so a thicker cross can never be
 * half-drawn in another tint. Dropping the vertical bar is what turns the plus
 * into the minus the web shows for an open row.
 *
 * It is decorative: a reader hears the row's own label, and a second announcement
 * for a plus sign is noise.
 */

import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { ViewStyle } from 'react-native';

import type { ConsentResolvedParts } from '../theme/consent-theme-parts';
import type { ConsentTheme } from '../theme/create-consent-theme';

/**
 * The box a disclosure glyph is drawn at.
 *
 * Both geometries the package exports satisfy it, which is what lets one
 * component draw the accordion's 20-point glyph and the disclosure's 16-point one
 * from the numbers each was sized with.
 */
export interface ConsentDisclosureGeometry {
	/** Length of one arm of the plus. */
	readonly arm: number;
	/** Width of the square the glyph sits in. */
	readonly box: number;
	/** Thickness of one arm. */
	readonly stroke: number;
}

/** Props for {@link ConsentDisclosureGlyph}. */
export interface ConsentDisclosureGlyphProps {
	/** Box, arm, and stroke the glyph is drawn at. */
	readonly geometry: ConsentDisclosureGeometry;
	/** Whether the row it belongs to is open. */
	readonly open: boolean;
	/** Parts in force, for the colour and the horizontal arm. */
	readonly parts: ConsentResolvedParts;
	/** Theme, for the colour fallback. */
	readonly theme: ConsentTheme;
}

/**
 * Draw one disclosure glyph.
 *
 * @param props - Glyph props.
 * @returns The decorative glyph.
 */
export const ConsentDisclosureGlyph = ({
	geometry,
	open,
	parts,
	theme,
}: ConsentDisclosureGlyphProps): ReactNode => {
	const color = parts.categoryDisclosure.backgroundColor;
	// Built per geometry rather than per render: the two sizes the package ships
	// are module constants, so the style objects stay stable underneath a row that
	// rerenders every time a switch moves.
	const box: ViewStyle = useMemo(
		() => ({
			alignItems: 'center',
			height: geometry.box,
			justifyContent: 'center',
			position: 'relative',
			width: geometry.box,
		}),
		[geometry]
	);
	const stalk: ViewStyle = useMemo(
		() => ({
			height: geometry.arm,
			position: 'absolute',
			width: geometry.stroke,
		}),
		[geometry]
	);

	return (
		<View style={box}>
			<View style={parts.categoryDisclosure} />
			{open ? null : (
				<View
					style={[
						stalk,
						{
							backgroundColor:
								typeof color === 'string' ? color : theme.colors.disclosure,
						},
					]}
				/>
			)}
		</View>
	);
};
