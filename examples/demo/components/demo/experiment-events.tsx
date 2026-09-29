'use client';

import type { ExperimentReportEvent, ExperimentReporter } from 'c15t';
import { useExperiment } from 'c15t/react';
import { useCallback, useState } from 'react';

import { Badge } from '../ui/badge';

/**
 * Collects the events one experiment run reports. `run` names the run
 * (arm and switch); when it changes the list starts over, so the readout
 * never shows events from a previous assignment.
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

/**
 * Lists the events the banner-shape experiment reported so far. The same
 * events go to `window.dataLayer`; this is the in-page copy.
 */
export const ExperimentEvents = ({
	events,
}: {
	events: readonly ExperimentReportEvent[];
}) => {
	const assignment = useExperiment();
	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-center gap-2">
				<p className="label-pixel text-muted-foreground">Experiment events</p>
				{assignment ? (
					<Badge variant="outline">
						{assignment.id} · {assignment.variant} · {assignment.assignedBy}
					</Badge>
				) : (
					<Badge variant="outline">assigning…</Badge>
				)}
			</div>
			{events.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					Nothing reported yet. The banner impression lands once the runtime is
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
								{event.variant} · {event.surface}
								{event.name === 'c15t_choice_recorded'
									? ` · ${event.consentAction}`
									: ''}
								{event.name !== 'c15t_surface_shown' &&
								event.timeToDecisionMs !== undefined
									? ` · ${event.timeToDecisionMs} ms`
									: ''}
							</span>
						</li>
					))}
				</ol>
			)}
			<p className="text-muted-foreground text-xs">
				Also pushed to <code>window.dataLayer</code>. Add{' '}
				<code>&amp;arm=bar</code> to force the arm as a flag provider would.
			</p>
		</div>
	);
};
