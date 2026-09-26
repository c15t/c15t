/**
 * Kernel access for the hooks and the stock components. The component
 * selectors below each read a single derived value, so a component
 * re-renders only when that value changes. Not exported from any package
 * entry.
 *
 * @packageDocumentation
 * @internal
 */

import type {
	AllConsentNames,
	ConsentKernel,
	ConsentSnapshot,
} from '@c15t/core';
import { evaluateConsent } from '@c15t/core';
import { useContext, useMemo, useSyncExternalStore } from 'react';

import { KernelContext } from './context';
import { defaultTranslationConfig } from './utils/default-translation-config';

/**
 * Reads the kernel from the nearest provider.
 *
 * @returns The provider's kernel.
 * @throws {Error} When called outside a `ConsentProvider`.
 * @internal
 */
export const useKernel = function useKernel(): ConsentKernel {
	const kernel = useContext(KernelContext);
	if (!kernel) {
		throw new Error(
			'c15t: no kernel in context. Wrap your app with <ConsentProvider options={...}> from @c15t/react.'
		);
	}
	return kernel;
};

/**
 * Subscribes to one slice of the kernel snapshot. React re-renders the
 * caller only when the selected value `Object.is`-differs, so a selector
 * must return a primitive or a reference the snapshot already holds.
 *
 * @param selector - Picks the slice from a snapshot.
 * @returns The selected slice.
 * @internal
 */
export const useKernelSelector = function useKernelSelector<SliceType>(
	selector: (snap: ConsentSnapshot) => SliceType
): SliceType {
	const kernel = useKernel();
	return useSyncExternalStore(
		(listener) => kernel.subscribe(listener),
		() => selector(kernel.getSnapshot()),
		// Hydration must render what the SERVER rendered. Client boot
		// mutations (sync persistence hydrate, eager init) can flip the live
		// snapshot before hydration completes — rendering the mutated state
		// here mismatches the server HTML and strands SSR'd consent UI as
		// unowned DOM (a banner React never removes).
		() => selector(kernel.getServerSnapshot())
	);
};

/**
 * Whether content gated on one category may render, evaluated at the gate's
 * clock like the kernel's own gates.
 *
 * @param category - Category the content needs.
 * @returns `true` while the category is permitted.
 * @internal
 */
export const useCategoryAllowed = function useCategoryAllowed(
	category: AllConsentNames
): boolean {
	return useKernelSelector((snap) => evaluateConsent({ category }, snap));
};

/**
 * Language of the active translation bundle.
 *
 * @returns The bundle's language, or the default language before one loads.
 * @internal
 */
export const useTranslationLanguage =
	function useTranslationLanguage(): string {
		return useKernelSelector(
			(snap) =>
				snap.translations?.language ?? defaultTranslationConfig.defaultLanguage
		);
	};

/**
 * Categories the preference surface lists: `necessary` plus the recorded
 * choice scope, or the policy scope when no choice scope applies.
 *
 * @returns A list whose identity changes only when the scope does.
 * @internal
 */
export const useDisplayedCategories =
	function useDisplayedCategories(): readonly AllConsentNames[] {
		const scope = useKernelSelector(
			(snap) => snap.evaluationPolicy.choiceScope ?? snap.policyRule.scope
		);
		return useMemo(() => ['necessary', ...scope], [scope]);
	};
