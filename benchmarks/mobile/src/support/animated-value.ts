/**
 * `Animated.Value` and one animation, reduced to the path the package's motion
 * hook actually takes.
 *
 * It lives apart from the React Native stub because the stub is already the
 * largest file in the harness, and a value class with an animation lifecycle is
 * its own concern.
 */

// React Native's animation API is callback-shaped: `start` reports completion
// through a callback, and a stub that returned a promise would not be the API
// the motion hook under test calls.
/* eslint-disable promise/prefer-await-to-callbacks */

/** The completion callback shape React Native hands an animation's `start`. */
export type CompletionCallback = (state: { finished: boolean }) => void;

/**
 * A number that animates, or rather pretends to.
 *
 * The stub answers every animation as already finished, which is the honest
 * model of a benchmark host: nothing is on screen, so nothing is in flight.
 */
export class AnimatedValue {
	/** Current value, the way `Animated.Value.value` is read directly. */
	value: number;
	/** Handle of the running listener, so `removeListener` has something to drop. */
	private listenerId: string | undefined;

	constructor(initial = 0) {
		this.value = initial;
	}

	setValue(toValue: number): this {
		this.value = toValue;
		return this;
	}

	interpolate(config: { outputRange?: number[]; inputRange?: number[] }): this {
		this.value = config.outputRange?.[0] ?? this.value;
		return this;
	}

	start(callback?: CompletionCallback): this {
		callback?.({ finished: true });
		return this;
	}

	stopAnimation(): this {
		return this;
	}

	addListener(): string {
		this.listenerId = 'bench';
		return this.listenerId;
	}

	removeListener(): void {
		this.listenerId = undefined;
	}
}
