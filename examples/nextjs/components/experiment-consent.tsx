'use client';

import {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogLink,
	ConsentRoot,
	useExperiment,
} from 'c15t/next';
import type { ConsentRootProps } from 'c15t/next';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { consentConfig } from '@/c15t.config';
import { experimentCallbacks } from '@/lib/experiment';
import type { ExperimentLogEntry } from '@/lib/experiment';
import { scripts } from '@/lib/scripts';

/** The assigned arm and the experiment events logged so far. */
const ExperimentReadout = ({
	events,
}: {
	events: readonly ExperimentLogEntry[];
}) => {
	const assignment = useExperiment();
	return (
		<aside
			className="experiment-readout"
			data-testid="experiment"
		>
			<p>
				Experiment arm:{' '}
				<code data-testid="experiment-arm">
					{assignment
						? `${assignment.id} · ${assignment.arm} · ${assignment.assignedBy}`
						: 'not in the experiment'}
				</code>
			</p>
			<ul>
				{events.map((event, index) => (
					<li
						// oxlint-disable-next-line react/no-array-index-key -- append-only log
						key={index}
					>
						<code>{event.name}</code> · {event.arm} · {event.detail}
					</li>
				))}
			</ul>
			<p className="caption">
				The same events are pushed to <code>window.dataLayer</code>.
			</p>
		</aside>
	);
};

/**
 * The `Consent` wrapper from `components/consent.tsx` with experiment
 * callbacks added, for the `/experiment` route only. The arm arrives in
 * `state` from `resolveConsent`, so this needs no `experiment` option.
 */
export const ExperimentConsent = ({
	children,
	state,
}: {
	children: ReactNode;
	state: ConsentRootProps['state'];
}) => {
	const [events, setEvents] = useState<ExperimentLogEntry[]>([]);
	const callbacks = useMemo(
		() =>
			experimentCallbacks((entry) => {
				setEvents((previous) => [...previous, entry]);
			}),
		[]
	);

	return (
		<ConsentRoot
			state={state}
			config={consentConfig}
			scripts={scripts}
			options={{ callbacks }}
		>
			{children}
			<ExperimentReadout events={events} />
			<ConsentBanner />
			<ConsentDialog />
			<footer>
				<ConsentDialogLink>Privacy settings</ConsentDialogLink>
			</footer>
		</ConsentRoot>
	);
};
