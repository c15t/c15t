/**
 * Switch between sibling screens, such as Purposes and Vendors.
 *
 * iOS draws a segmented control: a grey track with the chosen segment raised
 * on a white pill. Android draws Material primary tabs: labels across the top,
 * the chosen one tinted and underlined with a 3dp indicator.
 */

import type { ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useNativeStyles } from './styles-context';

/** One segment. */
export interface Segment {
	/** Segment id, normally the screen it shows. */
	readonly id: string;
	/** Visible label. */
	readonly label: string;
}

/** Props for {@link SegmentedControl}. */
export interface SegmentedControlProps {
	/**
	 * Pick a segment.
	 *
	 * @param id - The segment pressed.
	 */
	readonly onChange: (id: string) => void;
	/** Segments in display order. */
	readonly segments: readonly Segment[];
	/** Id of the chosen segment. */
	readonly selected: string;
}

/** Height of the Material tab indicator. */
const INDICATOR_HEIGHT = 3;

/**
 * Draw the segments.
 *
 * @param props - Control props.
 * @returns The control.
 */
export const SegmentedControl = ({
	onChange,
	segments,
	selected,
}: SegmentedControlProps): ReactElement => {
	const { parts, theme } = useNativeStyles();
	const ios = theme.platform === 'ios';

	return (
		<View
			accessibilityRole="tablist"
			style={parts.segmentedControl}
		>
			{segments.map((segment) => {
				const chosen = segment.id === selected;

				return (
					<Pressable
						accessibilityLabel={segment.label}
						accessibilityRole="tab"
						accessibilityState={{ selected: chosen }}
						android_ripple={{ color: theme.colors.fill }}
						key={segment.id}
						onPress={() => {
							if (!chosen) {
								onChange(segment.id);
							}
						}}
						style={[
							parts.segment,
							ios && chosen
								? {
										backgroundColor: theme.colors.surface,
										elevation: 1,
										shadowColor: '#000',
										shadowOffset: { height: 1, width: 0 },
										shadowOpacity: 0.12,
										shadowRadius: 2,
									}
								: null,
						]}
						testID={`c15t-segment-${segment.id}`}
					>
						<Text
							maxFontSizeMultiplier={1.6}
							numberOfLines={1}
							style={[
								parts.segmentLabel,
								!ios && chosen ? { color: theme.colors.primary } : null,
								ios && chosen ? { fontWeight: '600' } : null,
							]}
						>
							{segment.label}
						</Text>
						{!ios && chosen ? (
							<View
								style={{
									backgroundColor: theme.colors.primary,
									borderTopLeftRadius: INDICATOR_HEIGHT,
									borderTopRightRadius: INDICATOR_HEIGHT,
									bottom: 0,
									height: INDICATOR_HEIGHT,
									left: theme.spacing.m16,
									position: 'absolute',
									right: theme.spacing.m16,
								}}
							/>
						) : null}
					</Pressable>
				);
			})}
		</View>
	);
};
