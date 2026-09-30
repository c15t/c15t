/**
 * A/B experiments on consent presentation.
 *
 * The host's own `presentation` is the `control` arm. Every other arm is a
 * {@link ConsentPresentation} fragment merged over it. The host passes the
 * arm its feature-flag provider resolved, or a `split` for c15t to pick
 * one. The arm goes out with `/init` and is recorded on the choices of
 * visitors the banner showed it to, so a dashboard can compare opt-in
 * rates per arm. Arms vary presentation and theme tokens only; policy
 * semantics and copy are untouched.
 *
 * This module is what every page ships: the types, merging an arm over the
 * host presentation, and the seed. Assignment and validation live in
 * `experiment-assignment` and `experiment-engine`, loaded on demand.
 */
import type { ConsentKernel, ConsentSnapshot } from '../types';
import type { StorageConfig } from './cookie';
import { readStoredExperimentArm } from './experiment-storage';
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

/** The arm that is the host's own `presentation`. Always part of an experiment. */
export const CONTROL_ARM = 'control';

/**
 * A/B experiment on prompt/preferences presentation.
 *
 * @typeParam Arm - The names of the arms that change something. Inferred
 * when the experiment is built with {@link defineExperiment}, so `arm` and
 * `split` reject a name that is not an arm.
 */
export interface ConsentExperiment<Arm extends string = string> {
	/** Stable experiment identifier, recorded with every choice. */
	id: string;
	/**
	 * What each arm changes, merged over `presentation`. `control` is
	 * always an arm and is your `presentation` as is, so it is not listed.
	 */
	arms: Readonly<Record<Arm, ExperimentArm>>;
	/**
	 * The arm your flag provider resolved for this visitor: `control` or a
	 * key of `arms`. Omit it and set `split` to let c15t pick. An arm that is
	 * not declared logs an error and runs no experiment.
	 */
	arm?: NoInfer<Arm> | typeof CONTROL_ARM;
	/**
	 * How c15t splits visitors when you do not pass `arm`, as relative
	 * weights: `{ control: 60, wall: 40 }`. Default: equal. An arm missing
	 * from the map gets none. Every key must be `control` or an arm.
	 */
	split?: Readonly<Partial<Record<NoInfer<Arm> | typeof CONTROL_ARM, number>>>;
	/**
	 * Run arms that trip presentation diagnostics (for example
	 * `equivalent-prominence-overridden`). Without this, a visitor whose
	 * policy rejects an arm sees `control` and is not counted. The
	 * acknowledgement is recorded on the consent record with the arm.
	 */
	acknowledgeDiagnostics?: boolean;
}

/**
 * Declare an experiment with its arm names inferred, so a misspelled `arm`
 * or `split` key is a type error. Returns its argument.
 *
 * @typeParam Arm - The arm names, inferred from `arms`.
 * @param experiment - The experiment definition.
 * @returns `experiment`, unchanged.
 *
 * @example
 * ```ts
 * const bannerShape = defineExperiment({
 *   id: 'banner-shape',
 *   arms: { wall: { prompt: { variant: 'wall' } } },
 * });
 *
 * // With a flag: experiment: { ...bannerShape, arm: flagValue }
 * // Without:     experiment: { ...bannerShape, split: { control: 60, wall: 40 } }
 * ```
 */
export const defineExperiment = function defineExperiment<Arm extends string>(
	experiment: ConsentExperiment<Arm>
): ConsentExperiment<Arm> {
	return experiment;
};

/** The arm names of an experiment, `control` first. */
export const experimentArmNames = function experimentArmNames(
	experiment: ConsentExperiment
): string[] {
	return [
		CONTROL_ARM,
		...Object.keys(experiment.arms).filter((name) => name !== CONTROL_ARM),
	];
};

/** Whether `name` is `control` or a declared arm. */
export const isExperimentArm = function isExperimentArm(
	experiment: ConsentExperiment,
	name: string
): boolean {
	return name === CONTROL_ARM || Object.hasOwn(experiment.arms, name);
};

/** What an arm changes; `undefined` for `control` or an unknown arm. */
const armChanges = function armChanges(
	experiment: ConsentExperiment,
	name: string
): ExperimentArm | undefined {
	return name !== CONTROL_ARM && Object.hasOwn(experiment.arms, name)
		? (experiment.arms as Record<string, ExperimentArm>)[name]
		: undefined;
};

/** The arm a visitor runs, recorded with impressions and choices. */
export interface ExperimentAssignment {
	/** {@link ConsentExperiment.id}. */
	id: string;
	/** `control` or a key of {@link ConsentExperiment.arms}. */
	arm: string;
	/** `host` when the host passed `arm`, `c15t` when c15t picked it. */
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
	// A key the arm leaves `undefined` is omitted, not a reset: spreading it
	// would wipe the base value.
	const merged = { ...base } as Surface & PreferencesPresentation;
	for (const [key, value] of Object.entries(arm)) {
		if (value !== undefined) {
			(merged as Record<string, unknown>)[key] = value;
		}
	}
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
 * category. `control`, or an arm that no longer exists, returns `base`.
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
		assignment: Pick<ExperimentAssignment, 'arm'>
	): ConsentPresentation {
		const arm = armChanges(experiment, assignment.arm);
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
	assignment: Pick<ExperimentAssignment, 'id' | 'arm'> | null | undefined
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
	assignment: Pick<ExperimentAssignment, 'arm'>
): ThemeType | undefined {
	const arm = armChanges(experiment, assignment.arm)?.theme;
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
	assignment: Pick<ExperimentAssignment, 'id' | 'arm'> | null | undefined
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
 * What is wrong with an experiment definition, or `null` when nothing is:
 * an `arms` entry named `control`, an undeclared `arm`, or a `split` that
 * names an unknown arm or gives no arm a positive weight.
 *
 * @param experiment - The experiment definition.
 * @returns A message naming the problem, or `null`.
 */
export const experimentConfigError = function experimentConfigError(
	experiment: ConsentExperiment
): string | null {
	const label = `c15t experiment "${experiment.id}"`;
	if (Object.hasOwn(experiment.arms, CONTROL_ARM)) {
		return `${label}: \`control\` is your \`presentation\`; do not list it in \`arms\`.`;
	}
	if (
		experiment.arm !== undefined &&
		!isExperimentArm(experiment, experiment.arm)
	) {
		return `${label}: arm "${experiment.arm}" is not \`control\` or one of \`arms\`.`;
	}
	if (experiment.arm === undefined && experiment.split) {
		const unknown = Object.keys(experiment.split).filter(
			(name) => !isExperimentArm(experiment, name)
		);
		if (unknown.length > 0) {
			return `${label}: split names ${unknown.map((name) => `"${name}"`).join(', ')}, which ${unknown.length === 1 ? 'is not an arm' : 'are not arms'}.`;
		}
		const total = Object.values(experiment.split).reduce<number>(
			(sum, weight) => sum + Math.max(0, weight ?? 0),
			0
		);
		if (!(total > 0) || !Number.isFinite(total)) {
			return `${label}: split must give at least one arm a finite positive weight.`;
		}
	}
	return null;
};

/**
 * Pick an arm for a visitor c15t assigns: the arm this browser already saw
 * when it still exists, otherwise a weighted random pick over `split`
 * (equal by default). Nothing here is stored; the controller stores the arm
 * once the banner has shown it.
 *
 * @param experiment - A valid experiment definition without `arm`.
 * @param stored - The arm this browser stored, if any.
 * @param random - A number in `[0, 1)`; injectable for tests.
 * @returns The assignment, `assignedBy: 'c15t'`.
 */
export const pickExperimentArm = function pickExperimentArm(
	experiment: ConsentExperiment,
	stored: { id: string; arm: string } | null,
	random: number = Math.random()
): ExperimentAssignment {
	const assignment = (arm: string): ExperimentAssignment => ({
		acknowledgedDiagnostics: experiment.acknowledgeDiagnostics === true,
		arm,
		assignedBy: 'c15t',
		id: experiment.id,
	});
	if (stored?.id === experiment.id && isExperimentArm(experiment, stored.arm)) {
		return assignment(stored.arm);
	}
	const names = experimentArmNames(experiment);
	const split = experiment.split as
		| Record<string, number | undefined>
		| undefined;
	const weights = names.map((name) =>
		split ? Math.max(0, (Object.hasOwn(split, name) ? split[name] : 0) ?? 0) : 1
	);
	const total = weights.reduce((sum, weight) => sum + weight, 0);
	let point = random * total;
	for (const [index, name] of names.entries()) {
		point -= weights[index] ?? 0;
		if (point < 0) {
			return assignment(name);
		}
	}
	return assignment(names.at(-1) ?? CONTROL_ARM);
};

/**
 * The kernel seed for an experiment, known before any render.
 *
 * - A server prefetch that already rendered an arm of this experiment
 *   (the Astro middleware, a server seed) keeps it: the visitor saw it.
 * - Otherwise a host `arm` is the arm.
 * - Otherwise c15t picks one in the browser when the runtime starts.
 *
 * The prompt is held until the controller has checked the arm against the
 * visitor's policy, so the banner never swaps from one presentation to
 * another in front of the visitor. The one exception is a known arm the
 * server already rendered (`rendered`): that banner is on screen, and
 * hiding it to check it would be the swap this avoids.
 *
 * An invalid definition logs an error and runs no experiment rather than
 * failing the page.
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
	const configError = experimentConfigError(experiment);
	if (configError) {
		console.error(`${configError} No experiment runs.`);
		return {};
	}
	const acknowledgedDiagnostics = experiment.acknowledgeDiagnostics === true;
	let initialExperiment: ExperimentAssignment | undefined;
	if (
		prefetched?.id === experiment.id &&
		isExperimentArm(experiment, prefetched.arm)
	) {
		initialExperiment = { ...prefetched, acknowledgedDiagnostics };
	} else if (experiment.arm !== undefined) {
		initialExperiment = {
			acknowledgedDiagnostics,
			arm: experiment.arm,
			assignedBy: 'host',
			id: experiment.id,
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
 * Run the experiment on a started runtime. Call it after hydration and
 * before `init()`.
 *
 * When c15t picks the arm, it does so here, synchronously, so the `/init`
 * that follows already carries it. Then the controller loads as its own
 * chunk, checks the arm against the visitor's policy and releases the held
 * prompt. A site pays for the controller only when it runs an experiment.
 * A failed load runs no experiment and still releases the prompt, so a
 * visitor is never left without a banner.
 *
 * @param options - The experiment, kernel and host presentation.
 * @returns Detach the controller.
 * @internal
 */
export const startExperiment = function startExperiment(
	options: StartExperimentOptions
): () => void {
	const { experiment, kernel } = options;
	if (experimentConfigError(experiment)) {
		// `seedExperiment` already reported it; release anything held.
		kernel.set.experiment(null);
		return () => undefined;
	}
	if (!kernel.getSnapshot().experiment && experiment.arm === undefined) {
		kernel.set.experiment(
			pickExperimentArm(experiment, readStoredExperimentArm())
		);
	}
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
				`c15t experiment "${experiment.id}": the experiment module failed to load, so no experiment runs.`,
				failure
			);
			if (!stopped) {
				kernel.set.experiment(null);
			}
		}
	};
	void attach();
	return () => {
		stopped = true;
		detach?.();
	};
};
