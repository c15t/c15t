import { resolveConsentPresentation } from '@c15t/core';
import type { PreferencesPresentation, PromptPresentation } from '@c15t/core';
import { DEFAULT_BANNER_POSITION } from '@c15t/schema/config';
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
	/**
	 * `bannerPosition` predates the presentation API and is merged in with
	 * the schema defaults, so only a non-default value counts as a host
	 * choice. It maps onto the prompt position so existing configs keep
	 * their corner.
	 */
	const legacyPosition = computed(() => {
		const value = config.value.bannerPosition;
		return value === undefined || value === DEFAULT_BANNER_POSITION
			? undefined
			: value;
	});
	const presentation = computed(() =>
		resolveConsentPresentation({
			override: toValue(override),
			policy: snapshot.value.policyRule,
			presentation: {
				...config.value.presentation,
				preferences: {
					trapFocus: config.value.trapFocus,
					...config.value.presentation?.preferences,
				},
				prompt: {
					position: legacyPosition.value,
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
		/** Backdrop, scroll lock, focus trap and no outside dismissal as one value. */
		blocking: computed(() => presentation.value.blocking),
		direction: computed(() => presentation.value.direction),
		/** Resolved position, valid for the resolved variant. */
		position: computed(() => presentation.value.position),
		/** Whether the host chose the position or the variant default applied. */
		positionSource: computed(() => presentation.value.positionSource),
		/** Additional preferences buttons recommended for the stock UI. */
		preferenceControls: computed(() => presentation.value.preferenceControls),
		presentation,
		primaryActions: computed(() => presentation.value.primaryActions),
		shouldFillActions: computed(() => presentation.value.shouldFillActions),
		/** Surface shape: floating card, edge bar, compact widget or centered wall. */
		variant: computed(() => presentation.value.variant),
	};
};
