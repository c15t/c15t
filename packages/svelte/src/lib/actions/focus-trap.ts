import { setupFocusTrap } from '@c15t/ui/utils';

/**
 * Svelte action that traps keyboard focus within a container.
 * Wraps @c15t/ui's framework-agnostic setupFocusTrap.
 */
export function focusTrap(node: HTMLElement, enabled = true) {
	let cleanup: (() => void) | undefined;

	if (enabled) {
		cleanup = setupFocusTrap(node);
	}

	return {
		update(newEnabled: boolean) {
			cleanup?.();
			cleanup = undefined;
			if (newEnabled) {
				cleanup = setupFocusTrap(node);
			}
		},
		destroy() {
			cleanup?.();
		},
	};
}
