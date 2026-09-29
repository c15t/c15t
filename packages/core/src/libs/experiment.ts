/**
 * A/B experiments on consent presentation.
 *
 * A host declares arms as {@link ConsentPresentation} fragments and either
 * resolves the arm itself (any feature-flag provider) or lets c15t assign
 * one. The arm is recorded on the impressions and choices of visitors the
 * banner showed it to, so opt-in rates can be compared per arm. Arms vary
 * presentation and theme tokens only; policy semantics and copy are
 * untouched.
 *
 * This module is what every page ships: the types, merging an arm over the
 * host presentation, and the seed. Assignment and validation live in
 * `experiment-assignment` and `experiment-engine`, loaded on demand.
 */
import type { ConsentKernel, ConsentSnapshot } from '../types';
import type { StorageConfig } from './cookie';
import type {
	ConsentPresentation,
	PreferencesPresentation,
	PresentationAction,
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

/**
 * A/B experiment on prompt/preferences presentation.
 *
 * @typeParam Arm - The arm names. Inferred when the experiment is built
 * with {@link defineExperiment}, so `variant` and `weights` reject a name
 * that is not an arm.
 */
export interface ConsentExperiment<Arm extends string = string> {
	/** Stable experiment identifier, recorded with every impression and choice. */
	id: string;
	/** Presentation and theme per arm. Keys are the arm names. */
	variants: Readonly<Record<Arm, ExperimentArm>>;
	/**
	 * The arm your flag provider resolved for this visitor. When omitted,
	 * c15t picks one by `weights` and keeps it for this browser once the
	 * banner has shown it. An arm that is not declared runs no experiment
	 * and logs an error.
	 */
	variant?: NoInfer<Arm>;
	/**
	 * Relative weights per arm for built-in assignment. Default: equal. An
	 * arm missing from a supplied map has weight `0`. A supplied map must
	 * give at least one arm a positive weight and name only declared arms.
	 */
	weights?: Readonly<Partial<Record<NoInfer<Arm>, number>>>;
	/**
	 * Run arms that trip presentation diagnostics (for example
	 * `equivalent-prominence-overridden`). Without this, a visitor whose
	 * policy rejects an arm sees the base presentation and is not counted in
	 * the experiment. The acknowledgement is recorded on the consent record
	 * with the arm.
	 */
	acknowledgeDiagnostics?: boolean;
}

/**
 * Declare an experiment with its arm names inferred, so a misspelled
 * `variant` or `weights` key is a type error. Returns its argument.
 *
 * @typeParam Arm - The arm names, inferred from `variants`.
 * @param experiment - The experiment definition.
 * @returns `experiment`, unchanged.
 *
 * @example
 * ```ts
 * const bannerShape = defineExperiment({
 *   id: 'banner-shape',
 *   variants: { floating: {}, wall: { prompt: { variant: 'wall' } } },
 *   weights: { floating: 90, wall: 10 },
 * });
 * ```
 */
export const defineExperiment = function defineExperiment<Arm extends string>(
	experiment: ConsentExperiment<Arm>
): ConsentExperiment<Arm> {
	return experiment;
};

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

/**
 * Whether the policy a snapshot resolved lets the visitor run their arm.
 * The kernel asks it in the same commit that resolves a new policy, so the
 * impression that commit stamps already carries the arm the visitor sees.
 */
export type ExperimentGate = (snapshot: ConsentSnapshot) => boolean;

/**
 * The kernel seed for an experiment, known before any render.
 *
 * - A server prefetch that already rendered an arm of this experiment
 *   (the Astro middleware, a server seed) keeps it: the visitor saw it.
 * - Otherwise a host `variant` is the arm.
 * - Otherwise built-in assignment picks the arm in the browser.
 *
 * The prompt is held until the controller has checked the arm against the
 * visitor's policy, so the banner never swaps from one presentation to
 * another in front of the visitor. The one exception is a known arm the
 * server already rendered (`rendered`): that banner is on screen, and
 * hiding it to check it would be the swap this avoids.
 *
 * An undeclared host `variant` logs an error and runs no experiment
 * rather than failing the page.
 *
 * @param experiment - The `experiment` option, if any.
 * @param prefetched - `initialExperiment` from a server prefetch, if any.
 * @param rendered - The server resolved the policy and rendered the prompt
 * from this snapshot.
 * @returns Kernel config fields to spread into `createConsentKernel`.
 * @internal
 */
export const seedExperiment = function seedExperiment(
	experiment: ConsentExperiment | undefined,
	prefetched?: ExperimentAssignment | null,
	rendered = false
): {
	initialExperiment?: ExperimentAssignment;
	initialExperimentPending?: true;
} {
	if (!experiment) {
		return {};
	}
	const acknowledgedDiagnostics = experiment.acknowledgeDiagnostics === true;
	let initialExperiment: ExperimentAssignment | undefined;
	if (
		prefetched?.id === experiment.id &&
		Object.hasOwn(experiment.variants, prefetched.variant)
	) {
		initialExperiment = { ...prefetched, acknowledgedDiagnostics };
	} else if (experiment.variant !== undefined) {
		if (!Object.hasOwn(experiment.variants, experiment.variant)) {
			console.error(
				`c15t experiment "${experiment.id}": variant "${experiment.variant}" is not one of its arms, so no experiment runs.`
			);
			return {};
		}
		initialExperiment = {
			acknowledgedDiagnostics,
			assignedBy: 'host',
			id: experiment.id,
			variant: experiment.variant,
		};
	}
	if (initialExperiment && rendered) {
		return { initialExperiment };
	}
	return initialExperiment
		? { initialExperiment, initialExperimentPending: true }
		: { initialExperimentPending: true };
};

/** Inputs of {@link startExperiment}. */
export interface StartExperimentOptions {
	experiment: ConsentExperiment;
	kernel: ConsentKernel;
	/** The host's base presentation each arm is merged over. */
	presentation?: ConsentPresentation;
	/** The host theme each arm's `theme` is merged over for validation. */
	theme?: ExperimentArmTheme;
	storageConfig?: StorageConfig;
}

/**
 * Load the experiment controller and attach it to `kernel`: validation,
 * built-in assignment and the stored arm. The controller is its own chunk,
 * so a site pays for it only when it runs an experiment. Call it once the
 * kernel is hydrated, so a returning visitor's subject id can seed the arm.
 *
 * A failed load runs no experiment: the prompt is released with the base
 * presentation, so a visitor is never left without a banner.
 *
 * @param options - The experiment, kernel and host presentation.
 * @returns Detach the controller.
 * @internal
 */
export const startExperiment = function startExperiment(
	options: StartExperimentOptions
): () => void {
	let detach: (() => void) | null = null;
	let stopped = false;
	const attach = async (): Promise<void> => {
		try {
			const { createExperimentController } =
				await import('./experiment-assignment');
			if (!stopped) {
				detach = createExperimentController(options).dispose;
			}
		} catch (failure) {
			console.error(
				`c15t experiment "${options.experiment.id}": the experiment module failed to load, so no experiment runs.`,
				failure
			);
			if (!stopped) {
				options.kernel.set.experiment(null);
			}
		}
	};
	void attach();
	return () => {
		stopped = true;
		detach?.();
	};
};
