import type {
	ConsentExperiment,
	ExperimentReportEvent,
	ExperimentReporter,
} from 'c15t';

/** The events the experiment reported so far; the page lists them. */
export const experimentEvents = $state<ExperimentReportEvent[]>([]);

const report: ExperimentReporter = (event) => {
	experimentEvents.push(event);
};

/**
 * The banner-shape experiment, or `undefined` when the URL did not ask for
 * one. `?experiment=1` lets c15t assign the arm; `&arm=wall` forces it the
 * way a flag provider would. Events go to `window.dataLayer` and to the
 * in-page log.
 */
export const experimentFromSearch = function experimentFromSearch(
	search: string
): ConsentExperiment | undefined {
	const params = new URLSearchParams(search);
	if (params.get('experiment') !== '1') {
		return undefined;
	}
	const arm = params.get('arm');
	return {
		id: 'banner-shape',
		reportTo: ['dataLayer', report],
		// From your flag provider. Omit it for built-in assignment.
		variant: arm === 'wall' || arm === 'floating' ? arm : undefined,
		variants: {
			floating: {},
			wall: { prompt: { variant: 'wall' } },
		},
	};
};
