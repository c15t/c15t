/**
 * The few icons the screens need, drawn with views.
 *
 * A glyph from a font would depend on what the device has installed, and an
 * icon package is a dependency the host would have to link. Two bordered
 * squares and a line cover a chevron, an arrow, and a cross on both platforms.
 */

import type { ReactElement } from 'react';
import { Text, View } from 'react-native';
import type { ViewStyle } from 'react-native';

/** Which glyph to draw. */
export type GlyphName =
	| 'arrowBack'
	| 'chevronBack'
	| 'chevronForward'
	| 'close'
	| 'info';

/** Props for {@link Glyph}. */
export interface GlyphProps {
	/** Stroke and fill color. */
	readonly color: string;
	/** Glyph to draw. */
	readonly name: GlyphName;
	/** Edge of the square the glyph sits in. */
	readonly size?: number;
}

const centered: ViewStyle = { alignItems: 'center', justifyContent: 'center' };

/**
 * Draw one glyph. Glyphs are decoration: the control around them carries the
 * label, so every glyph is hidden from assistive tech.
 *
 * @param props - Glyph props.
 * @returns The glyph.
 */
export const Glyph = ({ color, name, size = 24 }: GlyphProps): ReactElement => {
	const box: ViewStyle = { ...centered, height: size, width: size };
	const stroke = Math.max(1.5, size / 12);

	if (name === 'chevronBack' || name === 'chevronForward') {
		// A square with two borders, turned 45 degrees, is a chevron. It is
		// nudged towards its open side so it sits optically centred.
		const arm = size * 0.42;
		const forward = name === 'chevronForward';

		return (
			<View
				accessibilityElementsHidden
				importantForAccessibility="no-hide-descendants"
				style={box}
			>
				<View
					style={{
						borderColor: color,
						borderLeftWidth: forward ? 0 : stroke,
						borderRightWidth: forward ? stroke : 0,
						borderTopWidth: stroke,
						height: arm,
						transform: [
							{ translateX: forward ? -arm * 0.2 : arm * 0.2 },
							{ rotate: forward ? '45deg' : '-45deg' },
						],
						width: arm,
					}}
				/>
			</View>
		);
	}

	if (name === 'arrowBack') {
		const arm = size * 0.4;

		return (
			<View
				accessibilityElementsHidden
				importantForAccessibility="no-hide-descendants"
				style={box}
			>
				<View
					style={{
						backgroundColor: color,
						height: stroke,
						position: 'absolute',
						width: size * 0.66,
					}}
				/>
				<View
					style={{
						borderColor: color,
						borderLeftWidth: stroke,
						borderTopWidth: stroke,
						height: arm,
						left: size * 0.2,
						position: 'absolute',
						transform: [{ rotate: '-45deg' }],
						width: arm,
					}}
				/>
			</View>
		);
	}

	if (name === 'close') {
		const bar: ViewStyle = {
			backgroundColor: color,
			height: stroke,
			position: 'absolute',
			width: size * 0.6,
		};

		return (
			<View
				accessibilityElementsHidden
				importantForAccessibility="no-hide-descendants"
				style={box}
			>
				<View style={[bar, { transform: [{ rotate: '45deg' }] }]} />
				<View style={[bar, { transform: [{ rotate: '-45deg' }] }]} />
			</View>
		);
	}

	const ring = size * 0.84;

	return (
		<View
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			style={box}
		>
			<View
				style={{
					...centered,
					borderColor: color,
					borderRadius: ring / 2,
					borderWidth: stroke,
					height: ring,
					width: ring,
				}}
			>
				<Text
					allowFontScaling={false}
					style={{
						color,
						fontSize: ring * 0.62,
						fontWeight: '700',
						lineHeight: ring * 0.8,
					}}
				>
					i
				</Text>
			</View>
		</View>
	);
};
