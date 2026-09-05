import { getConsentAvailableCategories } from '@c15t/core/consent-record';
import type { CONSENT_CATEGORY } from '@c15t/core/consent-record';
import { computed } from 'vue';

import { useConsentConfig } from './config';
import { useConsentInit } from './init';
import { useConsentKernel, useConsentKernelContext } from './kernel';

const useStoredConsent = function useStoredConsent() {
	return useConsentKernelContext().storedConsent;
};

const useConsent = function useConsent() {
	const context = useConsentKernelContext();
	return computed({
		get: () => context.snapshot.value.consents,
		set: (value) => {
			context.kernel.set.consent(value);
		},
	});
};

const useHasConsent = function useHasConsent() {
	const context = useConsentKernelContext();
	return computed(() => {
		const snapshot = context.snapshot.value;
		return Object.entries(snapshot.consents)
			.filter(([, enabled]) => enabled)
			.map(([category]) => category as CONSENT_CATEGORY);
	});
};

export type ConsentSaveInput = CONSENT_CATEGORY[] | 'all' | 'none';

const useConsentSave = function useConsentSave() {
	const config = useConsentConfig();
	const init = useConsentInit();
	const kernel = useConsentKernel();

	return (categories: ConsentSaveInput) => {
		const available = getConsentAvailableCategories(
			init.value,
			config.value.consentCategories
		);
		if (categories === 'all' || categories === 'none') {
			void kernel.commands.save(categories, { categories: available });
			return;
		}

		const selected = new Set(categories);

		const next = {} as Record<CONSENT_CATEGORY, boolean>;
		for (const category of available) {
			next[category] = category === 'necessary' || selected.has(category);
		}
		void kernel.commands.save(next);
	};
};

// Single grouped export: unimport/mlly's export scanner skipped ALTERNATING
// inline `export function` declarations in the built output (kept #2/#4,
// dropped #1/#3 -> useHasConsent/useStoredConsent undefined at runtime in
// consumers). One export statement sidesteps the parser bug.
export { useConsent, useConsentSave, useHasConsent, useStoredConsent };
