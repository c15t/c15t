import { isLateEntry } from '@c15t/ui/utils/late-entry';
import { ref, watch } from 'vue';
import type { Ref, WatchSource } from 'vue';

/**
 * Whether a banner that opens now arrives after the page has painted.
 *
 * Decided each time `open` turns on and held until it next opens, so a
 * re-render never restarts the entry. A banner already open at setup,
 * including one hydrated from server HTML, is part of the first paint and
 * stays unmarked; that also keeps hydration matching the server markup.
 *
 * @param open - Whether the banner is rendered.
 * @returns A ref that is `true` when the mount should carry
 * `data-entry="late"`.
 */
export const useLateEntry = function useLateEntry(
	open: WatchSource<boolean>
): Readonly<Ref<boolean>> {
	const late = ref(false);
	watch(open, (isOpen, wasOpen) => {
		if (isOpen && !wasOpen) {
			late.value = isLateEntry();
		}
	});
	return late;
};
