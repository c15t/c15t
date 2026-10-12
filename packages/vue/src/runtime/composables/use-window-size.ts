import { getCurrentScope, onScopeDispose, ref } from 'vue';
import type { Ref } from 'vue';

export interface UseWindowSizeReturn {
	/** Viewport width in pixels. */
	width: Ref<number>;
	/** Viewport height in pixels. */
	height: Ref<number>;
}

/**
 * Reactive viewport dimensions.
 *
 * SSR-safe: both refs start at `0` on the server. In the browser they are
 * set synchronously on creation and updated on every window `resize`; the
 * listener is removed when the consuming scope is disposed.
 *
 * @returns Reactive `width` and `height` of the window
 */
export const useWindowSize = function useWindowSize(): UseWindowSizeReturn {
	const width = ref(0);
	const height = ref(0);

	if (typeof window !== 'undefined') {
		const update = () => {
			width.value = window.innerWidth;
			height.value = window.innerHeight;
		};

		update();
		window.addEventListener('resize', update, { passive: true });

		if (getCurrentScope()) {
			onScopeDispose(() => {
				window.removeEventListener('resize', update);
			});
		}
	}

	return { height, width };
};
