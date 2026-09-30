import { lazy, Suspense, useEffect, useSyncExternalStore } from 'react';

import { VideoEmbed } from '../components/video-embed';

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
			<h2>Watch the video</h2>
			<VideoEmbed />
		</main>
	);
};
