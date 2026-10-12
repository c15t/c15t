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

/** What `src/experiment-root.tsx` hands the page for its readout. */
export interface ExperimentReadoutState {
	/** Whether this request runs the experiment (`?experiment=1`). */
	running: boolean;
	/** Impressions and choices made under the arm so far. */
	events: readonly ExperimentLogEntry[];
}

/**
 * The experiment readout, or `null` when the default root is mounted. Only
 * `src/experiment-root.tsx`, selected by `C15T_EXPERIMENT=1`, provides it.
 */
export const ExperimentReadoutContext =
	createContext<ExperimentReadoutState | null>(null);

/** The experiment readout, or `null` without the experiment root. */
export const useExperimentReadout =
	function useExperimentReadout(): ExperimentReadoutState | null {
		return useContext(ExperimentReadoutContext);
	};

const pushToDataLayer = function pushToDataLayer(
	event: Record<string, unknown>
): void {
	const page = window as Window & { dataLayer?: unknown[] };
	page.dataLayer ??= [];
	page.dataLayer.push(event);
};

/**
 * Provider callbacks that log each impression and choice made under an
 * arm during one experiment run, and push them to `window.dataLayer` for
 * GTM. `run` names the run (arm and switch); when it changes the list
 * starts over, so a client navigation to another arm never shows the
 * previous arm's events.
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
				if (!experiment) {
					return;
				}
				pushToDataLayer({
					arm: experiment.arm,
					consent_action: consentAction,
					event: 'c15t_choice_recorded',
					experiment_id: experiment.id,
				});
				append({
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
				append({
					arm: experiment.arm,
					detail: surface,
					name: 'c15t_surface_shown',
				});
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
 * The banner-shape experiment. `control` is the default banner; `wall`
 * blocks the page until the visitor chooses.
 */
export const bannerExperiment: ConsentExperiment<'wall'> = {
	arms: { wall: { prompt: { variant: 'wall' } } },
	id: 'banner-shape',
};
