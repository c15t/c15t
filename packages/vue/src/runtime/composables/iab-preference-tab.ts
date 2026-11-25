import { ref } from 'vue';
import type { Ref } from 'vue';

import type { IabPreferenceTab } from './iabSelection';
import { useConsentKernelContext } from './kernel';

/**
 * One tab per kernel. `ConsentRoot` mounts the banner and the dialog one at a
 * time, so the tab outlives both; plain Vue's `useState` stand-in drops its
 * state once no component uses it.
 */
const tabs = new WeakMap<object, Ref<IabPreferenceTab>>();

/**
 * The preference centre tab, shared by every IAB surface on the page.
 *
 * Write this ref to change the tab. `useConsentIabSelection()` returns a
 * fresh object on every read, so setting `preferenceCenterTab` on it is
 * lost. Kept out of the composables index so Nuxt does not auto-import it.
 *
 * @returns The shared tab ref.
 * @internal
 */
export const useIabPreferenceTab =
	function useIabPreferenceTab(): Ref<IabPreferenceTab> {
		const { kernel } = useConsentKernelContext();
		let tab = tabs.get(kernel);
		if (!tab) {
			tab = ref<IabPreferenceTab>('purposes');
			tabs.set(kernel, tab);
		}
		return tab;
	};
