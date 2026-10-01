import { useExperiment } from 'c15t/react';
import { useSyncExternalStore } from 'react';

/** One experiment event `experiment-consent.tsx` pushed to the data layer. */
interface ExperimentEvent {
	event: 'c15t_surface_shown' | 'c15t_choice_recorded';
	arm: string;
	surface?: string;
	consent_action?: string;
}

const listeners = new Set<() => void>();
let events: readonly ExperimentEvent[] = [];

const isExperimentEvent = (item: unknown): item is ExperimentEvent =>
	typeof item === 'object' &&
	item !== null &&
	'event' in item &&
	(item.event === 'c15t_surface_shown' ||
		item.event === 'c15t_choice_recorded');

/**
 * Watches `window.dataLayer` the way a tag manager does, so the page can list
 * the events the provider callbacks push.
 */
const watchDataLayer = () => {
	const page = window as Window & { dataLayer?: unknown[] };
	page.dataLayer ??= [];
	const layer = page.dataLayer;
	const push = layer.push.bind(layer);
	const read = () => {
		events = layer.filter(isExperimentEvent);
		for (const listener of listeners) {
			listener();
		}
	};
	layer.push = (...items: unknown[]) => {
		const length = push(...items);
		read();
		return length;
	};
	read();
};
watchDataLayer();

const subscribe = (listener: () => void) => {
	listeners.add(listener);
	return () => listeners.delete(listener);
};

/** The assigned arm and the experiment events pushed so far. */
export const ExperimentReadout = () => {
	const assignment = useExperiment();
	const logged = useSyncExternalStore(subscribe, () => events);
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
						: 'not assigned'}
				</code>
			</p>
			<ul className="statuses">
				{logged.map((event, index) => (
					<li
						// oxlint-disable-next-line react/no-array-index-key -- append-only log
						key={index}
					>
						<code>{event.event}</code> · {event.arm} ·{' '}
						{event.surface ?? event.consent_action}
					</li>
				))}
			</ul>
			<p>
				These are the events the provider pushed to{' '}
				<code>window.dataLayer</code>.
			</p>
		</section>
	);
};
