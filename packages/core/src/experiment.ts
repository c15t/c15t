/**
 * Banner-experiment internals: arm validation, the controller and the
 * stored arm. The runtime loads these on its own when the `experiment`
 * option is set, so most sites never import this entry. Import it to check
 * arms in a test or to drive an experiment from a custom adapter.
 *
 * @packageDocumentation
 */
export {
	collectExperimentDiagnostics,
	validateExperiment,
} from './libs/experiment-engine';
export type {
	ExperimentDiagnostics,
	ValidateExperimentOptions,
} from './libs/experiment-engine';
export { createExperimentController } from './libs/experiment-assignment';
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
