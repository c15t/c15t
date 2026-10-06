/**
 * Validation and storage for one experiment in one browser.
 *
 * Loaded on demand by {@link startExperiment}, so a site without an
 * experiment never ships it. Storing the arm is passed in rather than
 * imported, so this chunk imports nothing the first load has. The controller hands the kernel a gate that
 * checks the arm against each policy, which releases the held prompt, and
 * remembers a c15t-picked arm under {@link EXPERIMENT_STORAGE_KEY} once the
 * banner has shown it. Nothing is written for a visitor who is never
 * prompted, and nothing is written for a host arm: the host decides that
 * one again on every visit.
 */
import type { ConsentSnapshot } from '../types';
import type {
	ExperimentAssignment,
	ExperimentGate,
	StartExperimentOptions,
} from './experiment';
import {
	collectExperimentDiagnostics,
	describeRejectedArms,
} from './experiment-engine';
import type { ExperimentDiagnostics } from './experiment-engine';
import type { writeStoredExperimentArm } from './experiment-storage';

/** Options of {@link createExperimentController}. */
export interface ExperimentControllerOptions extends StartExperimentOptions {
	/**
	 * Receives acknowledged diagnostics and rejections, once per policy.
	 * Defaults to `console.warn` / `console.error`.
	 */
	report?: {
		warn?: (message: string, diagnostics: ExperimentDiagnostics) => void;
		error?: (error: Error) => void;
	};
}

/** Owns one experiment's validation, assignment and storage for one kernel. */
export interface ExperimentController {
	/** The arm this browser runs, or `null` when none is set. */
	assignment: ExperimentAssignment | null;
	/** Stop watching impressions. The arm stays on the kernel. */
	dispose: () => void;
}

/**
 * What identifies a policy for validation: the rule id and the choice
 * fingerprint, which covers the model, prompt and required actions the
 * presentation diagnostics depend on.
 */
const policyKey = function policyKey(snapshot: ConsentSnapshot): string {
	return `${snapshot.policyRule.id}\n${snapshot.evaluationPolicy.choice.fingerprint}`;
};

/**
 * Check the kernel's arm against each policy and remember a c15t-picked arm.
 *
 * Nothing here throws into the page. An arm a policy rejects is not shown
 * under that policy: the gate answers per policy, once, and the visitor
 * sees `control` and is left out of the experiment's records. Setting the
 * gate releases the held prompt. The arm is stored the first time the
 * banner shows it, and only when c15t picked it.
 *
 * @param options - Experiment, kernel, host presentation and reporting.
 * @param rememberArm - Stores the arm: `writeStoredExperimentArm`.
 * @returns The controller.
 * @internal
 */
export const createExperimentControllerWith =
	function createExperimentControllerWith(
		options: ExperimentControllerOptions,
		rememberArm: typeof writeStoredExperimentArm
	): ExperimentController {
		const { experiment, kernel } = options;
		const warn =
			options.report?.warn ??
			((message: string, diagnostics: ExperimentDiagnostics) => {
				console.warn(message, diagnostics);
			});
		const error =
			options.report?.error ??
			((failure: Error) => {
				console.error(failure);
			});

		/** Whether each policy seen so far accepts the experiment. */
		const acceptedByPolicy = new Map<string, boolean>();
		const gate: ExperimentGate = (snapshot) => {
			const key = policyKey(snapshot);
			const known = acceptedByPolicy.get(key);
			if (known !== undefined) {
				return known;
			}
			const { policyRule } = snapshot;
			const diagnostics = collectExperimentDiagnostics(
				experiment,
				policyRule,
				options
			);
			let accepted = true;
			if (Object.keys(diagnostics).length > 0) {
				if (experiment.acknowledgeDiagnostics === true) {
					warn(
						`c15t experiment "${experiment.id}": running with acknowledged presentation diagnostics under policy "${policyRule.id}".`,
						diagnostics
					);
				} else {
					accepted = false;
					error(
						new Error(
							`${describeRejectedArms(experiment, policyRule, diagnostics)}\nVisitors under this policy see the base presentation and are not counted.`
						)
					);
				}
			}
			acceptedByPolicy.set(key, accepted);
			return accepted;
		};

		// The arm is already on the kernel: seeded from the host or a prefetch,
		// or picked by `startExperiment` before `/init`.
		const assignment: ExperimentAssignment | null =
			kernel.getSnapshot().experiment;
		if (!assignment) {
			kernel.set.experiment(null);
			return { assignment: null, dispose: () => undefined };
		}

		// Remember the arm once the banner has rendered it, so the visitor keeps
		// seeing the banner they saw. A host arm is the host's to repeat.
		let stored = false;
		const unsubscribe =
			assignment.assignedBy === 'c15t'
				? kernel.events.on('surface:shown', (event) => {
						if (stored || event.surface !== 'banner' || !event.experiment) {
							return;
						}
						stored = true;
						rememberArm(
							{ arm: event.experiment.arm, id: event.experiment.id },
							options.storageConfig
						);
					})
				: () => undefined;

		// After the listener: releasing a held prompt shows the banner in this
		// very commit, and that impression is the one to remember.
		kernel.set.experiment(assignment, gate);

		return { assignment, dispose: unsubscribe };
	};
