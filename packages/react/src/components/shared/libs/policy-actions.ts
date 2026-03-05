export type PolicyAction = 'accept' | 'reject' | 'customize';
export type PolicyActionLayout = 'split' | 'inline';
export type PolicyUiProfile = 'balanced' | 'compact' | 'strict';

const DEFAULT_POLICY_ACTIONS: PolicyAction[] = [
	'reject',
	'accept',
	'customize',
];

function dedupeActions(actions?: PolicyAction[] | null): PolicyAction[] {
	if (!actions || actions.length === 0) {
		return [];
	}

	return [...new Set(actions)];
}

export function resolvePolicyActionOrder(params: {
	allowedActions?: PolicyAction[] | null;
	actionOrder?: PolicyAction[] | null;
}): PolicyAction[] {
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
	orderedActions: PolicyAction[];
	primaryAction?: PolicyAction | null;
}): PolicyAction | null {
	if (!params.primaryAction) {
		return null;
	}

	return params.orderedActions.includes(params.primaryAction)
		? params.primaryAction
		: (params.orderedActions[0] ?? null);
}

export function resolvePolicyUiProfile(
	profile?: PolicyUiProfile | null
): PolicyUiProfile {
	if (profile === 'balanced' || profile === 'compact' || profile === 'strict') {
		return profile;
	}

	return 'compact';
}

export function shouldFillPolicyActions(params: {
	uiProfile?: PolicyUiProfile | null;
	actionGroups: PolicyAction[][];
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

export function resolvePolicyActionGroups(params: {
	orderedActions: PolicyAction[];
	layout?: PolicyActionLayout | null;
}): PolicyAction[][] {
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
