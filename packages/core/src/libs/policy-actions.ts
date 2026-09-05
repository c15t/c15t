/**
 * Policy-driven action resolution utilities.
 *
 * Pure functions that resolve backend policy hints into button layouts
 * for consent surfaces (banner, dialog). Used by c15t UI runtimes to
 * determine which buttons to show and how to arrange them.
 *
 * @packageDocumentation
 */

import type {
	PolicyUiAction,
	PolicyUiActionDirection,
	PolicyUiActionGroup,
	PolicyUiProfile,
	PolicyUiSurfaceConfig,
} from '@c15t/schema/types';

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

/**
 * The grouping a surface uses when the policy supplies no layout: the two
 * write actions together, "customize" on its own, laid out with
 * `space-between`.
 *
 * It is the same shape `policyDefaults`' compact profile ships, so a
 * surface rendered without policy hints matches one rendered with them.
 * Adapters should prefer this over a component-local constant — a banner
 * and a preference centre that disagree about the default is exactly the
 * drift the cross-framework parity gate exists to catch.
 *
 * @example
 * ```ts
 * const groups = resolvePolicyActionGroups({
 *   allowedActions,
 *   layout: policy.layout?.length ? policy.layout : DEFAULT_POLICY_ACTION_LAYOUT,
 * });
 * ```
 */
export const DEFAULT_POLICY_ACTION_LAYOUT: PolicyUiActionGroup[] = [
	['reject', 'accept'],
	'customize',
];

const dedupeActions = function dedupeActions(
	actions?: PolicyUiAction[]
): PolicyUiAction[] {
	if (!actions || actions.length === 0) {
		return [];
	}

	return [...new Set(actions)];
};

export const resolvePolicyAllowedActions =
	function resolvePolicyAllowedActions(params: {
		allowedActions?: PolicyUiAction[];
	}): PolicyUiAction[] {
		const allowed = dedupeActions(params.allowedActions);
		return allowed.length > 0 ? allowed : [...DEFAULT_POLICY_ACTIONS];
	};

export const flattenPolicyActionGroups = function flattenPolicyActionGroups(
	layout?: PolicyUiActionGroup[]
): PolicyUiAction[] {
	if (!layout || layout.length === 0) {
		return [];
	}

	return layout.flatMap((group) => (Array.isArray(group) ? group : [group]));
};

export const resolvePolicyActionGroups =
	function resolvePolicyActionGroups(params: {
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
	};

export const resolvePolicyOrderedActions =
	function resolvePolicyOrderedActions(params: {
		allowedActions: PolicyUiAction[];
		layout?: PolicyUiActionGroup[];
	}): PolicyUiAction[] {
		return flattenPolicyActionGroups(
			resolvePolicyActionGroups({
				allowedActions: params.allowedActions,
				layout: params.layout,
			})
		);
	};

export const resolvePolicyPrimaryActions =
	function resolvePolicyPrimaryActions(params: {
		orderedActions: PolicyUiAction[];
		primaryActions?: PolicyUiAction[];
	}): PolicyUiAction[] {
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
	};

export const resolvePolicyDirection = function resolvePolicyDirection(
	direction?: PolicyUiActionDirection
): PolicyUiActionDirection {
	if (direction === 'column') {
		return 'column';
	}

	return 'row';
};

export const resolvePolicyUiProfile = function resolvePolicyUiProfile(
	profile?: PolicyUiProfile
): PolicyUiProfile {
	if (profile === 'balanced' || profile === 'compact' || profile === 'strict') {
		return profile;
	}

	return 'compact';
};

export const shouldFillPolicyActions =
	function shouldFillPolicyActions(params: {
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
				(actionCount <= 2 ||
					(actionCount === 3 && (isSplitLayout || isColumn))))
		);
	};

export const hasPolicyHints = function hasPolicyHints(
	surface?: PolicyUiSurfaceConfig
): boolean {
	if (!surface) {
		return false;
	}

	return Object.values(surface).some((value) => {
		if (Array.isArray(value)) {
			return value.length > 0;
		}

		return value !== undefined;
	});
};
