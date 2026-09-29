import type {
	ConsentExperiment,
	OnChoiceRecordedPayload,
	OnSurfaceShownPayload,
} from 'c15t';

/** The arms of the demo's banner-shape experiment. `control` is the default banner. */
export const EXPERIMENT_ARMS = ['control', 'wall'] as const;

export type ExperimentArm = (typeof EXPERIMENT_ARMS)[number];

/** The arm for a requested `?arm=` value: `wall`, or `control` for anything else. */
export const toExperimentArm = function toExperimentArm(
	value: string
): ExperimentArm {
	return value === 'wall' ? 'wall' : 'control';
};

/**
 * The banner-shape experiment. `arm` is the arm the server resolved, as a
 * flag provider would; omit it and c15t picks one.
 */
export const bannerExperiment = function bannerExperiment(
	arm: ExperimentArm | undefined
): ConsentExperiment {
	const experiment: ConsentExperiment<'wall'> = {
		arms: { wall: { prompt: { variant: 'wall' } } },
		id: 'banner-shape',
	};
	return arm === undefined ? experiment : { ...experiment, arm };
};

/** One experiment event the page lists. */
export interface ExperimentLogEntry {
	name: 'c15t_surface_shown' | 'c15t_choice_recorded';
	arm: string;
	/** The surface shown, or the consent action recorded. */
	detail: string;
}

const pushToDataLayer = function pushToDataLayer(
	event: Record<string, unknown>
): void {
	const page = window as Window & { dataLayer?: unknown[] };
	page.dataLayer ??= [];
	page.dataLayer.push(event);
};

/**
 * Provider callbacks that pass each impression and choice made under an
 * experiment arm to `log` and push them to `window.dataLayer` for GTM.
 */
export const experimentCallbacks = function experimentCallbacks(
	log: (entry: ExperimentLogEntry) => void
) {
	return {
		onChoiceRecorded: ({
			consentAction,
			experiment,
		}: OnChoiceRecordedPayload) => {
			if (!experiment) {
				return;
			}
			pushToDataLayer({
				arm: experiment.arm,
				consent_action: consentAction,
				event: 'c15t_choice_recorded',
				experiment_id: experiment.id,
			});
			log({
				arm: experiment.arm,
				detail: consentAction,
				name: 'c15t_choice_recorded',
			});
		},
		onSurfaceShown: ({ experiment, surface }: OnSurfaceShownPayload) => {
			if (!experiment) {
				return;
			}
			pushToDataLayer({
				arm: experiment.arm,
				event: 'c15t_surface_shown',
				experiment_id: experiment.id,
				surface,
			});
			log({ arm: experiment.arm, detail: surface, name: 'c15t_surface_shown' });
		},
	};
};
