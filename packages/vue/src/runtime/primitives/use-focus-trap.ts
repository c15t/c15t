import { setupFocusTrap } from '@c15t/ui/utils';
import { onBeforeUnmount, type Ref, watch } from 'vue';

export function useFocusTrap(
	container: Ref<HTMLElement | null>,
	active: () => boolean
): void {
	if (typeof document === 'undefined') {
		return;
	}

	let cleanup: (() => void) | undefined;

	function stopTrap() {
		cleanup?.();
		cleanup = undefined;
	}

	watch(
		() => [active(), container.value] as const,
		([isActive, element]) => {
			stopTrap();
			if (isActive && element) {
				cleanup = setupFocusTrap(element);
			}
		},
		{ immediate: true, flush: 'post' }
	);

	onBeforeUnmount(stopTrap);
}
