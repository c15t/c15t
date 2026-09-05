import type { CONSENT_CATEGORY } from '@c15t/core/consent-record';
import { computed } from 'vue';

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
	return computed(() => {
		const snapshot = context.snapshot.value;
		return Object.entries(snapshot.effectivePermissions)
			.filter(([, enabled]) => enabled)
			.map(([category]) => category as CONSENT_CATEGORY);
	});
};

export type ConsentSaveInput = CONSENT_CATEGORY[] | 'all' | 'none';

const useConsentSave = function useConsentSave() {
	const kernel = useConsentKernel();

	return (categories: ConsentSaveInput) => {
		if (categories === 'all' || categories === 'none') {
			return kernel.commands.save(categories);
		}

		const available = [
			'necessary' as const,
			...kernel.getSnapshot().policyRule.scope,
		];
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
export { useConsent, useConsentSave, useHasConsent, useStoredConsent };
