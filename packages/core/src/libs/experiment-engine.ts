/**
 * The parts of a banner experiment that only run once one is configured:
 * bucketing a visitor into an arm and checking every arm against the
 * presentation rules of a policy.
 *
 * Kept out of the root entry so a site without an experiment never ships
 * them. The runtime loads this module, through
 * {@link ./experiment-assignment}, when the `experiment` option is set.
 */
import type { ResolvedPolicyRule } from '@c15t/schema/types';

import {
	actionAppearanceFromTheme,
	resolveExperimentPresentation,
	resolveExperimentTheme,
} from './experiment';
import type {
	ActionAppearance,
	ConsentExperiment,
	ExperimentArmTheme,
	ExperimentAssignment,
} from './experiment';
import { resolveConsentPresentation } from './policy-actions';
import type {
	ConsentPresentation,
	PresentationDiagnostic,
} from './policy-actions';

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
	// A key that names no arm is almost always a typo, and silently giving
	// its share to the other arms would skew the split the host asked for.
	const unknown = Object.keys(weights).filter((name) => !names.includes(name));
	if (unknown.length > 0) {
		throw new Error(
			`${label(experiment)}: weights name ${unknown.map((name) => `"${name}"`).join(', ')}, which ${unknown.length === 1 ? 'is not an arm' : 'are not arms'}.`
		);
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
 * What is wrong with an experiment definition regardless of policy, or
 * `null` when nothing is: no arms, a host `variant` that names no arm, or a
 * `weights` map built-in assignment could never land in.
 *
 * @param experiment - The experiment definition.
 * @returns A message naming the problem, or `null`.
 */
export const experimentConfigError = function experimentConfigError(
	experiment: ConsentExperiment
): string | null {
	try {
		const names = variantNames(experiment);
		if (experiment.variant === undefined) {
			resolveWeights(experiment, names);
		} else if (!Object.hasOwn(experiment.variants, experiment.variant)) {
			return `${label(experiment)}: variant "${experiment.variant}" is not one of ${names.map((name) => `"${name}"`).join(', ')}.`;
		}
		return null;
	} catch (failure) {
		return failure instanceof Error ? failure.message : String(failure);
	}
};

/**
 * Resolve every arm under `policy` and collect presentation diagnostics,
 * without deciding whether they are acceptable.
 *
 * @param experiment - The experiment definition.
 * @param policy - The resolved policy rule the arms will render under.
 * @param options - Base presentation and appearance tokens.
 * @returns Diagnostics keyed by arm name. Empty when every arm is clean.
 */
export const collectExperimentDiagnostics =
	function collectExperimentDiagnostics(
		experiment: ConsentExperiment,
		policy: ResolvedPolicyRule,
		options: ValidateExperimentOptions = {}
	): ExperimentDiagnostics {
		const diagnostics: ExperimentDiagnostics = {};
		for (const name of Object.keys(experiment.variants)) {
			const presentation = resolveExperimentPresentation(
				options.presentation,
				experiment,
				{ variant: name }
			);
			const actionAppearance = experiment.variants[name]?.theme
				? actionAppearanceFromTheme(
						resolveExperimentTheme(options.theme, experiment, {
							variant: name,
						})
					)
				: (options.actionAppearance ??
					actionAppearanceFromTheme(options.theme));
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
		return diagnostics;
	};

/**
 * The message for arms whose diagnostics were not acknowledged.
 *
 * @internal
 */
export const describeRejectedArms = function describeRejectedArms(
	experiment: ConsentExperiment,
	policy: ResolvedPolicyRule,
	diagnostics: ExperimentDiagnostics
): string {
	const detail = Object.keys(diagnostics)
		.map(
			(name) =>
				`"${name}": ${(diagnostics[name] ?? [])
					.map((diagnostic) => `${diagnostic.code} (${diagnostic.message})`)
					.join('; ')}`
		)
		.join('\n');
	return `${label(experiment)}: these arms trip presentation diagnostics under policy "${policy.id}". Fix them or set acknowledgeDiagnostics: true.\n${detail}`;
};

/**
 * Resolve every arm under `policy` and collect presentation diagnostics.
 *
 * An arm that trips a diagnostic (a forbidden action, unequal prominence for
 * equivalent actions, an invalid variant or position) is a misconfiguration
 * unless the host set `acknowledgeDiagnostics`. The host owns that review;
 * c15t records the acknowledgement with the arm. The runtime does not call
 * this: it runs the base presentation instead of an arm the visitor's policy
 * rejects. Use it in a test to fail a build on a misconfigured experiment.
 *
 * @param experiment - The experiment definition.
 * @param policy - The resolved policy rule the arms will render under.
 * @param options - Base presentation and appearance tokens.
 * @returns Diagnostics keyed by arm name. Empty when every arm is clean.
 * @throws {Error} When the definition is invalid (see
 * {@link experimentConfigError}), or an arm has diagnostics and
 * `experiment.acknowledgeDiagnostics` is not `true`.
 *
 * @example
 * ```ts
 * import { validateExperiment } from 'c15t/experiment';
 *
 * test('banner-shape arms are compliant under the EU policy', () => {
 *   validateExperiment(experiment, euPolicy, { presentation });
 * });
 * ```
 */
export const validateExperiment = function validateExperiment(
	experiment: ConsentExperiment,
	policy: ResolvedPolicyRule,
	options: ValidateExperimentOptions = {}
): ExperimentDiagnostics {
	const configError = experimentConfigError(experiment);
	if (configError) {
		throw new Error(configError);
	}
	const diagnostics = collectExperimentDiagnostics(experiment, policy, options);
	if (
		Object.keys(diagnostics).length > 0 &&
		experiment.acknowledgeDiagnostics !== true
	) {
		throw new Error(describeRejectedArms(experiment, policy, diagnostics));
	}
	return diagnostics;
};
