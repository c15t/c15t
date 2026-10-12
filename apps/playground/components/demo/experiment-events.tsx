'use client';

import type { OnChoiceRecordedPayload, OnSurfaceShownPayload } from 'c15t';
import { useExperiment } from 'c15t/react';
import { useMemo, useState } from 'react';

import { Badge } from '../ui/badge';

/** One experiment event the readout lists. */
export interface ExperimentLogEntry {
	name: 'c15t_surface_shown' | 'c15t_choice_recorded';
	arm: string;
	/** The surface shown, or the consent action recorded. */
	detail: string;
}

/**
 * Provider callbacks that log each impression and choice made under an
 * arm during one experiment run. `run` names the run (arm and switch);
 * when it changes the list starts over, so the readout never shows events
 * from a previous assignment.
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

/** Lists the impressions and choices made under the assigned arm so far. */
export const ExperimentEvents = ({
	events,
}: {
	events: readonly ExperimentLogEntry[];
}) => {
	const assignment = useExperiment();
	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-center gap-2">
				<p className="label-pixel text-muted-foreground">Experiment events</p>
				{assignment ? (
					<Badge variant="outline">
						{assignment.id} · {assignment.arm} · {assignment.assignedBy}
					</Badge>
				) : (
					<Badge variant="outline">assigning…</Badge>
				)}
			</div>
			{events.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					Nothing logged yet. The banner impression lands once the runtime is
					live; a choice follows when you act on it.
				</p>
			) : (
				<ol className="space-y-2">
					{events.map((event, index) => (
						<li
							// oxlint-disable-next-line react/no-array-index-key -- append-only log
							key={index}
							className="border-border/70 rounded-md border p-2 font-mono text-xs"
						>
							<span className="font-medium">{event.name}</span>{' '}
							<span className="text-muted-foreground">
								{event.arm} · {event.detail}
							</span>
						</li>
					))}
				</ol>
			)}
			<p className="text-muted-foreground text-xs">
				Add <code>&amp;arm=bar</code> or <code>&amp;arm=control</code> to set
				the arm as a flag provider would.
			</p>
		</div>
	);
};
