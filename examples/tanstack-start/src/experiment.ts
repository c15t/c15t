import type { ConsentExperiment, ExperimentReporter } from 'c15t';

/** The arms of the demo's banner-shape experiment. */
export type ExperimentArm = 'floating' | 'wall';

/** What the root loader resolved for the banner experiment. */
export interface ExperimentSearch {
	/** `?experiment=1` */
	enabled: boolean;
	/** `&arm=wall`, the arm a flag provider would resolve. */
	arm?: ExperimentArm;
}

/**
 * Read the experiment switch from the request URL. This runs in the root
 * loader, on the server for the first render, so the arm is known before
 * anything renders, the same as a server-resolved feature flag.
 */
export const experimentSearch = function experimentSearch(
	search: string
): ExperimentSearch {
	const params = new URLSearchParams(search);
	if (params.get('experiment') !== '1') {
		return { enabled: false };
	}
	const arm = params.get('arm');
	return arm === 'wall' || arm === 'floating'
		? { arm, enabled: true }
		: { enabled: true };
};

/**
 * The banner-shape experiment. Events go to `window.dataLayer` and to
 * `report`, which the page renders.
 */
export const bannerExperiment = function bannerExperiment(
	variant: ExperimentArm | undefined,
	report: ExperimentReporter
): ConsentExperiment {
	return {
		id: 'banner-shape',
		reportTo: ['dataLayer', report],
		// From your flag provider. Omit it for built-in assignment.
		variant,
		variants: {
			floating: {},
			wall: { prompt: { variant: 'wall' } },
		},
	};
};
