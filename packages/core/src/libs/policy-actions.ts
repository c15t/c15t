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
	PolicyConsentCategory,
	PolicyRight,
	ResolvedPolicyRule,
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

/** Semantic control roles, independent of their visual variant. */
export type PresentationAction =
	| 'accept'
	| 'reject'
	| 'customize'
	| 'dismiss'
	| 'save';

/** Host layout and visual choices for a consent surface. */
export interface SurfacePresentation {
	layout?: readonly (PresentationAction | readonly PresentationAction[])[];
	primaryActions?: readonly PresentationAction[];
	direction?: 'row' | 'column';
	uiProfile?: 'balanced' | 'compact' | 'strict';
	scrollLock?: boolean;
}

/** Presentation of the first interaction required by a policy. */
export interface PromptPresentation extends SurfacePresentation {
	trapFocus?: boolean;
}

/** Presentation of persistent category preferences. */
export interface PreferencesPresentation extends SurfacePresentation {
	/** Initial displayed selections for categories without an explicit receipt. */
	defaults?: Partial<Record<PolicyConsentCategory, boolean>>;
}

/** Application-owned presentation; never part of a policy fingerprint. */
export interface ConsentPresentation {
	prompt?: PromptPresentation;
	preferences?: PreferencesPresentation;
}

/** Mechanical findings for headless hosts and development diagnostics. */
export interface PresentationDiagnostic {
	code:
		| 'forbidden-action'
		| 'required-action-restored'
		| 'equivalent-prominence-overridden';
	actions: PresentationAction[];
	message: string;
}

/** Resolved controls and behavioral constraints for one surface. */
export interface ResolvedConsentPresentation {
	allowedActions: PresentationAction[];
	requiredActions: PresentationAction[];
	equivalentActions: PresentationAction[][];
	orderedActions: PresentationAction[];
	actionGroups: PresentationAction[][];
	primaryActions: PresentationAction[];
	diagnostics: PresentationDiagnostic[];
	rights: readonly PolicyRight[];
	direction: 'row' | 'column';
	uiProfile: 'balanced' | 'compact' | 'strict';
	scrollLock: boolean;
	trapFocus: boolean;
	shouldFillActions: boolean;
}

const resolveRequiredGroups = function resolveRequiredGroups(
	allowedActions: PresentationAction[],
	requiredActions: PresentationAction[],
	suppliedLayout: SurfacePresentation['layout'],
	diagnostics: PresentationDiagnostic[]
): PresentationAction[][] {
	const seen = new Set<PresentationAction>();
	const actionGroups: PresentationAction[][] = [];
	const layout = suppliedLayout ?? [allowedActions];
	for (const entry of layout) {
		const group: PresentationAction[] = [];
		for (const action of typeof entry === 'string' ? [entry] : entry) {
			if (!allowedActions.includes(action)) {
				diagnostics.push({
					actions: [action],
					code: 'forbidden-action',
					message: `The policy does not allow ${action} on this surface.`,
				});
			} else if (!seen.has(action)) {
				seen.add(action);
				group.push(action);
			}
		}
		if (group.length) {
			actionGroups.push(group);
		}
	}
	const missing = requiredActions.filter((action) => !seen.has(action));
	if (missing.length) {
		if (!actionGroups.length) {
			actionGroups.push([]);
		}
		actionGroups[0]?.push(...missing);
		diagnostics.push({
			actions: missing,
			code: 'required-action-restored',
			message:
				'Required actions omitted by the layout were restored at the same interaction depth.',
		});
	}

	return actionGroups;
};

/**
 * Resolve host presentation without changing policy behavior.
 * @param input - Active policy, target surface, host options and local overrides.
 * @returns Ordered controls, required actions, rights and diagnostics.
 */
export const resolveConsentPresentation =
	function resolveConsentPresentation(input: {
		policy: ResolvedPolicyRule;
		surface: 'prompt' | 'preferences';
		presentation?: ConsentPresentation;
		override?: PromptPresentation | PreferencesPresentation;
	}): ResolvedConsentPresentation {
		const preferences = input.surface === 'preferences';
		const options: PromptPresentation = {
			...input.presentation?.[input.surface],
			...Object.fromEntries(
				Object.entries(input.override ?? {}).filter(
					([, value]) => value !== undefined
				)
			),
		};
		// Prompt actions constrain the first layer; persistent preferences are a separate right.
		const constraints = preferences
			? {
					allowed: ['reject', 'accept', 'save'] satisfies PresentationAction[],
					equivalent: [['accept', 'reject']] satisfies PresentationAction[][],
					required: ['reject', 'accept', 'save'] satisfies PresentationAction[],
				}
			: input.policy.actions;
		const allowedActions: PresentationAction[] = [
			...new Set(constraints.allowed),
		];
		const requiredActions: PresentationAction[] = [
			...new Set(constraints.required),
		];
		const equivalentActions: PresentationAction[][] =
			constraints.equivalent.map((group) => [...group]);
		const diagnostics: PresentationDiagnostic[] = [];
		const actionGroups = resolveRequiredGroups(
			allowedActions,
			requiredActions,
			options.layout,
			diagnostics
		);
		const orderedActions = actionGroups.flat();
		const defaultPrimary: PresentationAction[] = preferences
			? ['save']
			: ['accept', 'reject'];
		const primaryActions = (options.primaryActions ?? defaultPrimary).filter(
			(action) => orderedActions.includes(action)
		);
		for (const group of equivalentActions) {
			const primaryCount = group.filter((action) =>
				primaryActions.includes(action)
			).length;
			if (primaryCount > 0 && primaryCount < group.length) {
				diagnostics.push({
					actions: [...group],
					code: 'equivalent-prominence-overridden',
					message:
						'Host presentation gives equivalent actions different prominence.',
				});
			}
		}
		const notice = !preferences && input.policy.prompt === 'notice';
		const direction = options.direction ?? 'row';
		const uiProfile = options.uiProfile ?? 'balanced';
		return {
			actionGroups,
			allowedActions,
			diagnostics,
			direction,
			equivalentActions,
			orderedActions,
			primaryActions,
			requiredActions,
			rights: input.policy.rights,
			scrollLock: notice ? false : (options.scrollLock ?? preferences),
			shouldFillActions: uiProfile === 'strict' || uiProfile === 'balanced',
			trapFocus: notice ? false : (options.trapFocus ?? true),
			uiProfile,
		};
	};
