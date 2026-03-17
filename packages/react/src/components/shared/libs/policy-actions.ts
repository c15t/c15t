import type {
	PolicyUiAction,
	PolicyUiActionLayout,
	PolicyUiProfile,
	PolicyUiSurfaceConfig,
} from 'c15t';

export type {
	PolicyUiAction,
	PolicyUiActionLayout,
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

export function resolvePolicyActionOrder(params: {
	allowedActions?: PolicyUiAction[];
	actionOrder?: PolicyUiAction[];
}): PolicyUiAction[] {
	const allowed = dedupeActions(params.allowedActions);
	const normalizedAllowed =
		allowed.length > 0 ? allowed : [...DEFAULT_POLICY_ACTIONS];
	const allowedSet = new Set(normalizedAllowed);
	const ordered = dedupeActions(params.actionOrder).filter((action) =>
		allowedSet.has(action)
	);

	for (const action of normalizedAllowed) {
		if (!ordered.includes(action)) {
			ordered.push(action);
		}
	}

	return ordered;
}

export function resolvePolicyPrimaryAction(params: {
	orderedActions: PolicyUiAction[];
	primaryAction?: PolicyUiAction;
}): PolicyUiAction | undefined {
	if (!params.primaryAction) {
		return undefined;
	}

	return params.orderedActions.includes(params.primaryAction)
		? params.primaryAction
		: params.orderedActions[0];
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
}): boolean {
	const effectiveUiProfile = resolvePolicyUiProfile(params.uiProfile);
	const actionCount = new Set(params.actionGroups.flat()).size;
	const layout = params.actionGroups.length > 1 ? 'split' : 'inline';

	return (
		effectiveUiProfile === 'strict' ||
		(effectiveUiProfile === 'balanced' &&
			(actionCount <= 2 || (actionCount === 3 && layout === 'split')))
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

export function resolvePolicyActionGroups(params: {
	orderedActions: PolicyUiAction[];
	layout?: PolicyUiActionLayout;
}): PolicyUiAction[][] {
	const actions = params.orderedActions;
	if (actions.length === 0) {
		return [];
	}

	if (params.layout === 'inline') {
		return [actions];
	}

	if (actions.length <= 2) {
		return [actions];
	}

	// UX rule: when customize is first in split mode with 3 actions,
	// keep customize isolated and group reject/accept together.
	if (actions.length === 3 && actions[0] === 'customize') {
		return [[actions[0]], actions.slice(1)];
	}

	return [actions.slice(0, 2), actions.slice(2)];
}
