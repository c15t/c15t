import type { ConsentState, SaveResult } from '@c15t/core';
import { computed, ref, shallowRef, watch } from 'vue';

import { useConsentConfig } from './config';
import { useConsentKernelContext } from './kernel';

/** Editable, unmasked choices scoped to the categories the visitor reviewed. */
export const useConsentDraft = function useConsentDraft() {
	const { kernel, snapshot } = useConsentKernelContext();
	const config = useConsentConfig();
	const fingerprint = ref('');
	const displayedCategories = shallowRef<(keyof ConsentState)[]>([]);
	const values = ref<Partial<ConsentState>>({});
	const reset = () => {
		const current = snapshot.value;
		fingerprint.value = current.evaluationPolicy.choice.fingerprint;
		const configuredCategories =
			config.value.consentCategories ?? current.policyRule.scope;
		displayedCategories.value = [
			'necessary',
			...configuredCategories.filter(
				(category) =>
					category !== 'necessary' &&
					current.policyRule.scope.includes(category)
			),
		];
		values.value = Object.fromEntries(
			displayedCategories.value.map((category) => [
				category,
				category === 'necessary' ||
					(current.explicitChoice?.categories[category]?.value ??
						config.value.presentation?.preferences?.defaults?.[category] ??
						(current.policyRule.model === 'opt-out' ||
							current.policyRule.preselectedCategories.includes(category))),
			])
		);
	};
	reset();
	const isStale = computed(
		() =>
			fingerprint.value !== snapshot.value.evaluationPolicy.choice.fingerprint
	);
	watch(() => snapshot.value.explicitChoice, reset);
	return {
		displayedCategories,
		isStale,
		reset,
		async save(): Promise<SaveResult> {
			if (
				fingerprint.value !==
				kernel.getSnapshot().evaluationPolicy.choice.fingerprint
			) {
				return { ok: false };
			}
			const patch: Partial<ConsentState> = {};
			for (const category of displayedCategories.value) {
				if (category !== 'necessary') {
					patch[category] = values.value[category] ?? false;
				}
			}
			return await kernel.commands.save(patch);
		},
		values,
	};
};
