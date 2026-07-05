import type {
	PolicyUiAction,
	PolicyUiActionDirection,
	PolicyUiActionGroup,
	PolicyUiProfile,
	PolicyUiSurfaceConfig,
} from '@c15t/schema/types';
import { computed, type MaybeRefOrGetter, toValue } from 'vue';

const DEFAULT_POLICY_ACTIONS: PolicyUiAction[] = [
	'reject',
	'accept',
	'customize',
];

function dedupeActions(actions?: PolicyUiAction[]) {
	return actions?.length ? [...new Set(actions)] : [];
}

function resolvePolicyAllowedActions(params: {
	allowedActions?: PolicyUiAction[];
}) {
	const allowed = dedupeActions(params.allowedActions);
	return allowed.length > 0 ? allowed : [...DEFAULT_POLICY_ACTIONS];
}

function resolvePolicyActionGroups(params: {
	allowedActions: PolicyUiAction[];
	layout?: PolicyUiActionGroup[];
}) {
	const allowedActions = dedupeActions(params.allowedActions);
	if (allowedActions.length === 0) return [];
	if (!params.layout || params.layout.length === 0)
		return [[...allowedActions]];

	const allowedSet = new Set(allowedActions);
	const groups: PolicyUiAction[][] = [];
	const seen = new Set<PolicyUiAction>();

	for (const group of params.layout) {
		const actions = dedupeActions(
			Array.isArray(group) ? group : [group]
		).filter((action) => {
			if (!allowedSet.has(action) || seen.has(action)) return false;
			seen.add(action);
			return true;
		});
		if (actions.length > 0) groups.push(actions);
	}

	return groups.length > 0 ? groups : [[...allowedActions]];
}

function resolvePolicyOrderedActions(params: {
	allowedActions: PolicyUiAction[];
	layout?: PolicyUiActionGroup[];
}) {
	return resolvePolicyActionGroups(params).flat();
}

function resolvePolicyPrimaryActions(params: {
	orderedActions: PolicyUiAction[];
	primaryActions?: PolicyUiAction[];
}) {
	const defaultPrimary = params.orderedActions.includes('customize')
		? (['customize'] satisfies PolicyUiAction[])
		: [];
	if (!params.primaryActions || params.primaryActions.length === 0) {
		return defaultPrimary;
	}

	const filtered = params.primaryActions.filter((action) =>
		params.orderedActions.includes(action)
	);
	return filtered.length > 0 ? filtered : defaultPrimary;
}

function resolvePolicyDirection(
	direction?: PolicyUiActionDirection
): PolicyUiActionDirection {
	return direction === 'column' ? 'column' : 'row';
}

function resolvePolicyUiProfile(profile?: PolicyUiProfile): PolicyUiProfile {
	return profile === 'balanced' || profile === 'compact' || profile === 'strict'
		? profile
		: 'compact';
}

function shouldFillPolicyActions(params: {
	uiProfile?: PolicyUiProfile;
	actionGroups: PolicyUiAction[][];
	direction?: PolicyUiActionDirection;
}) {
	const effectiveUiProfile = resolvePolicyUiProfile(params.uiProfile);
	const actionCount = new Set(params.actionGroups.flat()).size;
	const isSplitLayout = params.actionGroups.length > 1;
	const isColumn = params.direction === 'column';

	return (
		effectiveUiProfile === 'strict' ||
		(effectiveUiProfile === 'balanced' &&
			(actionCount <= 2 || (actionCount === 3 && (isSplitLayout || isColumn))))
	);
}

export function useConsentPolicyActions(
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
			uiProfile: ui?.uiProfile,
			actionGroups: actionGroups.value,
			direction: direction.value,
		});
	});

	return {
		actionGroups,
		direction,
		primaryActions,
		shouldFillActions,
	};
}
