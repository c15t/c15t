/**
 * The on/off control a category row carries.
 *
 * This is the web switch drawn from the same numbers rather than the
 * platform `Switch` tinted to look near it. The native control takes a track
 * colour and a thumb colour and lays itself out however the OS wants, which
 * is how the mobile prompt ended up with a control the web one does not
 * have: a different size, a different corner shape, and a thumb that runs
 * right up to the edge of its track.
 *
 * The touch target stays the platform minimum rather than the 32x20 track, so
 * the smaller visual does not cost anybody a reliable tap.
 */

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Animated, Pressable, View } from 'react-native';
import type { ViewStyle } from 'react-native';

import { MIN_TAP_TARGET } from '../theme/consent-theme-parts';
import type { ConsentResolvedParts } from '../theme/consent-theme-parts';
import type { ConsentTheme } from '../theme/create-consent-theme';
import { CONSENT_SWITCH_GEOMETRY } from '../theme/use-consent-styles';
import { useReducedMotion } from './use-reduced-motion';

/**
 * The web `duration-normal`, and the collapse reduced motion asks for.
 *
 * The curve is the platform's own rather than the web `easing` token: React
 * Native only takes one through `Easing`, and a control that cannot be rendered
 * in the harness is worse than a curve nobody can pick out across 150ms.
 */
const SWITCH_DURATION = 150;
const SWITCH_REDUCED_DURATION = 1;

/**
 * The tap target, which is larger than the track in both directions.
 *
 * The track is centred inside it, so the visible control keeps the web
 * geometry while the finger gets the 44 points the platform asks for.
 */
const HIT_AREA: ViewStyle = {
	alignItems: 'center',
	flexShrink: 0,
	height: MIN_TAP_TARGET,
	justifyContent: 'center',
	minWidth: MIN_TAP_TARGET,
};

/** Props for {@link ConsentSwitch}. */
export interface ConsentSwitchProps {
	/** Whether the subject may move it. */
	readonly disabled: boolean;
	/** Announced as the control's name, which is the category it decides. */
	readonly label: string;
	/** Parts in force for this surface, including the track geometry. */
	readonly parts: ConsentResolvedParts;
	/** Theme, for the track and thumb colours. */
	readonly theme: ConsentTheme;
	/** Position to show. */
	readonly value: boolean;
	/**
	 * Record the position the subject moved it to.
	 *
	 * @param value - New position.
	 */
	readonly onValueChange: (value: boolean) => void;
}

/**
 * A web-shaped consent switch.
 *
 * @param props - Switch props.
 * @returns The control.
 */
export const ConsentSwitch = ({
	disabled,
	label,
	onValueChange,
	parts,
	theme,
	value,
}: ConsentSwitchProps): ReactNode => {
	const reducedMotion = useReducedMotion();
	const track = parts.switch;
	const { padding, thumb, width } = CONSENT_SWITCH_GEOMETRY;
	// `DimensionValue` also admits percentages, which have no fixed meaning here,
	// so anything that is not a plain number falls back to the geometry the part
	// was built with rather than turning the travel into NaN.
	const points = (value: unknown, fallback: number): number =>
		typeof value === 'number' && Number.isFinite(value) ? value : fallback;
	// The thumb stops one pad short of each end of the track, so a host that
	// widens the track through the part moves the end of the travel with it.
	const travel = Math.max(
		0,
		points(track.width, width) - thumb - 2 * points(track.padding, padding)
	);

	const position = useRef(new Animated.Value(value ? 1 : 0)).current;

	useEffect(() => {
		Animated.timing(position, {
			duration: reducedMotion ? SWITCH_REDUCED_DURATION : SWITCH_DURATION,
			toValue: value ? 1 : 0,
			useNativeDriver: true,
		}).start();
	}, [position, reducedMotion, value]);

	const thumbStyle: ViewStyle = {
		backgroundColor: theme.colors.switchThumb,
		borderColor: theme.colors.border,
		borderRadius: thumb / 2,
		borderWidth: 1,
		height: thumb,
		width: thumb,
	};

	return (
		<Pressable
			accessibilityLabel={label}
			accessibilityRole="switch"
			accessibilityState={{ checked: value, disabled }}
			disabled={disabled}
			onPress={() => {
				onValueChange(!value);
			}}
			style={HIT_AREA}
		>
			<View
				style={[
					track,
					{
						backgroundColor: value
							? theme.colors.switchTrackOn
							: theme.colors.switchTrack,
						opacity: disabled ? 0.4 : 1,
					},
				]}
			>
				<Animated.View
					style={[
						thumbStyle,
						{
							transform: [
								{
									translateX: position.interpolate({
										inputRange: [0, 1],
										outputRange: [0, travel],
									}),
								},
							],
						},
					]}
				/>
			</View>
		</Pressable>
	);
};
