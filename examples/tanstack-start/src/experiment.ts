import type {
	ConsentExperiment,
	ExperimentReportEvent,
	ExperimentReporter,
} from 'c15t';
import { createContext, useCallback, useContext, useState } from 'react';

/**
 * Events the banner experiment reported, for the page's readout. The root
 * route provides `null` while no experiment runs; `undefined` means no
 * provider is mounted.
 */
export const ExperimentEventsContext = createContext<
	readonly ExperimentReportEvent[] | null | undefined
>(undefined);

/**
 * The events the experiment reported so far, or `null` when no experiment
 * runs.
 *
 * @throws {Error} When rendered outside the root route's provider.
 */
export const useExperimentEvents = function useExperimentEvents():
	| readonly ExperimentReportEvent[]
	| null {
	const events = useContext(ExperimentEventsContext);
	if (events === undefined) {
		throw new Error(
			'useExperimentEvents must be rendered inside the root route.'
		);
	}
	return events;
};

/**
 * Collects the events one experiment run reports. `run` names the run
 * (arm and switch); when it changes the list starts over, so a client
 * navigation to another arm never shows the previous arm's events.
 */
export const useExperimentLog = function useExperimentLog(run: string): {
	events: readonly ExperimentReportEvent[];
	report: ExperimentReporter;
} {
	const [log, setLog] = useState<{
		events: ExperimentReportEvent[];
		run: string;
	}>({ events: [], run });
	const report = useCallback<ExperimentReporter>(
		(event) => {
			setLog((previous) => ({
				events: previous.run === run ? [...previous.events, event] : [event],
				run,
			}));
		},
		[run]
	);
	return { events: log.run === run ? log.events : [], report };
};

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
