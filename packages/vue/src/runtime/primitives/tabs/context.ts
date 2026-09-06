/**
 * The `Tabs` primitive's shared state.
 *
 * A port of the Svelte primitive, which mirrors the React one: same
 * `data-slot` names, same generated `{base}-trigger-{value}` /
 * `{base}-content-{value}` ids, same roving tabindex. Vue's IAB dialog
 * used to inline its own tablist, so it carried none of that.
 */

import type { TabsOrientation } from '@c15t/ui/primitives';
import type { ComputedRef, InjectionKey, Ref } from 'vue';
import { inject, provide } from 'vue';

/** What the sub-components read off the root. */
export interface TabsRootContextValue {
	baseId: string;
	disabled: ComputedRef<boolean>;
	loop: ComputedRef<boolean>;
	orientation: ComputedRef<TabsOrientation>;
	value: Ref<string | null>;
	setValue: (value: string) => void;
}

export const tabsRootKey: InjectionKey<TabsRootContextValue> =
	Symbol('c15t-vue-tabs-root');

/**
 * Publish the root's state to its sub-components.
 *
 * @param value - The context the root owns.
 */
export const provideTabsRootContext = function provideTabsRootContext(
	value: TabsRootContextValue
): void {
	provide(tabsRootKey, value);
};

/**
 * Read the enclosing root's state.
 *
 * @returns The context.
 * @throws {Error} When used outside `<TabsRoot>`.
 */
export const useTabsRootContext =
	function useTabsRootContext(): TabsRootContextValue {
		const context = inject(tabsRootKey, undefined);
		if (!context) {
			throw new Error('Tabs primitives must be used within TabsRoot');
		}
		return context;
	};
