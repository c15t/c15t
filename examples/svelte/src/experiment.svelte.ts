import type {
	ConsentExperiment,
	OnChoiceRecordedPayload,
	OnSurfaceShownPayload,
} from 'c15t';

/** One experiment event the page lists. */
export interface ExperimentLogEntry {
	name: 'c15t_surface_shown' | 'c15t_choice_recorded';
	arm: string;
	/** The surface shown, or the consent action recorded. */
	detail: string;
}

/** Impressions and choices made under the arm so far; the page lists them. */
export const experimentEvents = $state<ExperimentLogEntry[]>([]);

/** Provider callbacks that log each impression and choice made under an arm. */
export const experimentCallbacks = {
	onChoiceRecorded: ({
		consentAction,
		experiment,
	}: OnChoiceRecordedPayload) => {
		if (experiment) {
			experimentEvents.push({
				arm: experiment.arm,
				detail: consentAction,
				name: 'c15t_choice_recorded',
			});
		}
	},
	onSurfaceShown: ({ experiment, surface }: OnSurfaceShownPayload) => {
		if (experiment) {
			experimentEvents.push({
				arm: experiment.arm,
				detail: surface,
				name: 'c15t_surface_shown',
			});
		}
	},
};

/**
 * The banner-shape experiment, or `undefined` when the URL did not ask for
 * one. `control` is the default banner; `wall` blocks the page until the
 * visitor chooses. `?experiment=1` lets c15t pick the arm; `&arm=wall` sets
 * it the way a flag provider would.
 */
export const experimentFromSearch = function experimentFromSearch(
	search: string
): ConsentExperiment | undefined {
	const params = new URLSearchParams(search);
	if (params.get('experiment') !== '1') {
		return undefined;
	}
	const experiment: ConsentExperiment<'wall'> = {
		arms: { wall: { prompt: { variant: 'wall' } } },
		id: 'banner-shape',
	};
	const arm = params.get('arm');
	if (arm === null) {
		return experiment;
	}
	// From your flag provider. Omit it to let c15t pick.
	return { ...experiment, arm: arm === 'wall' ? 'wall' : 'control' };
};
