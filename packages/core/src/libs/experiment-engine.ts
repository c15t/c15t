/**
 * The part of a banner experiment that only runs once one is configured:
 * checking every arm against the presentation rules of a policy.
 *
 * Kept out of the root entry so a site without an experiment never ships
 * them. The runtime loads this module, through
 * {@link ./experiment-assignment}, when the `experiment` option is set.
 */
import type { ResolvedPolicyRule } from '@c15t/schema/types';

import {
	actionAppearanceFromTheme,
	experimentConfigError,
	resolveExperimentPresentation,
	resolveExperimentTheme,
} from './experiment';
import type {
	ActionAppearance,
	ConsentExperiment,
	ExperimentArmTheme,
} from './experiment';
import { resolveConsentPresentation } from './policy-actions';
import type {
	ConsentPresentation,
	PresentationDiagnostic,
} from './policy-actions';

/** Diagnostics per arm name; only arms with at least one diagnostic appear. */
export type ExperimentDiagnostics = Record<string, PresentationDiagnostic[]>;

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
		for (const name of Object.keys(experiment.arms)) {
			const presentation = resolveExperimentPresentation(
				options.presentation,
				experiment,
				{ arm: name }
			);
			const actionAppearance = (
				experiment.arms as Record<string, { theme?: unknown }>
			)[name]?.theme
				? actionAppearanceFromTheme(
						resolveExperimentTheme(options.theme, experiment, {
							arm: name,
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

const label = function label(experiment: ConsentExperiment): string {
	return `c15t experiment "${experiment.id}"`;
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
