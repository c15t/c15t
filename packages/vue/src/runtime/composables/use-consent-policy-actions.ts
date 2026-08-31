import type { PolicyUiSurfaceConfig } from '@c15t/schema/types';
import {
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

	const actionGroups = computed(() => {
		const ui = toValue(surfaceUi);
		return resolvePolicyActionGroups({
			allowedActions: allowedActions.value,
			layout: ui?.layout,
		});
	});

	const primaryActions = computed(() => {
		const ui = toValue(surfaceUi);
		return resolvePolicyPrimaryActions({
			orderedActions: resolvePolicyOrderedActions({
				allowedActions: allowedActions.value,
				layout: ui?.layout,
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
