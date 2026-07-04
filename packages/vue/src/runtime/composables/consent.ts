import {
	type CONSENT_CATEGORY,
	getConsentAvailableCategories,
} from 'c15t/v3/consent-record';
import { computed } from 'vue';
import { useConsentConfig } from './config';
import { useConsentInit } from './init';
import { useConsentKernel, useConsentKernelContext } from './kernel';

export function useStoredConsent() {
	return useConsentKernelContext().storedConsent;
}

export function useConsent() {
	const context = useConsentKernelContext();
	return computed({
		get: () => context.snapshot.value.consents,
		set: (value) => {
			context.kernel.set.consent(value);
		},
	});
}

export function useHasConsent() {
	const context = useConsentKernelContext();
	return computed(() => {
		const snapshot = context.snapshot.value;
		return Object.entries(snapshot.consents)
			.filter(([, enabled]) => enabled)
			.map(([category]) => category as CONSENT_CATEGORY);
	});
}

export type ConsentSaveInput = Array<CONSENT_CATEGORY> | 'all' | 'none';

export function useConsentSave() {
	const config = useConsentConfig();
	const init = useConsentInit();
	const kernel = useConsentKernel();

	return (categories: ConsentSaveInput) => {
		if (categories === 'all' || categories === 'none') {
			void kernel.commands.save(categories);
			return;
		}

		const available = getConsentAvailableCategories(
			init.value,
			config.value.consentCategories
		);
		const selected = new Set(categories);

		const next = {} as Record<CONSENT_CATEGORY, boolean>;
		for (const category of available) {
			next[category] = category === 'necessary' || selected.has(category);
		}
		void kernel.commands.save(next);
	};
}
