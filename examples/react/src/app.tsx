/**
 * Demo page for the example. Everything a reader copies lives in
 * `consent.tsx`, `main.tsx`, `scripts.ts` and `video-embed.tsx`; this file only shows the
 * consent state, a gated video and the design switch.
 */
import { useConsent } from 'c15t/react';
import { lazy, Suspense } from 'react';

import './style.css';
import { VideoEmbed } from './video-embed';

// DevTools loads in development builds only.
const DevTools = import.meta.env.DEV
	? lazy(async () => {
			const module = await import('c15t/react/devtools');
			return { default: module.DevTools };
		})
	: null;

// The branded design only changes CSS tokens; see `style.css`.
if (new URLSearchParams(location.search).get('design') === 'branded') {
	document.documentElement.dataset.design = 'branded';
}

export const App = () => {
	const measurement = useConsent('measurement');
	const marketing = useConsent('marketing');
	return (
		<main>
			<p>c15t / React</p>
			<h1>Consent example</h1>
			<p>One consent setup for your analytics, advertising and video embeds.</p>
			<nav aria-label="Banner design">
				<a href="/">Default</a>
				<a href="/?design=branded">Branded</a>
				<a href="/experiment.html">Experiment</a>
				<a href="/experiment.html?experiment=1&arm=wall">
					Experiment (wall arm)
				</a>
			</nav>
			<section className="card">
				<h2>Scripts follow your choices</h2>
				<ul className="statuses">
					<li>
						PostHog:{' '}
						{measurement ? 'measurement allowed' : 'waiting for measurement'}
					</li>
					<li>
						X Pixel: {marketing ? 'marketing allowed' : 'waiting for marketing'}
					</li>
				</ul>
				<p>
					Set your project IDs in .env.local to enable the vendor scripts.
					DevTools shows their loading status in development.
				</p>
			</section>
			<section className="card">
				<h2>YouTube embed</h2>
				<VideoEmbed />
			</section>
			{DevTools && (
				<Suspense fallback={null}>
					<DevTools />
				</Suspense>
			)}
		</main>
	);
};
