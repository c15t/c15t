import { setupFocusTrap } from '@c15t/ui/utils';
import type { FocusTrapOptions } from '@c15t/ui/utils';
import { onBeforeUnmount, watch } from 'vue';
import type { Ref } from 'vue';

export const useFocusTrap = function useFocusTrap(
	container: Ref<HTMLElement | null>,
	active: () => boolean,
	options: FocusTrapOptions = {}
): void {
	if (typeof document === 'undefined') {
		return;
	}

	let cleanup: (() => void) | undefined;

	const stopTrap = function stopTrap() {
		cleanup?.();
		cleanup = undefined;
	};

	watch(
		() => [active(), container.value] as const,
		([isActive, element]) => {
			stopTrap();
			if (isActive && element) {
				cleanup = setupFocusTrap(element, options);
			}
		},
		{ flush: 'post', immediate: true }
	);

	onBeforeUnmount(stopTrap);
};
