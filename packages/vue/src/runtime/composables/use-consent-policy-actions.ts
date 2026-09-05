import { resolveConsentPresentation } from '@c15t/core';
import type { PreferencesPresentation, PromptPresentation } from '@c15t/core';
import { computed, toValue, watch } from 'vue';
import type { MaybeRefOrGetter } from 'vue';

import { useConsentConfig } from './config';
import { useConsentSnapshot } from './kernel';

/** Resolve the shared policy constraints and application presentation. */
export const useConsentPolicyActions = function useConsentPolicyActions(
	surface: 'prompt' | 'preferences',
	override?: MaybeRefOrGetter<
		PromptPresentation | PreferencesPresentation | undefined
	>
) {
	const snapshot = useConsentSnapshot();
	const config = useConsentConfig();
	const presentation = computed(() =>
		resolveConsentPresentation({
			override: toValue(override),
			policy: snapshot.value.policyRule,
			presentation: {
				...config.value.presentation,
				prompt: {
					trapFocus: config.value.trapFocus,
					...config.value.presentation?.prompt,
				},
			},
			surface,
		})
	);
	watch(
		presentation,
		(value) => {
			for (const diagnostic of value.diagnostics) {
				console.warn(`[c15t] ${diagnostic.code}: ${diagnostic.message}`);
			}
		},
		{ immediate: true }
	);
	return {
		actionGroups: computed(() => presentation.value.actionGroups),
		direction: computed(() => presentation.value.direction),
		presentation,
		primaryActions: computed(() => presentation.value.primaryActions),
		shouldFillActions: computed(() => presentation.value.shouldFillActions),
	};
};
