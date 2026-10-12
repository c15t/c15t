import { defineExperiment } from 'c15t';
import type { ConsentProviderCallbacks } from 'c15t/next';

/** `control` is the default banner; the `wall` arm blocks the page. */
export const bannerExperiment = defineExperiment({
	arms: { wall: { prompt: { variant: 'wall' } } },
	id: 'banner-shape',
});

const pushToDataLayer = (event: Record<string, unknown>) => {
	const page = window as Window & { dataLayer?: unknown[] };
	page.dataLayer ??= [];
	page.dataLayer.push(event);
};

export const experimentCallbacks = {
	onChoiceRecorded: ({ consentAction, experiment }) => {
		if (experiment) {
			pushToDataLayer({
				arm: experiment.arm,
				consent_action: consentAction,
				event: 'c15t_choice_recorded',
				experiment_id: experiment.id,
			});
		}
	},
	onSurfaceShown: ({ experiment, surface }) => {
		if (experiment) {
			pushToDataLayer({
				arm: experiment.arm,
				event: 'c15t_surface_shown',
				experiment_id: experiment.id,
				surface,
			});
		}
	},
} satisfies ConsentProviderCallbacks;
