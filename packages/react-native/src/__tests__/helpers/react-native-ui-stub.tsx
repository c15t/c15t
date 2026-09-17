/**
 * Stand-in for the `react-native` UI layer.
 *
 * The real components need a React Native runtime, so this file is swapped in
 * through the same `resolve.alias` entry that carries the TurboModule stub. It
 * is a faithful implementation rather than a mock: the same props, the same
 * event contract, and the same accessibility semantics, rendered as DOM nodes
 * so `react-dom` can mount a production component unchanged.
 *
 * Two things exist only for assertions. Every node carries its flattened style
 * as `data-rn-style`, because a DOM node cannot hold a React Native style
 * object and a layout test still needs to read it. And every interaction,
 * announcement, and animation is recorded in the exported state below.
 */

import type { ComponentType, ReactElement, ReactNode, Ref } from 'react';
import { createElement, forwardRef, useSyncExternalStore } from 'react';

/** One hardware-back or native-event listener. */
type Listener = () => void;

/** What a press handler receives, in the shape React Native passes. */
interface PressStubEvent {
	readonly nativeEvent: { readonly target: number };
	readonly timeStamp: number;
}

/** Recorded UI state, reset by {@link resetUiStub}. */
export const uiState: {
	/** URLs handed to `Linking.openURL`. */
	opened: string[];
	/** Strings handed to `announceForAccessibility`, oldest first. */
	announcements: string[];
	/** Live reduce-motion preference. */
	reduceMotion: boolean;
	/** Live screen-reader preference. */
	screenReader: boolean;
	/** Color scheme reported by `useColorScheme`. */
	colorScheme: 'dark' | 'light' | null;
	/** Window the components lay out against. */
	window: { fontScale: number; height: number; scale: number; width: number };
	/** Subscriptions handed to `AccessibilityInfo.addEventListener`. */
	accessibilityListeners: Map<string, Set<Listener>>;
	/** Value reported by `StatusBar.currentHeight`, in density-independent pixels. */
	statusBarHeight: number | null;
} = {
	accessibilityListeners: new Map(),
	announcements: [],
	colorScheme: 'light',
	opened: [],
	reduceMotion: false,
	screenReader: false,
	statusBarHeight: null,
	window: { fontScale: 1, height: 844, scale: 3, width: 390 },
};

/** Recorded animation state, reset by {@link resetUiStub}. */
export const animationState: {
	/** Times a timing or spring animation was started. */
	starts: number;
	/** Durations handed to every animation, in order. */
	durations: number[];
	/** Times an animation ran with `useNativeDriver` on the JS thread. */
	jsDriverStarts: number;
	/** Whether the most recent animation was interrupted. */
	lastInterrupted: boolean;
} = { durations: [], jsDriverStarts: 0, lastInterrupted: false, starts: 0 };

/** Recorded back-button state. */
export const backState: {
	/** Live `hardwareBackPress` listeners, most recently added last. */
	listeners: Listener[];
} = { listeners: [] };

/** Recorded accessibility-focus calls, oldest first. */
export const focusState: { tags: number[] } = { tags: [] };

const nodeHandles = new WeakMap<object, number>();
let nextNodeHandle = 1;

/**
 * Stand-in for `findNodeHandle`.
 *
 * @param instance - A host instance, which in this stub is a DOM node.
 * @returns A stable tag, or `null` for a value that was never mounted.
 */
export const findNodeHandle = function findNodeHandle(
	instance: unknown
): number | null {
	if (typeof instance !== 'object' || instance === null) {
		return null;
	}

	const known = nodeHandles.get(instance);

	if (known !== undefined) {
		return known;
	}

	const handle = nextNodeHandle;

	nextNodeHandle += 1;
	nodeHandles.set(instance as object, handle);

	return handle;
};

/** Recorded navigation state. */
export const linking: { opened: string[] } = { opened: [] };

/** Platform override, so an Android-only path can be exercised. */
export const platform: { os: 'android' | 'ios' | 'web' } = { os: 'ios' };

export const Platform: {
	OS: 'android' | 'ios' | 'web';
	select: <T>(specifics: Record<string, T> & { default?: T }) => T | undefined;
} = {
	OS: 'ios',
	select(specifics) {
		return specifics[platform.os] ?? specifics.default;
	},
};

/** Restore every recorded piece of UI state. */
export const resetUiStub = function resetUiStub(): void {
	uiState.announcements = [];
	uiState.accessibilityListeners = new Map();
	uiState.colorScheme = 'light';
	uiState.opened = [];
	uiState.reduceMotion = false;
	uiState.screenReader = false;
	uiState.window = { fontScale: 1, height: 844, scale: 3, width: 390 };
	uiState.statusBarHeight = null;
	animationState.durations = [];
	animationState.starts = 0;
	animationState.jsDriverStarts = 0;
	animationState.lastInterrupted = false;
	backState.listeners = [];
	focusState.tags = [];
	linking.opened = [];
	platform.os = 'ios';
	// `Platform.OS` is a mutable property the components read directly, so it has
	// to come back with everything else or the next case inherits the platform.
	Platform.OS = 'ios';
};

/**
 * Change the live reduce-motion preference and notify listeners, the way
 * `Settings > Accessibility` does on a device.
 *
 * @param value - Whether motion is reduced.
 */
export const setReduceMotion = function setReduceMotion(value: boolean): void {
	uiState.reduceMotion = value;

	for (const listener of [
		...(uiState.accessibilityListeners.get('reduceMotionChanged') ?? []),
	]) {
		// Real React Native hands the subscriber the new preference, and a hook
		// that stores it needs the argument to store something true.
		listener(value);
	}
};

/**
 * Change the live font scale, which is what Android's font-size setting moves.
 *
 * @param value - New `fontScale`.
 */
export const setFontScale = function setFontScale(value: number): void {
	uiState.window = { ...uiState.window, fontScale: value };
};

/** Live `useColorScheme` subscribers, the way `Appearance` has listeners. */
const schemeListeners = new Set<() => void>();

/**
 * Change the reported color scheme and notify anyone reading it.
 *
 * @param value - New scheme, or `null` for unspecified.
 */
export const setColorScheme = function setColorScheme(
	value: 'dark' | 'light' | null
): void {
	uiState.colorScheme = value;

	for (const listener of [...schemeListeners]) {
		listener();
	}
};

/**
 * Press the Android hardware back button.
 *
 * @returns `true` when a listener handled it, matching `BackHandler.pressBack`.
 */
export const pressBack = function pressBack(): boolean {
	for (const listener of [...backState.listeners].reverse()) {
		if (listener() === true) {
			return true;
		}
	}

	return false;
};

/* ------------------------------------------------------------------ styles */

/** A React Native style value, in the shapes components actually pass. */
type StyleValue =
	| false
	| null
	| number
	| Record<string, unknown>
	| readonly unknown[]
	| string
	| undefined;

/** Flatten a style prop, resolving render-prop styles against a state. */
const flattenStyle = function flattenStyle(
	style: StyleValue,
	state: Record<string, unknown>
): Record<string, unknown> {
	if (style === null || style === undefined || style === false) {
		return {};
	}

	if (typeof style === 'function') {
		return flattenStyle(
			(style as (given: Record<string, unknown>) => StyleValue)(state),
			state
		);
	}

	if (Array.isArray(style)) {
		return Object.assign(
			{},
			...style.map((entry) => flattenStyle(entry as StyleValue, state))
		);
	}

	if (typeof style === 'object') {
		return style as Record<string, unknown>;
	}

	return {};
};

/** Keep the layout facts a DOM node can carry, and the ones a test reads. */
/**
 * The style properties a test is allowed to read back off a node.
 *
 * Held to the handful of facts that actually distinguish one render from
 * another, which keeps the recorded attribute small and the reader honest about
 * what the stand-in does not model.
 */
const RECORDED_STYLE_KEYS = [
	'alignItems',
	'backgroundColor',
	'bottom',
	'color',
	'flex',
	'flexDirection',
	'flexShrink',
	'fontWeight',
	'gap',
	'justifyContent',
	'left',
	'marginTop',
	'maxHeight',
	'minHeight',
	'padding',
	'paddingBottom',
	'paddingTop',
	'paddingHorizontal',
	'paddingVertical',
	'paddingLeft',
	'paddingRight',
	'position',
	'right',
	'rowGap',
	'top',
	'width',
] as const;

const styleAttribute = function styleAttribute(
	style: StyleValue,
	state: Record<string, unknown> = {}
): string {
	const flat = flattenStyle(style, state);
	const recorded: Record<string, unknown> = {};

	for (const key of RECORDED_STYLE_KEYS) {
		recorded[key] = flat[key] ?? null;
	}

	return JSON.stringify(recorded);
};

/* ------------------------------------------------------- accessibility map */

interface AccessibilityProps {
	readonly accessibilityLabel?: string;
	readonly accessibilityLiveRegion?: 'assertive' | 'none' | 'polite';
	readonly accessibilityRole?: string;
	readonly accessibilityState?: Record<string, boolean | undefined>;
	readonly accessibilityValue?: Record<string, unknown>;
	readonly accessibilityViewIsModal?: boolean;
	readonly accessible?: boolean;
	/** The ARIA role React Native 0.77+ reads on `role`, separate from `accessibilityRole`. */
	readonly role?: string;
	readonly testID?: string;
}

/** Map a tri-state accessibility flag onto the aria string a DOM node carries. */
const triState = function triState(
	value: boolean | undefined
): 'false' | 'true' | undefined {
	if (value === undefined) {
		return undefined;
	}

	return value ? 'true' : 'false';
};

/**
 * Translate React Native accessibility props onto DOM aria attributes.
 *
 * A stub that owes its own default role chains `props.role` in by hand; every other stub
 * gets both props right from here, which is why they travel through one function.
 */
const ariaAttributes = function ariaAttributes(
	props: AccessibilityProps
): Record<string, unknown> {
	const state = props.accessibilityState ?? {};

	return {
		'aria-busy': triState(state.busy),
		'aria-checked': triState(state.checked),
		'aria-disabled': triState(state.disabled),
		'aria-expanded': triState(state.expanded),
		'aria-label': props.accessibilityLabel,
		'aria-live': props.accessibilityLiveRegion ?? undefined,
		'aria-modal': triState(props.accessibilityViewIsModal),
		'aria-selected': triState(state.selected),
		'data-accessible': props.accessible === true ? 'true' : undefined,
		'data-focusable': props.accessible === true ? 'true' : undefined,
		// `data-rn-role` stays React Native's Android enum on purpose: it is the value a
		// platform has to be able to name, and folding `role` into it would hide the
		// difference between the two props from every test that reads this.
		'data-rn-role': props.accessibilityRole,
		'data-value':
			props.accessibilityValue === undefined
				? undefined
				: JSON.stringify(props.accessibilityValue),
		role: props.role ?? props.accessibilityRole,
	};
};

/* ---------------------------------------------------------------- surfaces */

/** Props the surface stubs share. */
interface ViewPropsStub extends AccessibilityProps {
	readonly children?: ReactNode;
	readonly collapsable?: boolean;
	readonly hitSlop?: unknown;
	readonly nextFocus?: Record<string, string>;
	readonly onLayout?: unknown;
	readonly onStartShouldSetResponder?: unknown;
	readonly onPress?: (event: PressStubEvent) => void;
	readonly pointerEvents?: 'auto' | 'box-none' | 'box-only' | 'none';
	readonly style?: StyleValue;
	readonly tabIndex?: number;
}

const makeSurface = function makeSurface(
	tag: string,
	role: string | null = null
): ComponentType<ViewPropsStub> {
	const renderSurface = (
		props: ViewPropsStub,
		ref: Ref<unknown>
	): ReactElement =>
		createElement(
			tag,
			{
				...ariaAttributes(props),
				'data-pointer-events': props.pointerEvents,
				'data-rn-style': styleAttribute(props.style),
				onClick: props.onPress,
				ref,
				role: props.role ?? props.accessibilityRole ?? role ?? undefined,
				tabIndex: props.tabIndex ?? (props.onPress ? 0 : undefined),
			},
			props.children
		);

	return forwardRef<unknown, ViewPropsStub>(renderSurface);
};

export const View = makeSurface('div');
export const SafeAreaView = makeSurface('div');
export const KeyboardAvoidingView = makeSurface('div');
export const ScrollView = makeSurface('div');

export const StyleSheet = {
	absoluteFill: { flex: 1 },
	compose: <StyleType,>(...styles: StyleType[]): StyleType =>
		Object.assign({}, ...styles) as StyleType,
	create: <T extends Record<string, unknown>>(styles: T): T => styles,
	flatten: (style: StyleValue): Record<string, unknown> =>
		flattenStyle(style, {}),
	hairlineWidth: 1,
};

/* -------------------------------------------------------------------- text */

/** Props the text stub accepts. */
interface TextPropsStub extends AccessibilityProps {
	readonly children?: ReactNode;
	readonly numberOfLines?: number;
	readonly onPress?: (event: PressStubEvent) => void;
	readonly style?: StyleValue;
}

export const Text = (props: TextPropsStub): ReactElement =>
	createElement(
		'span',
		{
			...ariaAttributes(props),
			'data-rn-style': styleAttribute(props.style),
			onClick: props.onPress,
		},
		props.children
	);

/* --------------------------------------------------------------- controls */

/** Props the pressable stub accepts. */
interface PressablePropsStub extends AccessibilityProps {
	readonly children?:
		| ReactNode
		| ((state: Record<string, boolean>) => ReactNode);
	readonly delayLongPress?: number;
	readonly disabled?: boolean;
	readonly hitSlop?: unknown;
	readonly nextFocus?: Record<string, string>;
	readonly onPress?: (event: PressStubEvent) => void;
	readonly onPressIn?: () => void;
	readonly onPressOut?: () => void;
	readonly onLongPress?: () => void;
	readonly style?: StyleValue;
	readonly tabIndex?: number;
}

const pressEvent = (): PressStubEvent => ({
	nativeEvent: { target: 1 },
	timeStamp: Date.now(),
});

export const Pressable = (props: PressablePropsStub): ReactElement => {
	const disabled = props.disabled === true;
	const isLink = props.accessibilityRole === 'link';

	const children =
		typeof props.children === 'function'
			? props.children({
					accessibilityState: false,
					focused: false,
					hovered: false,
					pressed: false,
				})
			: props.children;

	return createElement(
		isLink ? 'a' : 'button',
		{
			...ariaAttributes(props),
			'data-disabled': disabled ? 'true' : undefined,
			'data-rn-style': styleAttribute(props.style, { pressed: false }),
			disabled,
			href: isLink ? '#' : undefined,
			onClick: disabled
				? undefined
				: () => {
						props.onPressIn?.();
						props.onPress?.(pressEvent());
						props.onPressOut?.();
					},
			onContextMenu: props.onLongPress,
			type: isLink ? undefined : 'button',
		},
		children
	);
};

/** Props the switch stub accepts. */
interface SwitchPropsStub extends AccessibilityProps {
	readonly disabled?: boolean;
	readonly onValueChange?: (value: boolean) => void;
	readonly style?: StyleValue;
	readonly trackColor?: Record<string, string>;
	readonly value: boolean;
}

export const Switch = (props: SwitchPropsStub): ReactElement => {
	const disabled = props.disabled === true;

	return createElement(
		'button',
		{
			...ariaAttributes({
				...props,
				accessibilityRole: props.accessibilityRole ?? 'switch',
				accessibilityState: {
					...props.accessibilityState,
					checked: props.value,
					disabled,
				},
			}),
			'data-rn-style': styleAttribute(props.style),
			disabled,
			onClick: () => {
				props.onValueChange?.(!props.value);
			},
			type: 'button',
		},
		null
	);
};

/* ------------------------------------------------------------------ modal */

/** Props the modal stub accepts. */
interface ModalPropsStub {
	readonly children?: ReactNode;
	readonly onRequestClose?: () => void;
	readonly style?: StyleValue;
	readonly testID?: string;
	readonly transparent?: boolean;
	readonly visible: boolean;
}

export const Modal = (props: ModalPropsStub): ReactElement | null => {
	// A closed modal holds nothing, which is what makes "no layout shift while
	// hidden" observable.
	if (!props.visible) {
		return null;
	}

	return createElement(
		'div',
		{
			'aria-modal': 'true',
			'data-rn-style': styleAttribute(props.style),
			'data-transparent': props.transparent ? 'true' : undefined,
			role: 'dialog',
		},
		props.children
	);
};

/* --------------------------------------------------------------- animation */

/** Configuration accepted by the timing and spring stubs. */
interface AnimationConfig {
	readonly duration?: number;
	readonly toValue: number;
	readonly useNativeDriver?: boolean;
}

/** What a stub animation hands back from `timing` or `spring`. */
interface AnimationHandle {
	start: (
		onSettled?: (result: { finished: boolean }) => void
	) => AnimationHandle;
	stop: () => void;
}

const buildAnimation = function buildAnimation(
	value: StubAnimationValue,
	config: AnimationConfig,
	isSpring: boolean
): AnimationHandle {
	let stopped = false;

	const handle: AnimationHandle = {
		start: (onSettled) => {
			animationState.starts += 1;
			animationState.durations.push(config.duration ?? 0);

			if (isSpring) {
				animationState.lastInterrupted = false;
			}

			if (config.useNativeDriver !== true) {
				animationState.jsDriverStarts += 1;
			}

			queueMicrotask(() => {
				if (stopped) {
					onSettled?.({ finished: false });
					return;
				}

				value.value = config.toValue;
				onSettled?.({ finished: true });
			});

			return handle;
		},
		stop: () => {
			stopped = true;
			animationState.lastInterrupted = true;
		},
	};

	value.stopAnimation();

	return handle;
};

class StubAnimationValue {
	/** Current numeric value, the way `Animated.Value.value` reads. */
	public value: number;

	#pending: AnimationHandle | null = null;

	/**
	 * @param initial - Starting value.
	 */
	public constructor(initial: number) {
		this.value = initial;
	}

	/**
	 * Set the value immediately.
	 *
	 * @param value - New value.
	 */
	public setValue(value: number): void {
		this.#pending?.stop();
		this.value = value;
	}

	/**
	 * Stop whatever animation is running.
	 *
	 * @param onStopped - Called with the interruption result.
	 */
	public stopAnimation(
		onStopped?: (result: { finished: boolean }) => void
	): void {
		this.#pending?.stop();
		onStopped?.({ finished: false });
	}

	/**
	 * Animate to a value.
	 *
	 * @param config - Target and driver.
	 * @returns A startable handle.
	 */
	public timing(config: AnimationConfig): AnimationHandle {
		return buildAnimation(this, config, false);
	}

	/**
	 * Spring to a value.
	 *
	 * @param config - Target and driver.
	 * @returns A startable handle.
	 */
	public spring(config: AnimationConfig): AnimationHandle {
		return buildAnimation(this, config, true);
	}

	/**
	 * Map this value through a range.
	 *
	 * @param config - Output range.
	 * @returns An interpolant that reads the live value.
	 */
	public interpolate(config: {
		readonly inputRange: readonly number[];
		readonly outputRange: readonly (number | string)[];
	}): { __getValue: () => number; __attach: () => void; __detach: () => void } {
		const [firstInput = 0, lastInput = 1] = config.inputRange;
		const [firstOutput = 0, lastOutput = 1] = config.outputRange;

		return {
			__attach: () => undefined,
			__detach: () => undefined,
			__getValue: () => {
				const numericOutput =
					typeof firstOutput === 'number' && typeof lastOutput === 'number'
						? firstOutput +
							((this.value - firstInput) / (lastInput - firstInput || 1)) *
								(lastOutput - firstOutput)
						: firstOutput;

				return typeof numericOutput === 'number' ? numericOutput : 0;
			},
		};
	}
}

const resolveAnimatedStyle = function resolveAnimatedStyle(
	style: StyleValue
): Record<string, unknown> {
	const flat = flattenStyle(style, {});
	const resolved: Record<string, unknown> = {};

	for (const [key, entry] of Object.entries(flat)) {
		if (Array.isArray(entry)) {
			resolved[key] = entry.map((item) =>
				resolveAnimatedStyle(item as StyleValue)
			);
			continue;
		}

		if (
			entry !== null &&
			typeof entry === 'object' &&
			'__getValue' in (entry as Record<string, unknown>)
		) {
			resolved[key] = (entry as { __getValue: () => unknown }).__getValue();
			continue;
		}

		if (entry instanceof StubAnimationValue) {
			resolved[key] = entry.value;
		}
	}

	return resolved;
};

const makeAnimatedSurface = function makeAnimatedSurface(
	tag: string
): ComponentType<ViewPropsStub> {
	const AnimatedSurfaceStub = (props: ViewPropsStub): ReactElement => {
		const flat = resolveAnimatedStyle(props.style);

		return createElement(
			tag,
			{
				...ariaAttributes(props),
				'data-animated': JSON.stringify({
					opacity: flat.opacity ?? null,
					transform: flat.transform ?? null,
				}),
				'data-rn-style': styleAttribute(props.style),
				onClick: props.onPress,
			},
			props.children
		);
	};

	return AnimatedSurfaceStub;
};

export const Animated = {
	Parallel: { start: () => undefined },
	Value: StubAnimationValue,
	View: makeAnimatedSurface('div'),
	createAnimatedComponent: <PropsType,>(
		component: ComponentType<PropsType>
	): ComponentType<PropsType> => component,
	parallel: (animations: readonly AnimationHandle[]) => ({
		start: (onSettled?: (result: { finished: boolean }) => void) => {
			for (const animation of animations) {
				animation.start();
			}

			onSettled?.({ finished: true });
		},
		stop: () => undefined,
	}),
	spring: (value: StubAnimationValue, config: AnimationConfig) =>
		value.spring(config),
	timing: (value: StubAnimationValue, config: AnimationConfig) =>
		value.timing(config),
};

/* ----------------------------------------------------------- platform API */

/** Recorded result of `AccessibilityInfo.isReduceMotionEnabled`, per query. */
export const accessibilityInfo = {
	addEventListener(
		eventName: string,
		handler: (value: unknown) => Listener | undefined
	): { remove: () => void } {
		const handlers = uiState.accessibilityListeners.get(eventName) ?? new Set();
		const wrapped = (value: unknown) => handler(value);

		handlers.add(wrapped as Listener);
		uiState.accessibilityListeners.set(eventName, handlers);

		return {
			remove: () => {
				handlers.delete(wrapped as Listener);
			},
		};
	},
	announceForAccessibility(message: string): void {
		uiState.announcements.push(message);
	},
	isReduceMotionEnabled(): Promise<boolean> {
		return Promise.resolve(uiState.reduceMotion);
	},
	isScreenReaderEnabled(): Promise<boolean> {
		return Promise.resolve(uiState.screenReader);
	},
	preferredScreenReaderStatus(): Promise<boolean> {
		return Promise.resolve(uiState.screenReader);
	},
	setAccessibilityFocus(tag: number): void {
		focusState.tags.push(tag);
	},
};

export const AccessibilityInfo = accessibilityInfo;

export const BackHandler = {
	addEventListener(
		_eventName: 'hardwareBackPress',
		handler: () => boolean | null | undefined
	): { remove: () => void } {
		const wrapped = () => handler() === true;

		backState.listeners.push(wrapped);

		return {
			remove: () => {
				backState.listeners = backState.listeners.filter(
					(listener) => listener !== wrapped
				);
			},
		};
	},
};

export const Linking = {
	canOpenURL: (): Promise<boolean> => Promise.resolve(true),
	openURL(url: string): Promise<void> {
		linking.opened.push(url);
		uiState.opened.push(url);

		return Promise.resolve();
	},
};

export const Appearance = {
	addChangeListener: (): { remove: () => void } => ({
		remove: () => undefined,
	}),
	getColorScheme: (): 'dark' | 'light' | null => uiState.colorScheme,
};

/**
 * Stand-in for `StatusBar`.
 *
 * `currentHeight` reads the recorded state through a getter so a test can move
 * the band Android reports and rerender, which the real module cannot do since
 * it snapshots the constant at import.
 */
export const StatusBar = {
	get currentHeight(): number | null {
		return uiState.statusBarHeight;
	},
};

export const I18nManager = {
	forceRTL: (): void => undefined,
	isRTL: false,
};

export const Dimensions = {
	addEventListener: (): { remove: () => void } => ({ remove: () => undefined }),
	get: (): {
		fontScale: number;
		height: number;
		scale: number;
		width: number;
	} => ({
		...uiState.window,
	}),
};

export const PixelRatio = {
	get: (): number => uiState.window.scale,
	getFontScale: (): number => uiState.window.fontScale,
};

export const useColorScheme = (): 'dark' | 'light' | null =>
	useSyncExternalStore(
		(onChange) => {
			schemeListeners.add(onChange);

			return () => {
				schemeListeners.delete(onChange);
			};
		},
		() => uiState.colorScheme,
		() => uiState.colorScheme
	);

export const useWindowDimensions = (): {
	fontScale: number;
	height: number;
	scale: number;
	width: number;
} => ({ ...uiState.window });

export const useLocaleConstants = (): {
	locale: {
		calendar: string;
		collation: string;
		hourCycle: string;
		numberingSystem: string;
	};
	orientation: 'landscape' | 'portrait';
	region: string;
} => ({
	locale: {
		calendar: 'gregory',
		collation: 'standard',
		hourCycle: 'h23',
		numberingSystem: 'latn',
	},
	orientation: 'portrait',
	region: 'US',
});

/**
 * Point {@link Platform.OS} somewhere else for one test.
 *
 * @param os - Platform to report.
 */
export const setPlatformOS = function setPlatformOS(
	os: 'android' | 'ios' | 'web'
): void {
	platform.os = os;
	Platform.OS = os;
};

/**
 * Set the band Android reports for the status bar.
 *
 * @param height - Value `StatusBar.currentHeight` reports, or `null`.
 */
export const setStatusBarHeight = function setStatusBarHeight(
	height: number | null
): void {
	uiState.statusBarHeight = height;
};
