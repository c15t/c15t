import { setupFocusTrap } from '@c15t/ui/utils';
import type { FocusTrapOptions } from '@c15t/ui/utils';

/** `true`/`false`, or an object that also says where focus starts. */
export type FocusTrapParams =
	| boolean
	| (FocusTrapOptions & { enabled: boolean });

const resolve = function resolve(params: FocusTrapParams) {
	return typeof params === 'boolean'
		? { enabled: params, options: {} }
		: {
				enabled: params.enabled,
				options: { initialFocus: params.initialFocus },
			};
};

/**
 * Svelte action that traps keyboard focus within a container.
 * Wraps @c15t/ui's framework-agnostic setupFocusTrap.
 */
export const focusTrap = function focusTrap(
	node: HTMLElement,
	params: FocusTrapParams = true
) {
	let cleanup: (() => void) | undefined;

	const start = (next: FocusTrapParams) => {
		const { enabled, options } = resolve(next);
		if (enabled) {
			cleanup = setupFocusTrap(node, options);
		}
	};
	start(params);

	return {
		destroy() {
			cleanup?.();
		},
		update(next: FocusTrapParams) {
			cleanup?.();
			cleanup = undefined;
			start(next);
		},
	};
};
