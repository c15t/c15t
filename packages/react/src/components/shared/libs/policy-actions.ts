import type {
	PolicyUiAction,
	PolicyUiActionDirection,
	PolicyUiActionGroup,
	PolicyUiProfile,
	PolicyUiSurfaceConfig,
} from 'c15t';

export type {
	PolicyUiAction,
	PolicyUiActionDirection,
	PolicyUiActionGroup,
	PolicyUiProfile,
	PolicyUiSurfaceConfig,
};

const DEFAULT_POLICY_ACTIONS: PolicyUiAction[] = [
	'reject',
	'accept',
	'customize',
];

function dedupeActions(actions?: PolicyUiAction[]): PolicyUiAction[] {
	if (!actions || actions.length === 0) {
		return [];
	}

	return [...new Set(actions)];
}

export function resolvePolicyAllowedActions(params: {
	allowedActions?: PolicyUiAction[];
}): PolicyUiAction[] {
	const allowed = dedupeActions(params.allowedActions);
	return allowed.length > 0 ? allowed : [...DEFAULT_POLICY_ACTIONS];
}

export function flattenPolicyActionGroups(
	layout?: PolicyUiActionGroup[]
): PolicyUiAction[] {
	if (!layout || layout.length === 0) {
		return [];
	}

	return layout.flatMap((group) => (Array.isArray(group) ? group : [group]));
}

export function resolvePolicyActionGroups(params: {
	allowedActions: PolicyUiAction[];
	layout?: PolicyUiActionGroup[];
}): PolicyUiAction[][] {
	const allowedActions = dedupeActions(params.allowedActions);
	if (allowedActions.length === 0) {
		return [];
	}

	if (!params.layout || params.layout.length === 0) {
		return [[...allowedActions]];
	}

	const allowedSet = new Set(allowedActions);
	const groups: PolicyUiAction[][] = [];
	const seen = new Set<PolicyUiAction>();

	for (const group of params.layout) {
		const actions = dedupeActions(
			Array.isArray(group) ? group : [group]
		).filter((action) => {
			if (!allowedSet.has(action) || seen.has(action)) {
				return false;
			}

			seen.add(action);
			return true;
		});

		if (actions.length > 0) {
			groups.push(actions);
		}
	}

	return groups.length > 0 ? groups : [[...allowedActions]];
}

export function resolvePolicyOrderedActions(params: {
	allowedActions: PolicyUiAction[];
	layout?: PolicyUiActionGroup[];
}): PolicyUiAction[] {
	return flattenPolicyActionGroups(
		resolvePolicyActionGroups({
			allowedActions: params.allowedActions,
			layout: params.layout,
		})
	);
}

export function resolvePolicyPrimaryActions(params: {
	orderedActions: PolicyUiAction[];
	primaryActions?: PolicyUiAction[];
}): PolicyUiAction[] {
	const defaultPrimary = params.orderedActions.includes('customize')
		? (['customize'] satisfies PolicyUiAction[])
		: [];

	if (!params.primaryActions || params.primaryActions.length === 0) {
		return defaultPrimary;
	}

	const filtered = params.primaryActions.filter((a) =>
		params.orderedActions.includes(a)
	);
	return filtered.length > 0 ? filtered : defaultPrimary;
}

export function resolvePolicyDirection(
	direction?: PolicyUiActionDirection
): PolicyUiActionDirection {
	if (direction === 'column') {
		return 'column';
	}

	return 'row';
}

export function resolvePolicyUiProfile(
	profile?: PolicyUiProfile
): PolicyUiProfile {
	if (profile === 'balanced' || profile === 'compact' || profile === 'strict') {
		return profile;
	}

	return 'compact';
}

export function shouldFillPolicyActions(params: {
	uiProfile?: PolicyUiProfile;
	actionGroups: PolicyUiAction[][];
	direction?: PolicyUiActionDirection;
}): boolean {
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

export function hasPolicyHints(surface?: PolicyUiSurfaceConfig): boolean {
	if (!surface) {
		return false;
	}

	return Object.values(surface).some((value) => {
		if (Array.isArray(value)) {
			return value.length > 0;
		}

		return value !== undefined;
	});
}
