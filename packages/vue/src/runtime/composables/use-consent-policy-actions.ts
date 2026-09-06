import type { PolicyUiSurfaceConfig } from '@c15t/schema/types';
import {
	DEFAULT_POLICY_ACTION_LAYOUT,
	resolvePolicyActionGroups,
	resolvePolicyAllowedActions,
	resolvePolicyDirection,
	resolvePolicyOrderedActions,
	resolvePolicyPrimaryActions,
	shouldFillPolicyActions,
} from '@c15t/ui/utils';
import { computed, toValue } from 'vue';
import type { MaybeRefOrGetter } from 'vue';

export const useConsentPolicyActions = function useConsentPolicyActions(
	surfaceUi: MaybeRefOrGetter<PolicyUiSurfaceConfig | undefined>
) {
	const allowedActions = computed(() => {
		const ui = toValue(surfaceUi);
		return resolvePolicyAllowedActions({
			allowedActions: ui?.allowedActions,
		});
	});

	/**
	 * A surface with no configured layout falls back to the shared default
	 * — reject and accept together, customize on its own — rather than to
	 * one group holding everything. That is the layout React and Astro
	 * already use.
	 */
	const layout = computed(() => {
		const ui = toValue(surfaceUi);
		return ui?.layout?.length ? ui.layout : DEFAULT_POLICY_ACTION_LAYOUT;
	});

	const actionGroups = computed(() =>
		resolvePolicyActionGroups({
			allowedActions: allowedActions.value,
			layout: layout.value,
		})
	);

	const primaryActions = computed(() => {
		const ui = toValue(surfaceUi);
		return resolvePolicyPrimaryActions({
			orderedActions: resolvePolicyOrderedActions({
				allowedActions: allowedActions.value,
				layout: layout.value,
			}),
			primaryActions: ui?.primaryActions,
		});
	});

	const direction = computed(() => {
		const ui = toValue(surfaceUi);
		return resolvePolicyDirection(ui?.direction);
	});

	const shouldFillActions = computed(() => {
		const ui = toValue(surfaceUi);
		return shouldFillPolicyActions({
			actionGroups: actionGroups.value,
			direction: direction.value,
			uiProfile: ui?.uiProfile,
		});
	});

	return {
		actionGroups,
		direction,
		primaryActions,
		shouldFillActions,
	};
};
