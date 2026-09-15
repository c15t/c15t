/* oxlint-disable react/iframe-missing-sandbox -- The cross-origin YouTube player requires scripts and its own origin. */
import { createFileRoute } from '@tanstack/react-router';
import { ConsentDialogLink, useConsent } from 'c15t/tanstack-start';
import { lazy, Suspense, useEffect, useSyncExternalStore } from 'react';

const subscribe = () => () => {
	/* Hydration state has no external events. */
};
const DevTools = import.meta.env.DEV
	? lazy(async () => {
			const module = await import('c15t/react/devtools');
			return { default: module.DevTools };
		})
	: null;

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
