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

/** Shape of a prompt surface. Structure only; tokens style it. */
export type PromptVariant = 'floating' | 'bar' | 'widget' | 'wall';

/** Corners and edge centers a floating card may occupy. */
export type FloatingPromptPosition =
	| 'bottom-left'
	| 'bottom-right'
	| 'top-left'
	| 'top-right'
	| 'bottom-center'
	| 'top-center';

/** Viewport edges a full-width bar may occupy. */
export type BarPromptPosition = 'top' | 'bottom';

/** Corners a compact widget may occupy. */
export type WidgetPromptPosition =
	| 'bottom-left'
	| 'bottom-right'
	| 'top-left'
	| 'top-right';

/** A wall always sits in the middle of the viewport. */
export type WallPromptPosition = 'center';

/** Every position any variant accepts. Validity depends on the variant. */
export type PromptPosition =
	| FloatingPromptPosition
	| BarPromptPosition
	| WidgetPromptPosition
	| WallPromptPosition;

/** Positions each variant accepts. Anything else falls back with a diagnostic. */
export const PROMPT_VARIANT_POSITIONS = {
	bar: ['top', 'bottom'],
	floating: [
		'bottom-left',
		'bottom-right',
		'top-left',
		'top-right',
		'bottom-center',
		'top-center',
	],
	wall: ['center'],
	widget: ['bottom-left', 'bottom-right', 'top-left', 'top-right'],
} as const satisfies Record<PromptVariant, readonly PromptPosition[]>;

/** Position used when the host supplies none for the variant. */
export const PROMPT_VARIANT_DEFAULT_POSITION = {
	bar: 'bottom',
	floating: 'bottom-left',
	wall: 'center',
	widget: 'bottom-right',
} as const satisfies Record<PromptVariant, PromptPosition>;

/** Host layout and visual choices for a consent surface. */
export interface SurfacePresentation {
	layout?: readonly (PresentationAction | readonly PresentationAction[])[];
	primaryActions?: readonly PresentationAction[];
	/** @default 'row' */
	direction?: 'row' | 'column';
	/**
	 * `compact` sizes buttons to their labels. `balanced` and `strict`
	 * stretch every button to the full width and stack the groups.
	 * @default 'compact'
	 */
	uiProfile?: 'balanced' | 'compact' | 'strict';
	scrollLock?: boolean;
	/**
	 * Shape of the surface. Every prompt defaults to `floating`; the
	 * preferences surface defaults to `wall`. `bar`, `widget`, and `wall`
	 * are host choices.
	 */
	variant?: PromptVariant;
	/**
	 * Where the surface sits. Must be valid for the resolved variant; an
	 * invalid pair falls back to the variant default with a diagnostic.
	 */
	position?: PromptPosition;
	/**
	 * Backdrop, scroll lock, focus trap, and no dismissal by clicking
	 * outside, as one semantic value. On the prompt surface `wall` is always
	 * blocking, a notice never is, and other variants default to `false`.
	 * The preferences surface defaults to blocking unless the host turns off
	 * `scrollLock` or `trapFocus`, and honors an explicit `false`.
	 */
	blocking?: boolean;
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
		| 'equivalent-prominence-overridden'
		| 'invalid-position'
		| 'blocking-forbidden'
		| 'blocking-required';
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
	/**
	 * Rights no action on this surface satisfies, in canonical order. Hosts
	 * keep these reachable with their own controls, such as a link to the
	 * preference center. `disclosure` never appears because inline legal
	 * links carry it; `opt-out` is covered by reject; `preferences` is
	 * covered by customize, save, or the preferences surface itself. An
	 * uncovered opt-out control opens the preference center, so it also
	 * satisfies the preferences right and only `opt-out` is listed.
	 */
	uncoveredRights: PolicyRight[];
	direction: 'row' | 'column';
	uiProfile: 'balanced' | 'compact' | 'strict';
	scrollLock: boolean;
	trapFocus: boolean;
	shouldFillActions: boolean;
	/** Resolved shape of the surface. */
	variant: PromptVariant;
	/** Resolved position, always valid for `variant`. */
	position: PromptPosition;
	/**
	 * `host` when the position came from presentation or an override,
	 * `default` when the variant default filled it. Adapters may mirror a
	 * defaulted corner for right-to-left text; a host position is final.
	 */
	positionSource: 'host' | 'default';
	/** Backdrop, scroll lock, focus trap and no outside dismissal, resolved. */
	blocking: boolean;
}

/**
 * Layout used when the host supplies none: reject and accept share one
 * group at equal prominence, and every other allowed action (customize on
 * the prompt, save in preferences, dismiss on a notice) follows on its
 * own. With the default `compact` profile and customize as the default
 * primary, that renders as `[reject] [accept] ---- [customize]` on one row.
 */
const defaultLayout = function defaultLayout(
	allowedActions: PresentationAction[]
): NonNullable<SurfacePresentation['layout']> {
	const choicePair: PresentationAction[] = ['reject', 'accept'].filter(
		(action): action is PresentationAction =>
			allowedActions.includes(action as PresentationAction)
	);
	const rest = allowedActions.filter((action) => !choicePair.includes(action));
	return choicePair.length > 0 ? [choicePair, ...rest] : rest;
};

const resolveRequiredGroups = function resolveRequiredGroups(
	allowedActions: PresentationAction[],
	requiredActions: PresentationAction[],
	suppliedLayout: SurfacePresentation['layout'],
	diagnostics: PresentationDiagnostic[]
): PresentationAction[][] {
	const seen = new Set<PresentationAction>();
	const actionGroups: PresentationAction[][] = [];
	const layout = suppliedLayout ?? defaultLayout(allowedActions);
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
 * Rights the resolved actions leave unsatisfied. `policy.rights` is already
 * canonical, so filtering keeps the order stable for memoized hosts.
 */
const resolveUncoveredRights = function resolveUncoveredRights(
	rights: readonly PolicyRight[],
	orderedActions: readonly PresentationAction[],
	preferences: boolean
): PolicyRight[] {
	// Resolve opt-out first: the host control for an uncovered opt-out
	// opens the preference center, so it keeps preferences reachable too.
	const optOutUncovered =
		rights.includes('opt-out') && !orderedActions.includes('reject');
	return rights.filter((right) => {
		switch (right) {
			case 'disclosure':
				return false;
			case 'preferences':
				return !(
					preferences ||
					optOutUncovered ||
					orderedActions.includes('customize') ||
					orderedActions.includes('save')
				);
			case 'opt-out':
				return optOutUncovered;
			default:
				return true;
		}
	});
};

/** Whether a position is valid for a variant. */
const isValidPromptPosition = function isValidPromptPosition(
	variant: PromptVariant,
	position: PromptPosition
): boolean {
	return (PROMPT_VARIANT_POSITIONS[variant] as readonly string[]).includes(
		position
	);
};

/**
 * Resolve the surface geometry. Variant comes first, position is validated
 * against it, and blocking is forced by the prompt kind or, on the prompt
 * surface, by the variant.
 */
const resolveSurfaceGeometry = function resolveSurfaceGeometry(
	options: PromptPresentation,
	notice: boolean,
	preferences: boolean,
	diagnostics: PresentationDiagnostic[]
): Pick<
	ResolvedConsentPresentation,
	'variant' | 'position' | 'positionSource' | 'blocking'
> {
	const defaultVariant: PromptVariant = preferences ? 'wall' : 'floating';
	const variant = options.variant ?? defaultVariant;
	const defaultPosition = PROMPT_VARIANT_DEFAULT_POSITION[variant];
	let position: PromptPosition = defaultPosition;
	let positionSource: 'host' | 'default' = 'default';
	if (options.position !== undefined) {
		if (isValidPromptPosition(variant, options.position)) {
			({ position } = options);
			positionSource = 'host';
		} else {
			diagnostics.push({
				actions: [],
				code: 'invalid-position',
				message: `Position "${options.position}" is not valid for the ${variant} variant; using "${defaultPosition}".`,
			});
		}
	}
	// The preferences surface keeps its pre-variant behavior: turning off
	// scroll lock or the focus trap makes the dialog non-blocking.
	const defaultBlocking = preferences
		? !(options.scrollLock === false || options.trapFocus === false)
		: variant === 'wall';
	let blocking = options.blocking ?? defaultBlocking;
	if (notice && blocking) {
		blocking = false;
		diagnostics.push({
			actions: [],
			code: 'blocking-forbidden',
			message: 'A notice prompt is never blocking; blocking was disabled.',
		});
	} else if (!preferences && variant === 'wall' && !blocking) {
		blocking = true;
		diagnostics.push({
			actions: [],
			code: 'blocking-required',
			message: 'The wall variant is always blocking; blocking was enabled.',
		});
	}
	return { blocking, position, positionSource, variant };
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
		// Customize is the default primary on the prompt so reject and accept
		// stay neutral together; preferences lead with save.
		const defaultPrimary: PresentationAction[] = preferences
			? ['save']
			: ['customize'];
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
		// `compact` sizes buttons to their labels so the default split layout
		// reads as one row; `balanced` and `strict` fill and stack instead.
		const uiProfile = options.uiProfile ?? 'compact';
		const geometry = resolveSurfaceGeometry(
			options,
			notice,
			preferences,
			diagnostics
		);
		// Today's defaults stay for non-blocking surfaces; blocking forces both.
		const scrollLock =
			geometry.blocking ||
			(notice ? false : (options.scrollLock ?? preferences));
		const trapFocus =
			geometry.blocking || (notice ? false : (options.trapFocus ?? true));
		return {
			...geometry,
			actionGroups,
			allowedActions,
			diagnostics,
			direction,
			equivalentActions,
			orderedActions,
			primaryActions,
			requiredActions,
			rights: input.policy.rights,
			scrollLock,
			shouldFillActions: uiProfile === 'strict' || uiProfile === 'balanced',
			trapFocus,
			uiProfile,
			uncoveredRights: resolveUncoveredRights(
				input.policy.rights,
				orderedActions,
				preferences
			),
		};
	};
