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
	/** @deprecated Use `blocking` to control scroll, focus and backdrop together. */
	scrollLock?: boolean;
	/** @deprecated Use `blocking` to control scroll, focus and backdrop together. */
	trapFocus?: boolean;
	/**
	 * Controls backdrop, scroll lock and focus trapping together. Explicit
	 * `blocking` takes precedence over the deprecated scroll/focus options.
	 * Notices never block. Choice walls always block. Preferences default to
	 * blocking; other prompts default to non-blocking.
	 */
	blocking?: boolean;
}

/** Presentation of the first interaction required by a policy. */
export interface PromptPresentation extends SurfacePresentation {
	/**
	 * Shape of the prompt. Defaults to `floating`. A notice cannot use `wall`.
	 */
	variant?: PromptVariant;
	/**
	 * Where the surface sits. Must be valid for the resolved variant; an
	 * invalid pair falls back to the variant default with a diagnostic.
	 */
	position?: PromptPosition;
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
		| 'invalid-variant'
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
	 * Additional buttons the stock UI renders to open preferences. The value
	 * selects the label; every button opens the same preference center.
	 * This is a rendering recommendation, not verification of policy rights.
	 * Hosts remain responsible for disclosure and persistent access.
	 */
	preferenceControls: Exclude<PolicyRight, 'disclosure'>[];
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
 * Choose an additional preferences button when the action row needs one.
 * These labels do not establish that the host implements a policy right.
 */
const resolvePreferenceControls = function resolvePreferenceControls(
	rights: readonly PolicyRight[],
	orderedActions: readonly PresentationAction[],
	preferences: boolean,
	messageProfile?: string
): ResolvedConsentPresentation['preferenceControls'] {
	if (preferences) {
		return [];
	}
	if (rights.includes('opt-out') && !orderedActions.includes('reject')) {
		return [messageProfile === 'preferences' ? 'preferences' : 'opt-out'];
	}
	return rights.includes('preferences') && !orderedActions.includes('customize')
		? ['preferences']
		: [];
};

/** Resolve focus, scrolling and backdrop as one mode. */
const resolveBlocking = (
	options: SurfacePresentation,
	variant: PromptVariant,
	notice: boolean,
	preferences: boolean,
	diagnostics: PresentationDiagnostic[]
): boolean => {
	// Legacy controls select one mode, never independent partial modes.
	const legacyBlocking =
		options.scrollLock === false || options.trapFocus === false
			? false
			: (options.scrollLock ?? options.trapFocus);
	let blocking =
		options.blocking ?? legacyBlocking ?? (preferences || variant === 'wall');
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
	return blocking;
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
	let variant = preferences
		? defaultVariant
		: (options.variant ?? defaultVariant);
	if (notice && variant === 'wall') {
		variant = 'floating';
		diagnostics.push({
			actions: [],
			code: 'invalid-variant',
			message: 'A notice cannot use a blocking wall; using floating.',
		});
	}
	if (
		preferences &&
		(options.variant !== undefined || options.position !== undefined)
	) {
		diagnostics.push({
			actions: [],
			code: 'invalid-variant',
			message:
				'Preferences use a centered dialog; variant and position are prompt options.',
		});
	}
	const defaultPosition = PROMPT_VARIANT_DEFAULT_POSITION[variant];
	let position: PromptPosition = defaultPosition;
	let positionSource: 'host' | 'default' = 'default';
	if (!preferences && options.position !== undefined) {
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
	const blocking = resolveBlocking(
		options,
		variant,
		notice,
		preferences,
		diagnostics
	);
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
		const scrollLock = geometry.blocking;
		const trapFocus = geometry.blocking;
		return {
			...geometry,
			actionGroups,
			allowedActions,
			diagnostics,
			direction,
			equivalentActions,
			orderedActions,
			preferenceControls: resolvePreferenceControls(
				input.policy.rights,
				orderedActions,
				preferences,
				input.policy.i18n?.messageProfile
			),
			primaryActions,
			requiredActions,
			rights: input.policy.rights,
			scrollLock,
			shouldFillActions: uiProfile === 'strict' || uiProfile === 'balanced',
			trapFocus,
			uiProfile,
		};
	};
