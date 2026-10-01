import { useExperiment } from 'c15t/tanstack-start';
import { lazy, Suspense, useEffect, useSyncExternalStore } from 'react';

import { VideoEmbed } from '../components/video-embed';
import { useExperimentReadout } from '../experiment';

const subscribe = () => () => {
	/* Hydration state has no external events. */
};
const DevTools = import.meta.env.DEV
	? lazy(async () => {
			const module = await import('c15t/react/devtools');
			return { default: module.DevTools };
		})
	: null;

/**
 * Links to each experiment run, the assigned arm and the experiment events
 * logged so far. Renders nothing unless `C15T_EXPERIMENT=1` selected the
 * experiment root.
 */
const ExperimentReadout = () => {
	const readout = useExperimentReadout();
	const assignment = useExperiment();
	if (!readout) {
		return null;
	}
	return (
		<>
			{/* Plain links: the root loader resolves the arm per document load. */}
			<nav aria-label="Banner experiment">
				<a href="/consent-example">Default</a>{' '}
				<a href="/consent-example?experiment=1">Experiment</a>{' '}
				<a href="/consent-example?experiment=1&arm=wall">
					Experiment (wall arm)
				</a>
			</nav>
			{readout.running && (
				<section data-testid="experiment">
					<h2>Banner experiment</h2>
					<p>
						Arm:{' '}
						<code data-testid="experiment-arm">
							{assignment
								? `${assignment.id} · ${assignment.arm} · ${assignment.assignedBy}`
								: 'assigning…'}
						</code>
					</p>
					<ul>
						{readout.events.map((event, index) => (
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
			)}
		</>
	);
};

/**
 * Demo page shared by every rendering variant: a gated video, theme
 * buttons and DevTools in development. The consent setup lives in the root
 * route.
 */
export const ConsentExample = () => {
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
			<ExperimentReadout />
			<h2>Watch the video</h2>
			<VideoEmbed />
		</main>
	);
};
