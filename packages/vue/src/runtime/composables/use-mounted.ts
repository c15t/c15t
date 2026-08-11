import { onMounted, type Ref, ref } from 'vue';

/**
 * Track whether the consuming component has mounted.
 *
 * SSR-safe: the ref stays `false` during server rendering and flips to
 * `true` in the browser once the component mounts.
 *
 * @returns A ref that becomes `true` after mount
 */
export function useMounted(): Ref<boolean> {
	const mounted = ref(false);

	onMounted(() => {
		mounted.value = true;
	});

	return mounted;
}
