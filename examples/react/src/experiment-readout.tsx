import type { OnChoiceRecordedPayload, OnSurfaceShownPayload } from 'c15t';
import { useExperiment } from 'c15t/react';
import { useMemo, useState } from 'react';

/** One experiment event the page lists. */
export interface ExperimentLogEntry {
	name: 'c15t_surface_shown' | 'c15t_choice_recorded';
	arm: string;
	/** The surface shown, or the consent action recorded. */
	detail: string;
}

const pushToDataLayer = function pushToDataLayer(
	event: Record<string, unknown>
): void {
	const page = window as Window & { dataLayer?: unknown[] };
	page.dataLayer ??= [];
	page.dataLayer.push(event);
};

/**
 * Provider callbacks that log each impression and choice made under an
 * experiment arm, and push them to `window.dataLayer` for GTM.
 */
export const useExperimentLog = function useExperimentLog() {
	const [events, setEvents] = useState<ExperimentLogEntry[]>([]);
	const callbacks = useMemo(
		() => ({
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
				setEvents((previous) => [
					...previous,
					{
						arm: experiment.arm,
						detail: consentAction,
						name: 'c15t_choice_recorded',
					},
				]);
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
				setEvents((previous) => [
					...previous,
					{ arm: experiment.arm, detail: surface, name: 'c15t_surface_shown' },
				]);
			},
		}),
		[]
	);
	return { callbacks, events };
};

/** The assigned arm and the events logged so far. */
export const ExperimentReadout = ({
	events,
}: {
	events: readonly ExperimentLogEntry[];
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
						? `${assignment.id} · ${assignment.arm} · ${assignment.assignedBy}`
						: 'assigning…'}
				</code>
			</p>
			<ul className="statuses">
				{events.map((event, index) => (
					<li
						// oxlint-disable-next-line react/no-array-index-key -- append-only log
						key={index}
					>
						<code>{event.name}</code> · {event.arm} · {event.detail}
					</li>
				))}
			</ul>
			<p>
				The same events are pushed to <code>window.dataLayer</code>.
			</p>
		</section>
	);
};
