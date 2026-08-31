import { setupScrollLock } from '@c15t/ui/utils';

/**
 * Svelte action that locks document scrolling when enabled.
 * Wraps @c15t/ui's framework-agnostic setupScrollLock.
 */
export const scrollLock = function scrollLock(
	_node: HTMLElement,
	enabled = true
) {
	let cleanup: (() => void) | undefined;

	if (enabled) {
		cleanup = setupScrollLock();
	}

	return {
		destroy() {
			cleanup?.();
		},
		update(newEnabled: boolean) {
			cleanup?.();
			cleanup = undefined;
			if (newEnabled) {
				cleanup = setupScrollLock();
			}
		},
	};
};
