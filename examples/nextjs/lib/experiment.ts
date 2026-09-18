import type { ConsentExperiment, ExperimentReporter } from 'c15t';

/** The arms of the demo's banner-shape experiment. */
export const EXPERIMENT_ARMS = ['floating', 'wall'] as const;

export type ExperimentArm = (typeof EXPERIMENT_ARMS)[number];

export const isExperimentArm = function isExperimentArm(
	value: string | null | undefined
): value is ExperimentArm {
	return (EXPERIMENT_ARMS as readonly string[]).includes(value ?? '');
};

/**
 * The banner-shape experiment. `variant` is the arm the server resolved,
 * as a flag provider would; omit it and c15t assigns one. Events go to
 * `window.dataLayer` and to `report`, which the page renders.
 */
export const bannerExperiment = function bannerExperiment(
	variant: ExperimentArm | undefined,
	report: ExperimentReporter
): ConsentExperiment {
	return {
		id: 'banner-shape',
		reportTo: ['dataLayer', report],
		variant,
		variants: {
			floating: {},
			wall: { prompt: { variant: 'wall' } },
		},
	};
};
