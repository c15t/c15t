/**
 * Banner-experiment internals: bucketing, arm validation and the stored
 * arm. The runtime loads these on its own when the `experiment` option is
 * set, so most sites never import this entry. Import it to check arms in a
 * test or to drive assignment from a custom adapter.
 *
 * @packageDocumentation
 */
export {
	assignExperimentVariant,
	collectExperimentDiagnostics,
	experimentConfigError,
	validateExperiment,
} from './libs/experiment-engine';
export type {
	ExperimentDiagnostics,
	ValidateExperimentOptions,
} from './libs/experiment-engine';
export {
	createExperimentController,
	readStoredExperimentAssignment,
	resolveExperimentAssignment,
	writeStoredExperimentAssignment,
} from './libs/experiment-assignment';
export type {
	ExperimentController,
	ExperimentControllerOptions,
	ResolveExperimentAssignmentInput,
	StoredExperimentAssignment,
} from './libs/experiment-assignment';
