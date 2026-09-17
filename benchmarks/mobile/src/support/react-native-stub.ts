/**
 * The `react-native` exports `@c15t/react-native` touches at import time.
 *
 * Vitest and `tsx` swap `react-native` for this file through a resolve alias.
 * The package's own production lookup path runs unchanged: `TurboModuleRegistry`
 * hands back whatever was registered, and `NativeEventEmitter` records who is
 * listening so a measurement can assert a subscription really is live.
 */

// React Native's own API shape: animations report completion through a
// callback, not a promise. Matching that shape is the point of a stub.
/* eslint-disable promise/prefer-await-to-callbacks */

import { createElement } from 'react';
import type { ReactNode } from 'react';

import type { CompletionCallback } from './animated-value';
import { AnimatedValue } from './animated-value';

/**
 * A host component that renders its children under one intrinsic tag.
 *
 * The bench never renders the package's UI, but the module graph links the
 * components, and a harness that renders one by accident should still see its
 * own tree rather than a link error. react-test-renderer accepts intrinsic tags.
 *
 * @param tag - Intrinsic element name to render.
 * @returns A component the renderers accept.
 */
const hostComponent = function hostComponent(tag: string) {
	return function HostComponent(props: { children?: ReactNode }): ReactNode {
		return createElement(tag, null, props.children);
	};
};

/** One registered native-event listener. */
type EventHandler = (payload: unknown) => void;

/** Modules registered under a name, keyed by name. */
const registry = new Map<string, unknown>();

/** Live listeners per event name. */
const listeners = new Map<string, Set<EventHandler>>();

/** How many emitters were constructed, so a run can prove it built one. */
export const emitterCount = { value: 0 };

/** The `TurboModuleRegistry` surface the bridge uses. */
export const TurboModuleRegistry = {
	get: <ModuleType>(moduleName: string): ModuleType | null =>
		(registry.get(moduleName) ?? null) as ModuleType | null,
	getEnforcing: <ModuleType>(moduleName: string): ModuleType => {
		const candidate = registry.get(moduleName);
		if (candidate === undefined) {
			throw new Error(
				`TurboModuleRegistry.getEnforcing: '${moduleName}' could not be found.`
			);
		}
		return candidate as ModuleType;
	},
};

/** The `NativeEventEmitter` surface the bridge uses. */
export class NativeEventEmitter {
	constructor(_nativeModule?: unknown) {
		emitterCount.value += 1;
	}

	// Subscribe-and-return-a-subscription is the emitter's shape; there is no
	// promise to await and the registry, not the instance, holds the handlers.
	// eslint-disable-next-line class-methods-use-this
	addListener(
		eventName: string,
		handler: EventHandler
	): { remove: () => void } {
		const handlers = listeners.get(eventName) ?? new Set();
		handlers.add(handler);
		listeners.set(eventName, handlers);

		return {
			remove: () => {
				handlers.delete(handler);
			},
		};
	}
}

/**
 * The value exports of `react-native` that `@c15t/react-native` imports.
 *
 * The package's public entry pulls the headless components, and those reach the
 * platform helpers below. Each one answers the way a device would with no
 * assistive technology running and no animation in flight, so the module graph
 * links without a React Native runtime.
 */

/** `AccessibilityInfo`, reduced to what the package subscribes to. */
export const AccessibilityInfo = {
	addEventListener: (_eventName: string, _handler: () => void) => ({
		remove: () => undefined,
	}),
	announceForAccessibility: () => undefined,
	isReduceMotionEnabled: () => Promise.resolve(false),
	isScreenReaderEnabled: () => Promise.resolve(false),
	removeEventListener: (_eventName: string, _handler: () => void) => undefined,
};

/** `Animated`, reduced to the timing path the motion hook takes. */
export const Animated = {
	Value: AnimatedValue,
	View: hostComponent('rnbench-animated-view'),
	spring: (value: AnimatedValue, config: { toValue?: number }) => ({
		start: (callback?: CompletionCallback) => {
			value.setValue(config.toValue ?? value.value);
			callback?.({ finished: true });
		},
		stop: () => undefined,
	}),
	timing: (value: AnimatedValue, config: { toValue?: number }) => ({
		start: (callback?: CompletionCallback) => {
			value.setValue(config.toValue ?? value.value);
			callback?.({ finished: true });
		},
		stop: () => undefined,
	}),
};

/** `BackHandler`, recording handlers rather than wiring a real back button. */
export const BackHandler = {
	addEventListener: (_eventName: string, _handler: () => boolean) => ({
		remove: () => undefined,
	}),
	exitApp: () => undefined,
};

/** `Platform`, pinned to iOS, which is the surface the contract describes first. */
export const Platform = {
	Version: '18.0',
	os: 'ios' as const,
	select: <SelectedType>(
		map: Record<string, SelectedType | undefined>
	): SelectedType | undefined => map.ios ?? map.default,
};

/**
 * `findNodeHandle`, handing out stable tags.
 *
 * react-test-renderer has no host handles, so a monotonically increasing tag is
 * the faithful answer: the package only uses it to focus something it rendered.
 */
let nextNodeHandle = 1;
export const findNodeHandle = function findNodeHandle(
	_instance: unknown
): number {
	nextNodeHandle += 1;
	return nextNodeHandle - 1;
};

/** `useColorScheme`, fixed so a render count is not also a theme test. */
export const useColorScheme = function useColorScheme(): 'light' | 'dark' {
	return 'light';
};

/** `useWindowDimensions`, fixed to an iPhone-class viewport. */
export const useWindowDimensions = function useWindowDimensions(): {
	fontScale: number;
	height: number;
	scale: number;
	width: number;
} {
	return { fontScale: 1, height: 844, scale: 3, width: 390 };
};

/** `Pressable`, enough for the module graph and an accidental render. */
export const Pressable = hostComponent('rnbench-pressable');
/** `Text`. */
export const Text = hostComponent('rnbench-text');
/** `View`. */
export const View = hostComponent('rnbench-view');
/** `ScrollView`. */
export const ScrollView = hostComponent('rnbench-scroll');
/** `Switch`, reporting `false` rather than a real thumb position. */
export const Switch = hostComponent('rnbench-switch');
/** `Modal`, rendered inline because there is no window to present over. */
export const Modal = hostComponent('rnbench-modal');
/** `KeyboardAvoidingView`. */
export const KeyboardAvoidingView = hostComponent('rnbench-keyboard');

/** A style object, as far as the bench needs to model one. */
type Style = Record<string, unknown>;

/** `StyleSheet`, with the one member the package reads. */
export const StyleSheet = {
	absoluteFill: {
		bottom: 0,
		left: 0,
		position: 'absolute',
		right: 0,
		top: 0,
	} as Style,
	absoluteFillObject: {
		bottom: 0,
		left: 0,
		position: 'absolute',
		right: 0,
		top: 0,
	} as Style,
	create: <StyleType extends Record<string, unknown>>(
		styles: StyleType
	): StyleType => styles,
	flatten: (style: unknown): unknown => style,
};

/**
 * Register a module under the name the bridge looks it up by.
 *
 * @param moduleName - Registration name.
 * @param module - The fake module.
 */
export const setNativeModule = function setNativeModule(
	moduleName: string,
	module: unknown
): void {
	registry.set(moduleName, module);
};

/**
 * Deliver a native event to every listener, the way the core does.
 *
 * @param eventName - One of the protocol event names.
 * @param payload - Payload to deliver.
 */
export const emitNativeEvent = function emitNativeEvent(
	eventName: string,
	payload: unknown
): void {
	for (const handler of [...(listeners.get(eventName) ?? [])]) {
		handler(payload);
	}
};

/**
 * Count live listeners for one event.
 *
 * @param eventName - Event name.
 * @returns Listener count.
 */
export const nativeListenerCount = function nativeListenerCount(
	eventName: string
): number {
	return listeners.get(eventName)?.size ?? 0;
};

/** Drop every module and listener. */
export const resetNativeStub = function resetNativeStub(): void {
	registry.clear();
	listeners.clear();
	emitterCount.value = 0;
};
