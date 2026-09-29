import type {
	ConsentExperiment,
	OnChoiceRecordedPayload,
	OnSurfaceShownPayload,
} from 'c15t';
import { createContext, useContext, useMemo, useState } from 'react';

/** One experiment event the page lists. */
export interface ExperimentLogEntry {
	name: 'c15t_surface_shown' | 'c15t_choice_recorded';
	arm: string;
	/** The surface shown, or the consent action recorded. */
	detail: string;
}

/**
 * Impressions and choices made under the experiment arm, for the page's
 * readout. The root route provides `null` while no experiment runs;
 * `undefined` means no provider is mounted.
 */
export const ExperimentEventsContext = createContext<
	readonly ExperimentLogEntry[] | null | undefined
>(undefined);

/**
 * The experiment events logged so far, or `null` when no experiment runs.
 *
 * @throws {Error} When rendered outside the root route's provider.
 */
export const useExperimentEvents = function useExperimentEvents():
	| readonly ExperimentLogEntry[]
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
 * Provider callbacks that log each impression and choice made under an
 * arm during one experiment run. `run` names the run (arm and switch);
 * when it changes the list starts over, so a client navigation to another
 * arm never shows the previous arm's events.
 */
export const useExperimentLog = function useExperimentLog(run: string) {
	const [log, setLog] = useState<{
		events: ExperimentLogEntry[];
		run: string;
	}>({ events: [], run });
	const callbacks = useMemo(() => {
		const append = (entry: ExperimentLogEntry) => {
			setLog((previous) => ({
				events: previous.run === run ? [...previous.events, entry] : [entry],
				run,
			}));
		};
		return {
			onChoiceRecorded: ({
				consentAction,
				experiment,
			}: OnChoiceRecordedPayload) => {
				if (experiment) {
					append({
						arm: experiment.arm,
						detail: consentAction,
						name: 'c15t_choice_recorded',
					});
				}
			},
			onSurfaceShown: ({ experiment, surface }: OnSurfaceShownPayload) => {
				if (experiment) {
					append({
						arm: experiment.arm,
						detail: surface,
						name: 'c15t_surface_shown',
					});
				}
			},
		};
	}, [run]);
	return { callbacks, events: log.run === run ? log.events : [] };
};

/** The arms of the demo's banner-shape experiment. `control` is the default banner. */
export type ExperimentArm = 'control' | 'wall';

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
 * anything renders, the same as a server-resolved feature flag. `&arm=wall`
 * is `wall`, any other `arm` is `control`, and no `arm` lets c15t pick.
 */
export const experimentSearch = function experimentSearch(
	search: string
): ExperimentSearch {
	const params = new URLSearchParams(search);
	if (params.get('experiment') !== '1') {
		return { enabled: false };
	}
	const arm = params.get('arm');
	if (arm === null) {
		return { enabled: true };
	}
	return { arm: arm === 'wall' ? 'wall' : 'control', enabled: true };
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
