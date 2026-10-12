import { isVendorAllowed } from '@c15t/core';
import type { CONSENT_CATEGORY } from '@c15t/core/consent-record';
import { computed } from 'vue';
import type { ComputedRef } from 'vue';

import { useConsentKernel, useConsentKernelContext } from './kernel';

const useStoredConsent = function useStoredConsent() {
	return useConsentKernelContext().storedConsent;
};

const useConsent = function useConsent() {
	const context = useConsentKernelContext();
	return computed(() => context.snapshot.value.effectivePermissions);
};

const useHasConsent = function useHasConsent() {
	const context = useConsentKernelContext();
	const permissions = computed(
		() => context.snapshot.value.effectivePermissions
	);
	// Same list, same array: subscribers re-render only when a category
	// actually changes, not on every kernel update.
	return computed<CONSENT_CATEGORY[]>((previous) => {
		const next = Object.entries(permissions.value)
			.filter(([, enabled]) => enabled)
			.map(([category]) => category as CONSENT_CATEGORY);
		return previous &&
			previous.length === next.length &&
			previous.every((category, index) => category === next[index])
			? previous
			: next;
	});
};

/**
 * Whether one vendor may load: it is declared, its category condition
 * passes, and outside IAB the visitor has not turned it off.
 *
 * @param vendorId - Vendor id as declared in `vendors`, on a script or by
 * the backend.
 * @returns A computed `true` while the vendor may load. An id nothing
 * declares, such as a typo, stays `false` and logs a development warning.
 * @example
 * ```ts
 * const youtubeAllowed = useVendorAllowed('youtube');
 * ```
 */
const useVendorAllowed = function useVendorAllowed(
	vendorId: string
): ComputedRef<boolean> {
	const context = useConsentKernelContext();
	return computed(() =>
		isVendorAllowed(
			context.snapshot.value,
			vendorId,
			context.snapshot.value.evaluatedAt
		)
	);
};

export type ConsentSaveInput = CONSENT_CATEGORY[] | 'all' | 'none';

const useConsentSave = function useConsentSave() {
	const kernel = useConsentKernel();

	return (categories: ConsentSaveInput) => {
		const snapshot = kernel.getSnapshot();
		const available = [
			'necessary' as const,
			...(snapshot.evaluationPolicy.choiceScope ?? snapshot.policyRule.scope),
		];
		if (categories === 'all' || categories === 'none') {
			return kernel.commands.save(categories, { categories: available });
		}

		const selected = new Set(categories);

		const next = {} as Record<CONSENT_CATEGORY, boolean>;
		for (const category of available) {
			next[category] = category === 'necessary' || selected.has(category);
		}
		return kernel.commands.save(next);
	};
};

// Single grouped export: unimport/mlly's export scanner skipped ALTERNATING
// inline `export function` declarations in the built output (kept #2/#4,
// dropped #1/#3 -> useHasConsent/useStoredConsent undefined at runtime in
// consumers). One export statement sidesteps the parser bug.
export {
	useConsent,
	useConsentSave,
	useHasConsent,
	useStoredConsent,
	useVendorAllowed,
};
