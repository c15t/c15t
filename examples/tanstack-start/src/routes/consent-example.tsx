/* oxlint-disable react/iframe-missing-sandbox -- The cross-origin YouTube player requires scripts and its own origin. */
import { createFileRoute } from '@tanstack/react-router';
import {
	ConsentDialogLink,
	useConsent,
	useExperiment,
} from 'c15t/tanstack-start';
import {
	lazy,
	Suspense,
	useContext,
	useEffect,
	useSyncExternalStore,
} from 'react';

import { ExperimentEventsContext } from './__root';

const subscribe = () => () => {
	/* Hydration state has no external events. */
};
const DevTools = import.meta.env.DEV
	? lazy(async () => {
			const module = await import('c15t/react/devtools');
			return { default: module.DevTools };
		})
	: null;

/** The assigned arm and the events the experiment reported so far. */
const ExperimentReadout = () => {
	const events = useContext(ExperimentEventsContext);
	const assignment = useExperiment();
	if (!events) {
		return null;
	}
	return (
		<section data-testid="experiment">
			<h2>Banner experiment</h2>
			<p>
				Arm:{' '}
				<code data-testid="experiment-arm">
					{assignment
						? `${assignment.id} · ${assignment.variant} · ${assignment.assignedBy}`
						: 'assigning…'}
				</code>
			</p>
			<ul>
				{events.map((event, index) => (
					<li
						// oxlint-disable-next-line react/no-array-index-key -- append-only log
						key={index}
					>
						<code>{event.name}</code> · {event.variant} · {event.surface}
						{event.name === 'c15t_choice_recorded'
							? ` · ${event.consentAction}${
									event.timeToDecisionMs === undefined
										? ''
										: ` · ${event.timeToDecisionMs} ms`
								}`
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

const ConsentExample = () => {
	const allowed = useConsent('measurement');
	const mounted = useSyncExternalStore(
		subscribe,
		() => true,
		() => false
	);
	useEffect(
		() => () => {
			delete document.documentElement.dataset.consentExampleTheme;
		},
		[]
	);
	const setTheme = (theme: string) => {
		document.documentElement.dataset.consentExampleTheme = theme;
	};
	return (
		<main className="consent-example">
			<h1>Consent example</h1>
			{mounted && DevTools && (
				<Suspense fallback={null}>
					<DevTools />
				</Suspense>
			)}
			<p>
				PostHog waits for measurement permission. X Pixel waits for marketing
				permission.
			</p>
			<button
				type="button"
				onClick={() => setTheme('default')}
			>
				Default theme
			</button>
			<button
				type="button"
				onClick={() => setTheme('branded')}
			>
				Branded theme
			</button>
			<nav aria-label="Banner experiment">
				<a href="/consent-example">Default</a>{' '}
				<a href="/consent-example?experiment=1">Experiment</a>{' '}
				<a href="/consent-example?experiment=1&arm=wall">
					Experiment (wall arm)
				</a>
			</nav>
			<ExperimentReadout />
			<h2>Watch the video</h2>
			{allowed ? (
				<iframe
					src="https://www.youtube-nocookie.com/embed/czTksCF6X8Y"
					title="YouTube video"
					sandbox="allow-scripts allow-same-origin allow-presentation"
					allowFullScreen
				/>
			) : (
				<div>
					<p>
						Allow measurement to load this YouTube video. No video request is
						sent before permission.
					</p>
					<ConsentDialogLink>Open privacy settings</ConsentDialogLink>
				</div>
			)}
			<footer>
				<ConsentDialogLink>Privacy settings</ConsentDialogLink>
			</footer>
		</main>
	);
};
export const Route = createFileRoute('/consent-example')({
	component: ConsentExample,
});
