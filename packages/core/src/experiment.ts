/**
 * Banner-experiment internals: arm validation, the controller and the
 * stored arm. The runtime loads these on its own when the `experiment`
 * option is set, so most sites never import this entry. Import it to check
 * arms in a test or to drive an experiment from a custom adapter.
 *
 * @packageDocumentation
 */
import { createExperimentControllerWith } from './libs/experiment-assignment';
import type {
	ExperimentController,
	ExperimentControllerOptions,
} from './libs/experiment-assignment';
import { writeStoredExperimentArm } from './libs/experiment-storage';

export {
	collectExperimentDiagnostics,
	validateExperiment,
} from './libs/experiment-engine';
export type {
	ExperimentDiagnostics,
	ValidateExperimentOptions,
} from './libs/experiment-engine';
/**
 * Check the kernel's arm against each policy and remember a c15t-picked arm
 * under the experiment storage key once the banner has shown it.
 *
 * @param options - Experiment, kernel, host presentation and reporting.
 * @returns The controller.
 */
export const createExperimentController = function createExperimentController(
	options: ExperimentControllerOptions
): ExperimentController {
	return createExperimentControllerWith(options, writeStoredExperimentArm);
};
export type {
	ExperimentController,
	ExperimentControllerOptions,
} from './libs/experiment-assignment';
export {
	readStoredExperimentArm,
	writeStoredExperimentArm,
} from './libs/experiment-storage';
export type { StoredExperimentArm } from './libs/experiment-storage';
export { experimentConfigError, pickExperimentArm } from './libs/experiment';
