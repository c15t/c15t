/**
 * A navigation stack built from React Native core.
 *
 * Every consent screen that can drill down (preferences inside the sheet, IAB
 * purposes and partners) keeps its routes here. Pushing slides the new screen
 * in the way the platform does: from the right edge with a 30% parallax on iOS,
 * as a short shared-axis slide plus fade on Android, and as a crossfade when the
 * subject asked for less motion. iOS also gets the left-edge swipe back.
 *
 * Only the top two screens are mounted. The one underneath stays rendered
 * during a transition, so a pop reveals real content instead of a blank page.
 */

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import type { ReactElement, ReactNode } from 'react';
import {
	Animated,
	Easing,
	PanResponder,
	Pressable,
	Text,
	useWindowDimensions,
	View,
} from 'react-native';

import { useReducedMotion } from '../use-reduced-motion';
import { Glyph } from './glyph';
import { useNativeStyles } from './styles-context';
import { useAccessibilityFocus } from './use-accessibility-focus';

/** What {@link useNavStackState} hands a surface. */
export interface NavStackState {
	/** How many screens are on the stack. */
	readonly depth: number;
	/**
	 * Remove the top screen.
	 *
	 * @returns `true` when a screen was popped, `false` at the root.
	 */
	readonly pop: () => boolean;
	/**
	 * Push a screen.
	 *
	 * @param route - Screen id to show.
	 */
	readonly push: (route: string) => void;
	/**
	 * Swap the top screen without animating, the way a segment switch does.
	 *
	 * @param route - Screen id to show instead.
	 */
	readonly replace: (route: string) => void;
	/** Go back to the root screen. */
	readonly reset: () => void;
	/** Every route, root first. */
	readonly routes: readonly string[];
	/** The screen on top. */
	readonly top: string;
}

/**
 * Hold a stack of routes.
 *
 * @param root - Route the stack starts and resets to.
 * @returns The stack and the moves on it.
 */
export const useNavStackState = function useNavStackState(
	root: string
): NavStackState {
	const [routes, setRoutes] = useState<readonly string[]>([root]);
	const depthRef = useRef(1);

	useEffect(() => {
		depthRef.current = routes.length;
	}, [routes.length]);

	const push = useCallback((route: string) => {
		setRoutes((current) => [...current, route]);
	}, []);

	const pop = useCallback((): boolean => {
		if (depthRef.current <= 1) {
			return false;
		}

		depthRef.current -= 1;
		setRoutes((current) =>
			current.length > 1 ? current.slice(0, -1) : current
		);

		return true;
	}, []);

	const replace = useCallback((route: string) => {
		setRoutes((current) => [...current.slice(0, -1), route]);
	}, []);

	const reset = useCallback(() => {
		depthRef.current = 1;
		setRoutes([root]);
	}, [root]);

	return useMemo(
		() => ({
			depth: routes.length,
			pop,
			push,
			replace,
			reset,
			routes,
			top: routes.at(-1) ?? root,
		}),
		[pop, push, replace, reset, root, routes]
	);
};

const NavStackContext = createContext<NavStackState | null>(null);

/** Provide a stack to {@link NavStackView}, {@link NavBar}, and the rows. */
export const NavStackProvider = NavStackContext.Provider;

/**
 * Read the stack the current screen lives in.
 *
 * @returns The stack.
 * @throws {Error} When rendered outside a {@link NavStackProvider}.
 */
export const useNavStack = function useNavStack(): NavStackState {
	const stack = useContext(NavStackContext);

	if (stack === null) {
		throw new Error('c15t: a consent screen rendered outside its navigation.');
	}

	return stack;
};

/** Whether the screen reading this is the one on top. */
const ActiveScreenContext = createContext(true);

/** Props for {@link NavStackView}. */
export interface NavStackViewProps {
	/**
	 * Draw one route.
	 *
	 * @param route - Screen id.
	 * @returns The screen.
	 */
	readonly renderRoute: (route: string) => ReactNode;
}

/** Width of the strip on the left edge that starts a swipe back on iOS. */
const EDGE_WIDTH = 20;

/**
 * Draw the top of the stack, animating between screens.
 *
 * @param props - View props.
 * @returns The visible screens.
 */
export const NavStackView = ({
	renderRoute,
}: NavStackViewProps): ReactElement => {
	const stack = useNavStack();
	const { theme } = useNativeStyles();
	const reduced = useReducedMotion();
	const { width } = useWindowDimensions();
	const ios = theme.platform === 'ios';
	const progress = useMemo(() => new Animated.Value(1), []);
	const [shown, setShown] = useState<{
		readonly direction: 'push' | 'pop' | null;
		readonly from: string | null;
		readonly routes: readonly string[];
	}>({ direction: null, from: null, routes: stack.routes });
	const previous = useRef(stack.routes);

	useEffect(() => {
		const before = previous.current;
		const after = stack.routes;

		previous.current = after;

		if (before === after) {
			return;
		}

		const pushed = after.length > before.length;
		const popped = after.length < before.length;

		if (!pushed && !popped) {
			// A replace swaps the screen in place, the way a segment does.
			progress.setValue(1);
			setShown({ direction: null, from: null, routes: after });
			return;
		}

		const duration = reduced ? theme.motion.reducedFade : theme.motion.push;
		const easing = Easing.bezier(0.2, 0, 0, 1);

		if (pushed) {
			setShown({
				direction: 'push',
				from: before.at(-1) ?? null,
				routes: after,
			});
			progress.setValue(0);
			const animation = Animated.timing(progress, {
				duration,
				easing,
				toValue: 1,
				useNativeDriver: true,
			});
			animation.start(({ finished }) => {
				if (finished) {
					setShown({ direction: null, from: null, routes: after });
				}
			});
			return () => animation.stop();
		}

		// A pop keeps the leaving screen on top until it has slid away.
		setShown({ direction: 'pop', from: before.at(-1) ?? null, routes: after });
		progress.setValue(1);
		const animation = Animated.timing(progress, {
			duration,
			easing,
			toValue: 0,
			useNativeDriver: true,
		});
		animation.start(({ finished }) => {
			if (finished) {
				progress.setValue(1);
				setShown({ direction: null, from: null, routes: after });
			}
		});
		return () => animation.stop();
	}, [progress, reduced, stack.routes, theme.motion]);

	const swipe = useMemo(
		() =>
			PanResponder.create({
				onMoveShouldSetPanResponder: (_event, gesture) =>
					gesture.dx > 8 && Math.abs(gesture.dy) < Math.abs(gesture.dx),
				onPanResponderMove: (_event, gesture) => {
					progress.setValue(1 - Math.max(0, gesture.dx) / width);
				},
				onPanResponderRelease: (_event, gesture) => {
					if (gesture.dx > width * 0.35 || gesture.vx > 0.5) {
						progress.setValue(1);
						stack.pop();
						return;
					}

					Animated.spring(progress, {
						damping: theme.motion.springDamping,
						stiffness: theme.motion.springStiffness,
						toValue: 1,
						useNativeDriver: true,
					}).start();
				},
				onPanResponderTerminate: () => {
					progress.setValue(1);
				},
				onStartShouldSetPanResponder: () => true,
			}),
		[progress, stack, theme.motion, width]
	);

	const pushing = shown.direction === 'push';
	const top = pushing
		? shown.routes.at(-1)
		: (shown.from ?? shown.routes.at(-1));
	let under: string | null | undefined = null;
	if (pushing) {
		under = shown.from;
	} else if (shown.from !== null) {
		under = shown.routes.at(-1);
	}

	let topStyle;
	let underStyle;
	if (reduced) {
		topStyle = { opacity: progress };
		underStyle = {
			opacity: progress.interpolate({
				inputRange: [0, 1],
				outputRange: [1, 0],
			}),
		};
	} else if (ios) {
		topStyle = {
			transform: [
				{
					translateX: progress.interpolate({
						inputRange: [0, 1],
						outputRange: [width, 0],
					}),
				},
			],
		};
		underStyle = {
			transform: [
				{
					translateX: progress.interpolate({
						inputRange: [0, 1],
						outputRange: [0, -width * theme.motion.pushParallax],
					}),
				},
			],
		};
	} else {
		topStyle = {
			opacity: progress,
			transform: [
				{
					translateX: progress.interpolate({
						inputRange: [0, 1],
						outputRange: [30, 0],
					}),
				},
			],
		};
		underStyle = {
			opacity: progress.interpolate({
				extrapolate: 'clamp',
				inputRange: [0, 0.35],
				outputRange: [1, 0],
			}),
		};
	}

	const layer = {
		bottom: 0,
		left: 0,
		position: 'absolute',
		right: 0,
		top: 0,
	} as const;

	return (
		<View style={{ flex: 1, overflow: 'hidden' }}>
			{under === null || under === undefined ? null : (
				<Animated.View
					accessibilityElementsHidden
					importantForAccessibility="no-hide-descendants"
					pointerEvents="none"
					key={`under:${under}`}
					style={[
						layer,
						{ backgroundColor: theme.colors.background },
						underStyle,
					]}
				>
					<ActiveScreenContext.Provider value={false}>
						{renderRoute(under)}
					</ActiveScreenContext.Provider>
				</Animated.View>
			)}
			{top === undefined ? null : (
				<Animated.View
					key={`top:${top}`}
					style={[
						layer,
						{ backgroundColor: theme.colors.background },
						under === null || under === undefined ? null : topStyle,
					]}
				>
					<ActiveScreenContext.Provider value>
						{renderRoute(top)}
					</ActiveScreenContext.Provider>
				</Animated.View>
			)}
			{ios && stack.depth > 1 && !reduced ? (
				<View
					{...swipe.panHandlers}
					accessible={false}
					importantForAccessibility="no"
					style={{
						bottom: 0,
						left: 0,
						position: 'absolute',
						top: 0,
						width: EDGE_WIDTH,
					}}
					testID="c15t-nav-edge"
				/>
			) : null}
		</View>
	);
};

/** Props for {@link NavBar}. */
export interface NavBarProps {
	/** Label for the back control. */
	readonly backLabel: string;
	/** Label for the close control. */
	readonly closeLabel: string;
	/**
	 * Leave the root screen for whatever sits under the stack, such as the
	 * first layer of the sheet it grew out of. When omitted, the root screen
	 * has no back control.
	 */
	readonly onBack?: () => void;
	/**
	 * Close the whole surface. When omitted, the root screen has no close
	 * control, which is right for a sheet the subject has to answer.
	 */
	readonly onClose?: () => void;
	/** Screen title. */
	readonly title: string;
}

/**
 * The bar over a pushed or standalone screen.
 *
 * iOS centres a 17pt title between a tinted "‹ Back" and a "Close" text button.
 * Android puts a ← or ✕ icon first and left-aligns the title, as a Material top
 * app bar does. The title takes accessibility focus whenever its screen becomes
 * the top one, on push and on pop.
 *
 * @param props - Bar props.
 * @returns The bar.
 */
export const NavBar = ({
	backLabel,
	closeLabel,
	onBack,
	onClose,
	title,
}: NavBarProps): ReactElement => {
	const { parts, theme } = useNativeStyles();
	const stack = useNavStack();
	const active = useContext(ActiveScreenContext);
	const titleRef = useAccessibilityFocus(active);
	const ios = theme.platform === 'ios';
	const canGoBack = stack.depth > 1 || onBack !== undefined;

	const back = (): void => {
		if (!stack.pop()) {
			onBack?.();
		}
	};

	const heading = (
		<Text
			accessibilityRole="header"
			numberOfLines={1}
			ref={titleRef}
			style={parts.navTitle}
		>
			{title}
		</Text>
	);

	if (ios) {
		const side = { flex: 1, flexDirection: 'row' } as const;

		return (
			<View style={parts.navBar}>
				<View style={side}>
					{canGoBack ? (
						<Pressable
							accessibilityLabel={backLabel}
							accessibilityRole="button"
							hitSlop={8}
							onPress={back}
							style={parts.navButton}
						>
							<Glyph
								color={theme.colors.primary}
								name="chevronBack"
								size={22}
							/>
							<Text
								maxFontSizeMultiplier={1.5}
								style={parts.navButtonLabel}
							>
								{backLabel}
							</Text>
						</Pressable>
					) : null}
				</View>
				<View style={{ flex: 2 }}>{heading}</View>
				<View style={[side, { justifyContent: 'flex-end' }]}>
					{onClose === undefined ? null : (
						<Pressable
							accessibilityLabel={closeLabel}
							accessibilityRole="button"
							hitSlop={8}
							onPress={onClose}
							style={parts.navButton}
						>
							<Text
								maxFontSizeMultiplier={1.5}
								style={[parts.navButtonLabel, { fontWeight: '600' }]}
							>
								{closeLabel}
							</Text>
						</Pressable>
					)}
				</View>
			</View>
		);
	}

	let leading: {
		label: string;
		name: 'arrowBack' | 'close';
		onPress: () => void;
	} | null = null;
	if (canGoBack) {
		leading = { label: backLabel, name: 'arrowBack', onPress: back };
	} else if (onClose !== undefined) {
		leading = { label: closeLabel, name: 'close', onPress: onClose };
	}

	return (
		<View style={parts.navBar}>
			{leading === null ? (
				<View style={{ width: theme.spacing.s8 }} />
			) : (
				<Pressable
					accessibilityLabel={leading.label}
					accessibilityRole="button"
					android_ripple={{
						borderless: true,
						color: theme.colors.fill,
						radius: theme.metrics.hitTarget / 2,
					}}
					onPress={() => leading.onPress()}
					style={parts.navButton}
				>
					<Glyph
						color={theme.colors.label}
						name={leading.name}
					/>
				</Pressable>
			)}
			{heading}
		</View>
	);
};

/**
 * Whether the screen rendering this is the one on top of its stack.
 *
 * @returns `true` for the top screen.
 */
export const useIsActiveScreen = function useIsActiveScreen(): boolean {
	return useContext(ActiveScreenContext);
};
