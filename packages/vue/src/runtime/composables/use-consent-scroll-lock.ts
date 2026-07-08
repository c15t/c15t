import { setupScrollLock } from '@c15t/ui/utils';
import { type ComputedRef, onMounted, onUnmounted, watch } from 'vue';

export function useConsentScrollLock(shouldLock: ComputedRef<boolean>): void {
	onMounted(() => {
		let cleanup: (() => void) | undefined;
		function unlock() {
			cleanup?.();
			cleanup = undefined;
		}

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
}
