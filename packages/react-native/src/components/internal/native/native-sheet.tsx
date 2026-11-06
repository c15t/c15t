// React Native has no dialog element; its View uses the ARIA role prop.
/* eslint-disable jsx-a11y/prefer-tag-over-role */
/**
 * A bottom sheet built from React Native core.
 *
 * It has two detents. `content` hugs what it holds, the way the first layer of
 * a consent prompt sits over the bottom of the app. `full` takes the screen
 * below the status bar, for preferences pushed inside the same sheet.
 *
 * Only the grabber strip drags. Letting the list drag too would make every
 * scroll fight the sheet, and the system sheet on both platforms hands a list
 * its own gesture for the same reason.
 *
 * Dismissal is the caller's to grant. A sheet that asks for a choice has no
 * `onDismiss`: dragging it rubber-bands and the scrim ignores taps, because
 * swiping a consent prompt away must not count as an answer and must not leave
 * the question unasked either.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import {
	Animated,
	Easing,
	LayoutAnimation,
	Modal,
	PanResponder,
	Pressable,
	useWindowDimensions,
	View,
} from 'react-native';

import { useAnnounceOnOpen } from '../use-announce-on-open';
import { useReducedMotion } from '../use-reduced-motion';
import { useNativeStyles } from './styles-context';

/** How tall a {@link NativeSheet} stands. */
export type NativeSheetDetent = 'content' | 'full';

/** Props for {@link NativeSheet}. */
export interface NativeSheetProps {
	/** What the sheet holds. */
	readonly children: ReactNode;
	/** How tall the sheet stands. */
	readonly detent: NativeSheetDetent;
	/** Announced when the sheet opens, normally its title. */
	readonly label: string;
	/**
	 * Hardware back on Android. The caller pops a pushed screen first, and
	 * decides whether the root may close at all.
	 */
	readonly onBack: () => void;
	/**
	 * Drag down from the `full` detent. The caller pops back to the first
	 * screen, which returns the sheet to `content`.
	 */
	readonly onCollapse?: () => void;
	/**
	 * Drag down past the threshold, or tap the scrim, at the `content` detent.
	 * When omitted the sheet cannot be dismissed that way.
	 */
	readonly onDismiss?: () => void;
	/** Whether the sheet is showing. */
	readonly open: boolean;
	/** Locator for UI tests. */
	readonly testID?: string;
}

/** Share of the travel a release has to pass to dismiss or collapse. */
const RELEASE_THRESHOLD = 0.3;

/** How far ahead a release projects its velocity, in ms. */
const VELOCITY_PROJECTION = 200;

/** How much of an unwanted drag the sheet follows. */
const RUBBER_BAND = 0.15;

/**
 * Height of the strip that starts a drag. Taller than the grabber so a thumb
 * finds it.
 */
const HANDLE_HEIGHT = 44;

/**
 * Draw a bottom sheet over the app.
 *
 * @param props - Sheet props.
 * @returns The sheet while it is open or leaving.
 */
export const NativeSheet = ({
	children,
	detent,
	label,
	onBack,
	onCollapse,
	onDismiss,
	open,
	testID,
}: NativeSheetProps): ReactElement | null => {
	const { parts, safeArea, theme } = useNativeStyles();
	const reduced = useReducedMotion();
	const { height } = useWindowDimensions();
	const offset = useMemo(() => new Animated.Value(0), []);
	const [mounted, setMounted] = useState(open);
	const detentRef = useRef(detent);

	if (open && !mounted) {
		setMounted(true);
	}

	useAnnounceOnOpen(open, label);

	useEffect(() => {
		if (!mounted) {
			return;
		}

		if (open) {
			offset.setValue(height);
			const enter = reduced
				? Animated.timing(offset, {
						duration: theme.motion.reducedFade,
						toValue: 0,
						useNativeDriver: true,
					})
				: Animated.spring(offset, {
						damping: theme.motion.springDamping,
						stiffness: theme.motion.springStiffness,
						toValue: 0,
						useNativeDriver: true,
					});

			enter.start();

			return () => {
				enter.stop();
			};
		}

		const exit = Animated.timing(offset, {
			duration: reduced ? theme.motion.reducedFade : theme.motion.sheetExit,
			easing: Easing.bezier(0.3, 0, 1, 1),
			toValue: height,
			useNativeDriver: true,
		});

		exit.start(({ finished }) => {
			if (finished) {
				setMounted(false);
			}
		});

		return () => {
			exit.stop();
		};
	}, [height, mounted, offset, open, reduced, theme.motion]);

	useEffect(() => {
		if (detentRef.current === detent) {
			return;
		}

		detentRef.current = detent;

		if (!reduced) {
			LayoutAnimation.configureNext(
				LayoutAnimation.create(
					theme.motion.push,
					LayoutAnimation.Types.easeInEaseOut,
					LayoutAnimation.Properties.scaleY
				)
			);
		}
	}, [detent, reduced, theme.motion.push]);

	const release = detent === 'full' ? onCollapse : onDismiss;

	const drag = useMemo(
		() =>
			PanResponder.create({
				onMoveShouldSetPanResponder: (_event, gesture) =>
					Math.abs(gesture.dy) > 4,
				onPanResponderMove: (_event, gesture) => {
					const travel = Math.max(0, gesture.dy);

					offset.setValue(
						release === undefined ? travel * RUBBER_BAND : travel
					);
				},
				onPanResponderRelease: (_event, gesture) => {
					const projected = gesture.dy + gesture.vy * VELOCITY_PROJECTION;

					if (release !== undefined && projected > height * RELEASE_THRESHOLD) {
						if (detent === 'full') {
							offset.setValue(0);
						}

						release();
						return;
					}

					const snap = reduced
						? Animated.timing(offset, {
								duration: theme.motion.reducedFade,
								toValue: 0,
								useNativeDriver: true,
							})
						: Animated.spring(offset, {
								damping: theme.motion.springDamping,
								stiffness: theme.motion.springStiffness,
								toValue: 0,
								useNativeDriver: true,
							});
					snap.start();
				},
				onPanResponderTerminate: () => {
					offset.setValue(0);
				},
				onStartShouldSetPanResponder: () => true,
			}),
		[detent, height, offset, reduced, release, theme.motion]
	);

	if (!mounted) {
		return null;
	}

	const ios = theme.platform === 'ios';
	const scrimOpacity = offset.interpolate({
		extrapolate: 'clamp',
		inputRange: [0, height],
		outputRange: [1, 0],
	});
	const sheetMotion = reduced
		? { opacity: scrimOpacity }
		: { transform: [{ translateY: offset }] };
	// The full detent leaves the status bar and a sliver of the app above it on
	// iOS, so the sheet still reads as a sheet. Material sheets go edge to edge.
	const top = safeArea.top + (ios ? theme.spacing.s8 + 2 : 0);

	return (
		<Modal
			animationType="none"
			navigationBarTranslucent
			onRequestClose={onBack}
			statusBarTranslucent
			transparent
			visible
		>
			<View style={{ flex: 1, justifyContent: 'flex-end' }}>
				<Animated.View
					pointerEvents="box-none"
					style={[parts.scrim, { opacity: scrimOpacity }]}
				>
					<Pressable
						accessibilityElementsHidden
						disabled={onDismiss === undefined || detent === 'full'}
						importantForAccessibility="no-hide-descendants"
						onPress={onDismiss}
						style={{ flex: 1 }}
						testID="c15t-sheet-scrim"
					/>
				</Animated.View>
				<Animated.View
					accessibilityLabel={label}
					accessibilityViewIsModal
					role="dialog"
					style={[
						parts.sheet,
						{
							paddingBottom: Math.max(safeArea.bottom, theme.spacing.m16),
							paddingLeft: safeArea.left,
							paddingRight: safeArea.right,
						},
						detent === 'full'
							? { height: height - top }
							: { maxHeight: height - top },
						sheetMotion,
					]}
					testID={testID}
				>
					<View
						{...drag.panHandlers}
						accessible={false}
						importantForAccessibility="no-hide-descendants"
						style={{
							alignItems: 'center',
							height: HANDLE_HEIGHT,
							justifyContent: 'center',
						}}
						testID="c15t-sheet-handle"
					>
						<View style={parts.grabber} />
					</View>
					{children}
				</Animated.View>
			</View>
		</Modal>
	);
};
