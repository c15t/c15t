/**
 * A/B experiments on consent presentation.
 *
 * A host declares arms as {@link ConsentPresentation} fragments and either
 * resolves the arm itself (any feature-flag provider) or lets c15t assign
 * one deterministically. The assignment is recorded on every impression
 * and choice so opt-in rates can be compared per arm. Arms vary
 * presentation only; policy semantics and copy are untouched.
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

/** A/B experiment on prompt/preferences presentation. */
export interface ConsentExperiment {
	/** Stable experiment identifier, recorded with every impression and choice. */
	id: string;
	/** Presentation per arm. Keys are variant names. */
	variants: Readonly<Record<string, ConsentPresentation>>;
	/**
	 * Arm resolved by the host (any flag provider). When omitted, c15t assigns
	 * deterministically from the subject id using `weights`.
	 */
	variant?: string;
	/**
	 * Relative weights per arm for built-in assignment. Default: equal. An
	 * arm missing from a supplied map has weight `0`.
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

const variantNames = function variantNames(
	experiment: ConsentExperiment
): string[] {
	const names = Object.keys(experiment.variants);
	if (names.length === 0) {
		throw new Error(
			`c15t experiment "${experiment.id}": declare at least one variant.`
		);
	}
	return names;
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
 * in `variants`, or when `variants` is empty.
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
				`c15t experiment "${experiment.id}": variant "${experiment.variant}" is not one of ${names.map((name) => `"${name}"`).join(', ')}.`
			);
		}
		return {
			acknowledgedDiagnostics,
			assignedBy: 'host',
			id: experiment.id,
			variant: experiment.variant,
		};
	}
	const { weights } = experiment;
	let weighted = names.map((name) =>
		weights ? Math.max(0, weights[name] ?? 0) : 1
	);
	const total = weighted.reduce((sum, weight) => sum + weight, 0);
	if (!(total > 0) || !Number.isFinite(total)) {
		weighted = names.map(() => 1);
	}
	const sum = weighted.reduce((acc, weight) => acc + weight, 0);
	const point =
		(fnv1a(`${experiment.id}:${subjectId}`) / 0x1_00_00_00_00) * sum;
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

/** Inputs {@link validateExperiment} resolves each arm with. */
export interface ValidateExperimentOptions {
	/** The host's base presentation each arm is merged over. */
	presentation?: ConsentPresentation;
	/** Host appearance tokens, so a themed prominence override is caught too. */
	actionAppearance?: Partial<
		Record<PresentationAction, { variant?: string; mode?: string }>
	>;
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
 * `experiment.acknowledgeDiagnostics` is not `true`.
 */
export const validateExperiment = function validateExperiment(
	experiment: ConsentExperiment,
	policy: ResolvedPolicyRule,
	options: ValidateExperimentOptions = {}
): ExperimentDiagnostics {
	const diagnostics: ExperimentDiagnostics = {};
	for (const name of variantNames(experiment)) {
		const presentation = resolveExperimentPresentation(
			options.presentation,
			experiment,
			{ variant: name }
		);
		const found = (['prompt', 'preferences'] as const).flatMap(
			(surface) =>
				resolveConsentPresentation({
					actionAppearance: options.actionAppearance,
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
			`c15t experiment "${experiment.id}": these arms trip presentation diagnostics under policy "${policy.id}". Fix the arm or set acknowledgeDiagnostics: true to run it and record the acknowledgement.\n${detail}`
		);
	}
	return diagnostics;
};
