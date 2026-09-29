/**
 * Enter and exit motion for a consent surface.
 *
 * The animation lives on one `Animated.Value` driven by the native driver, so a
 * frame costs no React render: state moves twice at most, once to mount the
 * surface and once to unmount it after the exit finishes. Under reduced motion
 * the same code path runs with a one-millisecond duration, which keeps a single
 * reveal implementation rather than a second render branch.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated } from 'react-native';
import type { ViewProps } from 'react-native';

/** Animated style shape accepted by `Animated.View`. */
export type AnimatedViewStyle = Animated.AnimatedProps<ViewProps>['style'];

/** What {@link usePromptMotion} hands a surface. */
export interface PromptMotion {
	/** Whether the surface is in the tree at all. */
	readonly rendered: boolean;
	/** Style to apply to the animated container. */
	readonly motionStyle: AnimatedViewStyle;
}

/** Timing and travel for one surface. */
export interface PromptMotionOptions {
	/**
	 * The axis the surface travels along.
	 *
	 * `y` is the lift a banner, a dialog, and a bottom sheet all enter with. `x`
	 * is what a full-page drawer uses, because a page arrives from the side it is
	 * pushed in from rather than from the bottom of the screen. The distance is
	 * signed either way, so the caller decides which end of the axis sits off
	 * screen: that is the only place a left-to-right assumption can live.
	 *
	 * Defaults to `'y'`, which leaves every surface that predates the drawer on
	 * the travel it was measured with.
	 */
	readonly axis?: 'x' | 'y';
	/** `true` when the device asks for reduced motion. */
	readonly reducedMotion: boolean;
	/** Distance travelled on entry, in pixels. */
	readonly distance: number;
	/** Enter duration in ms. */
	readonly enterDuration: number;
	/** Exit duration in ms. */
	readonly exitDuration: number;
}

/** One reveal with no travel, for a surface that fades in place. */
export const FADE_ONLY = 0;

/** Duration used when the device asks for reduced motion, in ms. */
const REDUCED_MOTION_DURATION = 1;

/**
 * Pick the duration for one transition.
 *
 * @param open - Whether the surface is opening.
 * @param reducedMotion - Whether the device asks for reduced motion.
 * @param enterDuration - Duration to use when opening.
 * @param exitDuration - Duration to use when closing.
 * @returns Milliseconds the animation should run for.
 */
const resolveDuration = function resolveDuration(
	open: boolean,
	reducedMotion: boolean,
	enterDuration: number,
	exitDuration: number
): number {
	if (reducedMotion) {
		return REDUCED_MOTION_DURATION;
	}

	return open ? enterDuration : exitDuration;
};

/**
 * Animate a surface in and out.
 *
 * @param open - Whether the surface should be showing.
 * @param options - Durations and travel distance.
 * @returns Whether to render, and the style to render with.
 */
export const usePromptMotion = function usePromptMotion(
	open: boolean,
	{
		axis = 'y',
		distance,
		enterDuration,
		exitDuration,
		reducedMotion,
	}: PromptMotionOptions
): PromptMotion {
	// Owned by the render rather than a ref: the animated style below reads it,
	// and one instance has to survive every re-render underneath it.
	const progress = useMemo(() => new Animated.Value(0), []);
	const [mounted, setMounted] = useState(open);

	// Whether the surface is on its way out. Written from the effect only, and
	// read from the animation callback, which is the only place a surface is
	// allowed to leave the tree.
	const closingRef = useRef(!open);
	// Whether the surface has ever been revealed. A surface that was never shown
	// has no exit to animate.
	const revealedRef = useRef(open);

	if (open && !mounted) {
		// React restarts this render immediately, so the surface appears in the
		// same commit rather than one effect later.
		setMounted(true);
	}

	useEffect(() => {
		closingRef.current = !open;

		if (open) {
			revealedRef.current = true;
		} else if (!revealedRef.current) {
			return;
		}

		const animation = Animated.timing(progress, {
			duration: resolveDuration(
				open,
				reducedMotion,
				enterDuration,
				exitDuration
			),
			toValue: open ? 1 : 0,
			useNativeDriver: true,
		});

		animation.start(({ finished }) => {
			if (finished && closingRef.current) {
				revealedRef.current = false;
				setMounted(false);
			}
		});

		return () => {
			animation.stop();
		};
	}, [enterDuration, exitDuration, open, progress, reducedMotion]);

	// One `Animated.Value` drives whichever axis was asked for, so a drawer that
	// slides sideways and a sheet that lifts are the same reveal with the same
	// reduced-motion collapse, rather than a second animation to keep in step.
	const travel = progress.interpolate({
		inputRange: [0, 1],
		outputRange: [distance, 0],
	});

	const motionStyle: AnimatedViewStyle = {
		opacity: progress,
		transform: [axis === 'x' ? { translateX: travel } : { translateY: travel }],
	};

	return { motionStyle, rendered: mounted };
};
