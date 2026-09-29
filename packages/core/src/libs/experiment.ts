/**
 * A/B experiments on consent presentation.
 *
 * A host declares arms as {@link ConsentPresentation} fragments and either
 * resolves the arm itself (any feature-flag provider) or lets c15t assign
 * one deterministically. The assignment is recorded on every impression
 * and choice so opt-in rates can be compared per arm. Arms vary
 * presentation and theme tokens only; policy semantics and copy are
 * untouched.
 */
import type { ResolvedPolicyRule } from '@c15t/schema/types';

import { resolveConsentPresentation } from './policy-actions';
import type {
	ConsentPresentation,
	PreferencesPresentation,
	PresentationAction,
	PresentationDiagnostic,
	PromptPresentation,
} from './policy-actions';

/**
 * Styling of one consent action, the shape `theme.consentActions` uses.
 * Structural so core stays independent of `@c15t/ui`.
 */
export interface ExperimentActionStyle {
	variant?: string;
	mode?: string;
}

/**
 * Theme overrides an arm merges over the host theme.
 *
 * Structurally compatible with `Theme` from `@c15t/ui/theme`: every token
 * group is a plain object merged one level deep, so `colors: { primary }`
 * replaces that colour and keeps the rest of the host palette. Arrays are
 * replaced, not concatenated. `consentActions` is typed because
 * {@link validateExperiment} reads it for the prominence check.
 */
export interface ExperimentArmTheme {
	/** Light-mode colour tokens. */
	colors?: object;
	/** Dark-mode colour tokens. */
	dark?: object;
	/** Typography tokens. */
	typography?: object;
	/** Spacing tokens. */
	spacing?: object;
	/** Radius tokens. */
	radius?: object;
	/** Shadow tokens. */
	shadows?: object;
	/** Motion tokens. */
	motion?: object;
	/** Per-action button styling. Runs through the prominence check. */
	consentActions?: Partial<
		Record<'default' | 'primary' | PresentationAction, ExperimentActionStyle>
	>;
	/** Component slot overrides. */
	slots?: object;
}

/** One arm: a presentation fragment plus optional theme overrides. */
export interface ExperimentArm extends ConsentPresentation {
	/** Theme overrides merged over the host theme for this arm. */
	theme?: ExperimentArmTheme;
}

/** A/B experiment on prompt/preferences presentation. */
export interface ConsentExperiment {
	/** Stable experiment identifier, recorded with every impression and choice. */
	id: string;
	/** Presentation and theme per arm. Keys are variant names. */
	variants: Readonly<Record<string, ExperimentArm>>;
	/**
	 * Arm resolved by the host (any flag provider). When omitted, c15t assigns
	 * deterministically from the subject id using `weights`.
	 */
	variant?: string;
	/**
	 * Relative weights per arm for built-in assignment. Default: equal. An
	 * arm missing from a supplied map has weight `0`. A supplied map must
	 * give at least one arm a positive weight.
	 */
	weights?: Readonly<Record<string, number>>;
	/**
	 * Run arms that trip presentation diagnostics (for example
	 * `equivalent-prominence-overridden`). Without this, such an arm is
	 * rejected at registration. The acknowledgement is recorded on the
	 * consent record with the arm.
	 */
	acknowledgeDiagnostics?: boolean;
}

/** The arm a visitor runs, recorded with impressions and choices. */
export interface ExperimentAssignment {
	/** {@link ConsentExperiment.id}. */
	id: string;
	/** Variant name, a key of {@link ConsentExperiment.variants}. */
	variant: string;
	/** `host` when the host supplied the variant, `c15t` for built-in assignment. */
	assignedBy: 'host' | 'c15t';
	/** Whether the host acknowledged presentation diagnostics for this experiment. */
	acknowledgedDiagnostics: boolean;
}

/** Diagnostics per arm name; only arms with at least one diagnostic appear. */
export type ExperimentDiagnostics = Record<string, PresentationDiagnostic[]>;

/**
 * FNV-1a 32-bit hash over UTF-16 code units. Stable across runtimes and
 * cheap; this is bucketing, not security.
 */
const fnv1a = function fnv1a(input: string): number {
	let hash = 0x81_1c_9d_c5;
	for (let index = 0; index < input.length; index += 1) {
		// oxlint-disable-next-line no-bitwise -- XOR-then-multiply is the algorithm.
		hash ^= input.charCodeAt(index);
		// oxlint-disable-next-line no-bitwise -- Keep the product unsigned.
		hash = Math.imul(hash, 0x01_00_01_93) >>> 0;
	}
	// oxlint-disable-next-line no-bitwise -- Unsigned result.
	return hash >>> 0;
};

/** The prefix every experiment error starts with. */
const label = function label(experiment: ConsentExperiment): string {
	return `c15t experiment "${experiment.id}"`;
};

const variantNames = function variantNames(
	experiment: ConsentExperiment
): string[] {
	const names = Object.keys(experiment.variants);
	if (names.length === 0) {
		throw new Error(`${label(experiment)}: declare at least one variant.`);
	}
	return names;
};

/**
 * The weight of each arm in declaration order and their total: `1` each
 * when `weights` is omitted, else the host's own-property value clamped at
 * `0`. A supplied map that leaves no arm reachable is a misconfiguration,
 * not a request for equal weights.
 */
const resolveWeights = function resolveWeights(
	experiment: ConsentExperiment,
	names: readonly string[]
): [weighted: number[], total: number] {
	const { weights } = experiment;
	if (!weights) {
		return [names.map(() => 1), names.length];
	}
	const weighted = names.map((name) =>
		Object.hasOwn(weights, name) ? Math.max(0, weights[name] ?? 0) : 0
	);
	const total = weighted.reduce((sum, weight) => sum + weight, 0);
	if (!(total > 0) || !Number.isFinite(total)) {
		throw new Error(
			`${label(experiment)}: weights must give at least one arm a finite positive weight.`
		);
	}
	return [weighted, total];
};

/**
 * Pick the arm a subject runs.
 *
 * A host-supplied `variant` wins and is reported as `assignedBy: 'host'`.
 * Otherwise `${experiment.id}:${subjectId}` is hashed and bucketed by the
 * cumulative `weights` over the variants in declaration order, so the same
 * subject lands in the same arm on every call.
 *
 * @param experiment - The experiment definition.
 * @param subjectId - A stable identifier for the subject.
 * @returns The assignment.
 * @throws {Error} When `experiment.variant` names an arm that is not declared
 * in `variants`, when `variants` is empty, or when a supplied `weights` map
 * has no finite positive total.
 *
 * @example
 * ```ts
 * assignExperimentVariant(
 *   { id: 'banner-shape', variants: { bar: {}, floating: {} }, weights: { bar: 9, floating: 1 } },
 *   'sub_123'
 * );
 * // { id: 'banner-shape', variant: 'bar', assignedBy: 'c15t', acknowledgedDiagnostics: false }
 * ```
 */
export const assignExperimentVariant = function assignExperimentVariant(
	experiment: ConsentExperiment,
	subjectId: string
): ExperimentAssignment {
	const names = variantNames(experiment);
	const acknowledgedDiagnostics = experiment.acknowledgeDiagnostics === true;
	if (experiment.variant !== undefined) {
		if (!names.includes(experiment.variant)) {
			throw new Error(
				`${label(experiment)}: variant "${experiment.variant}" is not one of ${names.map((name) => `"${name}"`).join(', ')}.`
			);
		}
		return {
			acknowledgedDiagnostics,
			assignedBy: 'host',
			id: experiment.id,
			variant: experiment.variant,
		};
	}
	const [weighted, total] = resolveWeights(experiment, names);
	const point =
		(fnv1a(`${experiment.id}:${subjectId}`) / 0x1_00_00_00_00) * total;
	let cumulative = 0;
	let variant = names.at(-1) as string;
	for (let index = 0; index < names.length; index += 1) {
		cumulative += weighted[index] ?? 0;
		if (point < cumulative) {
			variant = names[index] as string;
			break;
		}
	}
	return {
		acknowledgedDiagnostics,
		assignedBy: 'c15t',
		id: experiment.id,
		variant,
	};
};

const mergeSurface = function mergeSurface<
	Surface extends PromptPresentation | PreferencesPresentation,
>(base: Surface | undefined, arm: Surface | undefined): Surface | undefined {
	if (!base) {
		return arm;
	}
	if (!arm) {
		return base;
	}
	const merged = { ...base, ...arm } as Surface & PreferencesPresentation;
	const baseDefaults = (base as PreferencesPresentation).defaults;
	const armDefaults = (arm as PreferencesPresentation).defaults;
	if (baseDefaults && armDefaults) {
		merged.defaults = { ...baseDefaults, ...armDefaults };
	}
	return merged;
};

/**
 * Merge the assigned arm over the host's base presentation.
 *
 * Merges per surface (`prompt`, `preferences`); a key the arm sets wins,
 * everything else comes from `base`. `preferences.defaults` merges per
 * category. An assignment for an arm that no longer exists returns `base`.
 *
 * @param base - The host's `presentation` option.
 * @param experiment - The experiment definition.
 * @param assignment - The arm the subject runs.
 * @returns The presentation to render.
 */
export const resolveExperimentPresentation =
	function resolveExperimentPresentation(
		base: ConsentPresentation | undefined,
		experiment: ConsentExperiment,
		assignment: Pick<ExperimentAssignment, 'variant'>
	): ConsentPresentation {
		const arm = experiment.variants[assignment.variant];
		if (!arm) {
			return base ?? {};
		}
		const merged: ConsentPresentation = {};
		const prompt = mergeSurface(base?.prompt, arm.prompt);
		if (prompt) {
			merged.prompt = prompt;
		}
		const preferences = mergeSurface(base?.preferences, arm.preferences);
		if (preferences) {
			merged.preferences = preferences;
		}
		return merged;
	};

/**
 * The presentation an adapter renders: the assigned arm merged over `base`,
 * or `base` untouched while no experiment is configured or assigned.
 *
 * @param base - The host's `presentation` option.
 * @param experiment - The `experiment` option, if any.
 * @param assignment - `snapshot.experiment`.
 * @returns The presentation to render.
 */
export const applyExperimentAssignment = function applyExperimentAssignment(
	base: ConsentPresentation | undefined,
	experiment: ConsentExperiment | undefined,
	assignment: Pick<ExperimentAssignment, 'id' | 'variant'> | null | undefined
): ConsentPresentation | undefined {
	if (!experiment || !assignment || assignment.id !== experiment.id) {
		return base;
	}
	return resolveExperimentPresentation(base, experiment, assignment);
};

const isTokenGroup = function isTokenGroup(
	value: unknown
): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/**
 * Merge the assigned arm's theme over the host theme.
 *
 * Top-level keys the arm sets win; a key both sides hold as a plain object
 * (`colors`, `radius`, `consentActions`, ...) merges one level deeper so
 * the arm can change one token and keep the rest. Arrays and scalars are
 * replaced. Returns `base` itself when the arm has no theme or does not
 * exist.
 *
 * @typeParam ThemeType - The host theme type, for example `Theme` from
 * `@c15t/ui/theme`.
 * @param base - The host's `theme` option.
 * @param experiment - The experiment definition.
 * @param assignment - The arm the subject runs.
 * @returns The theme to render.
 */
export const resolveExperimentTheme = function resolveExperimentTheme<
	ThemeType extends object,
>(
	base: ThemeType | undefined,
	experiment: ConsentExperiment,
	assignment: Pick<ExperimentAssignment, 'variant'>
): ThemeType | undefined {
	const arm = experiment.variants[assignment.variant]?.theme;
	if (!arm) {
		return base;
	}
	if (!base) {
		return arm as ThemeType;
	}
	const baseGroups = base as Record<string, unknown>;
	const merged: Record<string, unknown> = { ...baseGroups };
	for (const [key, value] of Object.entries(arm)) {
		if (value === undefined) {
			continue;
		}
		const current = baseGroups[key];
		merged[key] =
			isTokenGroup(current) && isTokenGroup(value)
				? { ...current, ...value }
				: value;
	}
	return merged as ThemeType;
};

/**
 * The theme an adapter renders: the assigned arm's overrides merged over
 * `base`, or `base` untouched while no experiment is configured or
 * assigned. Mirrors {@link applyExperimentAssignment} for theme tokens.
 *
 * @typeParam ThemeType - The host theme type.
 * @param base - The host's `theme` option.
 * @param experiment - The `experiment` option, if any.
 * @param assignment - `snapshot.experiment`.
 * @returns The theme to render.
 */
export const applyExperimentTheme = function applyExperimentTheme<
	ThemeType extends object,
>(
	base: ThemeType | undefined,
	experiment: ConsentExperiment | undefined,
	assignment: Pick<ExperimentAssignment, 'id' | 'variant'> | null | undefined
): ThemeType | undefined {
	if (!experiment || !assignment || assignment.id !== experiment.id) {
		return base;
	}
	return resolveExperimentTheme(base, experiment, assignment);
};

/** Appearance per action, as `resolveConsentPresentation` consumes it. */
export type ActionAppearance = Partial<
	Record<PresentationAction, ExperimentActionStyle>
>;

/**
 * Derive per-action appearance from `theme.consentActions`, the way the
 * framework adapters do before resolving a surface. `default` is spread
 * under each action. Returns `undefined` when no action is styled, so the
 * prominence check falls back to the policy's own defaults.
 *
 * @param theme - A theme carrying `consentActions`, or nothing.
 * @returns Appearance keyed by action, or `undefined`.
 */
export const actionAppearanceFromTheme = function actionAppearanceFromTheme(
	theme: Pick<ExperimentArmTheme, 'consentActions'> | undefined
): ActionAppearance | undefined {
	const styles = theme?.consentActions;
	if (
		!styles?.accept &&
		!styles?.reject &&
		!styles?.customize &&
		!styles?.dismiss
	) {
		return undefined;
	}
	return {
		accept: { ...styles.default, ...styles.accept },
		customize: { ...styles.default, ...styles.customize },
		dismiss: { ...styles.default, ...styles.dismiss },
		reject: { ...styles.default, ...styles.reject },
	};
};

/** Inputs {@link validateExperiment} resolves each arm with. */
export interface ValidateExperimentOptions {
	/** The host's base presentation each arm is merged over. */
	presentation?: ConsentPresentation;
	/**
	 * The host theme each arm's `theme` is merged over, so an arm that
	 * restyles accept and reject through `consentActions` is checked with
	 * the tokens it will render with.
	 */
	theme?: ExperimentArmTheme;
	/**
	 * Host appearance tokens already derived from the host theme. Used for
	 * arms without a `theme`; prefer passing `theme` so themed arms are
	 * derived the same way.
	 */
	actionAppearance?: ActionAppearance;
}

/**
 * Resolve every arm under `policy` and collect presentation diagnostics.
 *
 * An arm that trips a diagnostic (a forbidden action, unequal prominence for
 * equivalent actions, an invalid variant or position) is a misconfiguration
 * unless the host set `acknowledgeDiagnostics`. The host owns that review;
 * c15t records the acknowledgement with the arm.
 *
 * @param experiment - The experiment definition.
 * @param policy - The resolved policy rule the arms will render under.
 * @param options - Base presentation and appearance tokens.
 * @returns Diagnostics keyed by arm name. Empty when every arm is clean.
 * @throws {Error} When an arm has diagnostics and
 * `experiment.acknowledgeDiagnostics` is not `true`, or when built-in
 * assignment would run with a `weights` map that reaches no arm.
 */
export const validateExperiment = function validateExperiment(
	experiment: ConsentExperiment,
	policy: ResolvedPolicyRule,
	options: ValidateExperimentOptions = {}
): ExperimentDiagnostics {
	const diagnostics: ExperimentDiagnostics = {};
	const names = variantNames(experiment);
	if (experiment.variant === undefined) {
		// Fail where the arms are validated, at construction, rather than
		// when built-in assignment first runs in the visitor's browser.
		resolveWeights(experiment, names);
	}
	for (const name of names) {
		const presentation = resolveExperimentPresentation(
			options.presentation,
			experiment,
			{ variant: name }
		);
		const actionAppearance = experiment.variants[name]?.theme
			? actionAppearanceFromTheme(
					resolveExperimentTheme(options.theme, experiment, { variant: name })
				)
			: (options.actionAppearance ?? actionAppearanceFromTheme(options.theme));
		const found = (['prompt', 'preferences'] as const).flatMap(
			(surface) =>
				resolveConsentPresentation({
					actionAppearance,
					policy,
					presentation,
					surface,
				}).diagnostics
		);
		if (found.length > 0) {
			diagnostics[name] = found;
		}
	}
	const failing = Object.keys(diagnostics);
	if (failing.length > 0 && experiment.acknowledgeDiagnostics !== true) {
		const detail = failing
			.map(
				(name) =>
					`"${name}": ${(diagnostics[name] ?? [])
						.map((diagnostic) => `${diagnostic.code} (${diagnostic.message})`)
						.join('; ')}`
			)
			.join('\n');
		throw new Error(
			`${label(experiment)}: these arms trip presentation diagnostics under policy "${policy.id}". Fix them or set acknowledgeDiagnostics: true.\n${detail}`
		);
	}
	return diagnostics;
};
