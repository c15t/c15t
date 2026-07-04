import { useScrollLock } from '@vueuse/core';
import { type ComputedRef, onMounted, onUnmounted, watch } from 'vue';

export function useConsentScrollLock(shouldLock: ComputedRef<boolean>): void {
	onMounted(() => {
		const el = (document.scrollingElement ??
			document.documentElement) as HTMLElement;
		const isScrollLocked = useScrollLock(el);
		const stop = watch(
			shouldLock,
			(locked) => {
				isScrollLocked.value = locked;
			},
			{ immediate: true }
		);
		onUnmounted(stop);
	});
}
