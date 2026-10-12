import { defineExperiment } from 'c15t';
import type { OnChoiceRecordedPayload, OnSurfaceShownPayload } from 'c15t';

/**
 * The banner-shape experiment. `control` is the default banner; the `wall`
 * arm blocks the page until the visitor chooses.
 */
export const bannerExperiment = defineExperiment({
	arms: { wall: { prompt: { variant: 'wall' } } },
	id: 'banner-shape',
});

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
