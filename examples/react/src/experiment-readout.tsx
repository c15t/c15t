import type { ExperimentReportEvent, ExperimentReporter } from 'c15t';
import { useExperiment } from 'c15t/react';
import { useCallback, useState } from 'react';

/** Collects the events the experiment reports so the page can list them. */
export const useExperimentLog = function useExperimentLog() {
	const [events, setEvents] = useState<ExperimentReportEvent[]>([]);
	const report = useCallback<ExperimentReporter>((event) => {
		setEvents((previous) => [...previous, event]);
	}, []);
	return { events, report };
};

/** The assigned arm and the events reported so far. */
export const ExperimentReadout = ({
	events,
}: {
	events: readonly ExperimentReportEvent[];
}) => {
	const assignment = useExperiment();
	return (
		<section
			className="card"
			data-testid="experiment"
		>
			<h2>Banner experiment</h2>
			<p>
				Arm:{' '}
				<code data-testid="experiment-arm">
					{assignment
						? `${assignment.id} · ${assignment.variant} · ${assignment.assignedBy}`
						: 'assigning…'}
				</code>
			</p>
			<ul className="statuses">
				{events.map((event, index) => (
					<li
						// oxlint-disable-next-line react/no-array-index-key -- append-only log
						key={index}
					>
						<code>{event.name}</code> · {event.variant} · {event.surface}
						{event.name === 'c15t_choice_recorded'
							? ` · ${event.consentAction}`
							: ''}
						{event.name !== 'c15t_surface_shown' &&
						event.timeToDecisionMs !== undefined
							? ` · ${event.timeToDecisionMs} ms`
							: ''}
					</li>
				))}
			</ul>
			<p>
				The same events are pushed to <code>window.dataLayer</code>.
			</p>
		</section>
	);
};
