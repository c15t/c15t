import type { PolicyUiSurfaceConfig } from '@c15t/schema/types';
import {
	resolvePolicyActionGroups,
	resolvePolicyAllowedActions,
	resolvePolicyPrimaryActions,
	shouldFillPolicyActions,
} from 'c15t';
import { computed, type MaybeRefOrGetter, toValue } from 'vue';

export function useConsentPolicyActions(
	surfaceUi: MaybeRefOrGetter<PolicyUiSurfaceConfig | undefined>
) {
	const actionGroups = computed(() => {
		const ui = toValue(surfaceUi);
		const allowedActions = resolvePolicyAllowedActions({
			allowedActions: ui?.allowedActions,
		});
		return resolvePolicyActionGroups({
			allowedActions,
			layout: ui?.layout,
		});
	});

	const primaryActions = computed(() => {
		const ui = toValue(surfaceUi);
		return resolvePolicyPrimaryActions({
			orderedActions: actionGroups.value.flat(),
			primaryActions: ui?.primaryActions,
		});
	});

	const shouldFillActions = computed(() => {
		const ui = toValue(surfaceUi);
		return shouldFillPolicyActions({
			uiProfile: ui?.uiProfile,
			actionGroups: actionGroups.value,
			direction: ui?.direction,
		});
	});

	return {
		actionGroups,
		primaryActions,
		shouldFillActions,
	};
}
