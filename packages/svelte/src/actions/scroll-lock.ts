import { setupScrollLock } from '@c15t/ui/utils';

/**
 * Svelte action that locks document scrolling when enabled.
 * Wraps @c15t/ui's framework-agnostic setupScrollLock.
 */
export function scrollLock(_node: HTMLElement, enabled: boolean = true) {
	let cleanup: (() => void) | undefined;

	if (enabled) {
		cleanup = setupScrollLock();
	}

	return {
		update(newEnabled: boolean) {
			cleanup?.();
			cleanup = undefined;
			if (newEnabled) {
				cleanup = setupScrollLock();
			}
		},
		destroy() {
			cleanup?.();
		},
	};
}
