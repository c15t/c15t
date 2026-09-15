import type { ConsentState, ConsentSnapshot, SaveResult } from '@c15t/core';
import { computed, ref, shallowRef, watch } from 'vue';

import { useConsentConfig } from './config';
import { useConsentKernelContext } from './kernel';

/** Editable, unmasked choices scoped to the categories the visitor reviewed. */
export const useConsentDraft = function useConsentDraft(
	shouldSyncChanges: () => boolean = () => true
) {
	const { kernel, snapshot } = useConsentKernelContext();
	const config = useConsentConfig();
	const fingerprint = ref('');
	const displayedCategories = shallowRef<(keyof ConsentState)[]>([]);
	const values = ref<Partial<ConsentState>>({});
	const categoriesFor = (current: ConsentSnapshot): (keyof ConsentState)[] => {
		const scope =
			current.evaluationPolicy.choiceScope ?? current.policyRule.scope;
		const available = new Set<keyof ConsentState>(['necessary', ...scope]);
		return [
			...new Set<keyof ConsentState>([
				'necessary',
				...(config.value.consentCategories ?? []).filter((name) =>
					available.has(name)
				),
				...scope,
			]),
		];
	};
	const reset = () => {
		const current = snapshot.value;
		fingerprint.value = current.evaluationPolicy.choice.fingerprint;
		displayedCategories.value = categoriesFor(current);
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
			fingerprint.value !==
				snapshot.value.evaluationPolicy.choice.fingerprint ||
			displayedCategories.value.join(',') !==
				categoriesFor(snapshot.value).join(',')
	);
	watch(
		[
			() => snapshot.value.explicitChoice,
			() => snapshot.value.evaluationPolicy,
		],
		([choice, policy], [previousChoice]) => {
			if (
				shouldSyncChanges() &&
				(choice !== previousChoice ||
					fingerprint.value === policy.choice.fingerprint)
			) {
				reset();
			}
		}
	);
	return {
		displayedCategories,
		isStale,
		reset,
		async save(): Promise<SaveResult> {
			if (isStale.value) {
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
