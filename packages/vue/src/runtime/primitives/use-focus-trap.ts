/**
 * Minimal focus trap (RFC 0003 — own primitives).
 *
 * Ported semantics from the audited React dialog implementation:
 * - Tab/Shift+Tab cycle within the container (loop)
 * - focus moves into the container when the trap activates
 * - focus restores to the previously-focused element on deactivate/unmount
 *
 * Framework-agnostic behavior contract is covered by the conformance
 * suite's a11y invariants; keep this file dependency-free.
 */
import { onBeforeUnmount, type Ref, watch } from 'vue';

const FOCUSABLE_SELECTOR = [
	'a[href]',
	'button:not([disabled])',
	'input:not([disabled])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'[tabindex]:not([tabindex="-1"])',
].join(', ');

function getFocusable(root: HTMLElement): HTMLElement[] {
	return Array.from(
		root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
	).filter(
		(el) =>
			el === document.activeElement ||
			el.offsetParent !== null ||
			el.getClientRects().length > 0
	);
}

export interface UseFocusTrapOptions {
	/** Wrap from last→first (and first→last on Shift+Tab). */
	loop: () => boolean;
}

export function useFocusTrap(
	container: Ref<HTMLElement | null>,
	active: () => boolean,
	options: UseFocusTrapOptions
) {
	// SSR: no document, no focus — return an inert handler. The trap
	// activates on the client via the immediate watch after hydration.
	if (typeof document === 'undefined') {
		return { onKeydown: (_event: KeyboardEvent) => {} };
	}
	let previouslyFocused: HTMLElement | null = null;

	function focusContainer() {
		const root = container.value;
		if (!root) {
			return;
		}
		root.focus({ preventScroll: true });
	}

	function restore() {
		if (previouslyFocused?.isConnected) {
			previouslyFocused.focus({ preventScroll: true });
		}
		previouslyFocused = null;
	}

	function onKeydown(event: KeyboardEvent) {
		if (!active() || event.key !== 'Tab') {
			return;
		}
		const root = container.value;
		if (!root) {
			return;
		}
		const els = getFocusable(root);
		if (els.length === 0) {
			event.preventDefault();
			return;
		}
		const first = els[0] as HTMLElement;
		const last = els[els.length - 1] as HTMLElement;
		const current = document.activeElement as HTMLElement | null;
		const inside = current ? root.contains(current) : false;

		if (event.shiftKey) {
			if (!inside || current === root || current === first) {
				event.preventDefault();
				if (options.loop()) {
					last.focus({ preventScroll: true });
				}
			}
		} else if (!inside || current === last) {
			event.preventDefault();
			if (options.loop()) {
				first.focus({ preventScroll: true });
			}
		}
	}

	watch(
		active,
		(isActive, wasActive) => {
			if (isActive && !wasActive) {
				previouslyFocused = document.activeElement as HTMLElement | null;
				// Wait a tick so the surface is rendered before focusing into it.
				requestAnimationFrame(() => {
					if (active()) {
						focusContainer();
					}
				});
			} else if (!isActive && wasActive) {
				restore();
			}
		},
		{ immediate: true, flush: 'post' }
	);

	onBeforeUnmount(() => {
		if (active()) {
			restore();
		}
	});

	return { onKeydown };
}
