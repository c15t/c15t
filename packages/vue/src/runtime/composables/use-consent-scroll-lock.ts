import { setupScrollLock } from '@c15t/ui/utils';
import { onMounted, onUnmounted, watch } from 'vue';
import type { ComputedRef } from 'vue';

export const useConsentScrollLock = function useConsentScrollLock(
	shouldLock: ComputedRef<boolean>
): void {
	onMounted(() => {
		let cleanup: (() => void) | undefined;
		const unlock = function unlock() {
			cleanup?.();
			cleanup = undefined;
		};

		const stop = watch(
			shouldLock,
			(locked) => {
				if (locked && !cleanup) {
					cleanup = setupScrollLock();
				} else if (!locked) {
					unlock();
				}
			},
			{ immediate: true }
		);
		onUnmounted(() => {
			stop();
			unlock();
		});
	});
};
