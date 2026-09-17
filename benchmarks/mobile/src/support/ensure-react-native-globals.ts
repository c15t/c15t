/**
 * Host globals React Native provides and Node does not.
 *
 * `useModalA11y` focuses the sheet it just opened through `requestAnimationFrame`,
 * which is a host function rather than an import, so the resolve alias in
 * `vitest.config.ts` cannot supply it and the banner throws
 * `requestAnimationFrame is not defined` on its first effect.
 *
 * The substitute runs the callback on the next macrotask, which is the ordering a
 * frame has: after the current work, before whatever comes after it. Nothing here
 * claims to model a display link; the focus call it carries is a no-op against the
 * stub's `AccessibilityInfo` anyway.
 *
 * @returns The names this file installed, empty when the host already had them.
 */

/** A frame callback, as React Native's host declares it. */
type FrameCallback = (time: number) => void;

interface FrameGlobals {
	cancelAnimationFrame?: (handle: number) => void;
	requestAnimationFrame?: (callback: FrameCallback) => number;
}

/* eslint-disable promise/prefer-await-to-callbacks -- the browser API this stands in for is callback-shaped. */

/**
 * Install the frame scheduler if the environment has none.
 *
 * @returns Names installed, so a caller can report or assert them.
 */
export const ensureReactNativeGlobals =
	function ensureReactNativeGlobals(): string[] {
		const host = globalThis as unknown as FrameGlobals;
		const installed: string[] = [];

		if (typeof host.requestAnimationFrame === 'function') {
			return installed;
		}

		const pending = new Map<number, ReturnType<typeof setTimeout>>();
		let nextHandle = 1;

		host.requestAnimationFrame = (callback: FrameCallback): number => {
			const handle = nextHandle;
			nextHandle += 1;
			pending.set(
				handle,
				setTimeout(() => {
					pending.delete(handle);
					callback(performance.now());
				}, 0)
			);
			return handle;
		};

		host.cancelAnimationFrame = (handle: number): void => {
			const timer = pending.get(handle);
			if (timer !== undefined) {
				clearTimeout(timer);
				pending.delete(handle);
			}
		};

		installed.push('requestAnimationFrame', 'cancelAnimationFrame');
		return installed;
	};
