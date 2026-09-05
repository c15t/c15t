/** Resolve host presentation under the active policy constraints. */
import type {
	PolicyConsentCategory,
	PolicyRight,
	ResolvedPolicyRule,
} from '@c15t/schema/types';

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
		/** Host appearance tokens after theme resolution, used to check equivalent prominence. */
		actionAppearance?: Partial<
			Record<PresentationAction, { variant?: string; mode?: string }>
		>;
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
			const appearances = new Set(
				group.map((action) => {
					const style = input.actionAppearance?.[action];
					return `${style?.variant ?? (primaryActions.includes(action) ? 'primary' : 'neutral')}:${style?.mode ?? 'stroke'}`;
				})
			);
			if (
				(primaryCount > 0 && primaryCount < group.length) ||
				appearances.size > 1
			) {
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
