/**
 * The `PreferenceItem` primitive's shared state.
 *
 * A port of the Svelte primitive, which is itself the React one: same
 * `data-slot` names, same `data-state`, same collapsing three-element
 * content. Vue's IAB rows used to inline their own trigger and content, so
 * they carried none of that bookkeeping and could not be compared against
 * the other adapters' rows.
 */

import type { ComputedRef, InjectionKey, Ref } from 'vue';
import { inject, provide } from 'vue';

/** What the sub-components read off the root. */
export interface PreferenceItemContextValue {
	contentId: string;
	disabled: ComputedRef<boolean>;
	noStyle: ComputedRef<boolean>;
	open: Ref<boolean>;
	triggerId: string;
	toggle: () => void;
}

export const preferenceItemKey: InjectionKey<PreferenceItemContextValue> =
	Symbol('c15t-vue-preference-item');

/**
 * Publish the root's state to its sub-components.
 *
 * @param value - The context the root owns.
 */
export const providePreferenceItemContext =
	function providePreferenceItemContext(
		value: PreferenceItemContextValue
	): void {
		provide(preferenceItemKey, value);
	};

/**
 * Read the enclosing root's state.
 *
 * @returns The context.
 * @throws {Error} When used outside `<PreferenceItemRoot>`.
 */
export const usePreferenceItemContext =
	function usePreferenceItemContext(): PreferenceItemContextValue {
		const context = inject(preferenceItemKey, undefined);
		if (!context) {
			throw new Error(
				'PreferenceItem primitives must be used within PreferenceItemRoot'
			);
		}
		return context;
	};
