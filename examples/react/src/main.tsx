/* oxlint-disable react/iframe-missing-sandbox -- The fixed cross-origin YouTube player needs scripts and its own origin for playback. */
import {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogLink,
	ConsentProvider,
	Frame,
	hosted,
	useConsent,
} from 'c15t/react';
import { DevTools } from 'c15t/react/devtools';
import { createRoot } from 'react-dom/client';

import { scripts } from './scripts';

import 'c15t/react/styles.css';
import './style.css';

const backendURL = import.meta.env.VITE_C15T_BACKEND_URL;
if (!backendURL) {
	throw new Error('Set VITE_C15T_BACKEND_URL to your Inth endpoint');
}
const mode = hosted({ url: backendURL });
const branded =
	new URLSearchParams(location.search).get('design') === 'branded';
const theme = branded
	? {
			colors: {
				primary: '#6943a3',
				primaryHover: '#533285',
				textOnPrimary: '#ffffff',
			},
			radius: { lg: '18px' },
		}
	: undefined;

const Gallery = () => {
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
					DevTools shows their loading status.
				</p>
			</section>
			<section className="card">
				<h2>YouTube embed</h2>
				<Frame
					category="measurement"
					placeholder={
						<div className="placeholder">
							<p>Allow measurement to load this YouTube video.</p>
							<ConsentDialogLink>Choose video permissions</ConsentDialogLink>
						</div>
					}
				>
					<iframe
						title="YouTube video"
						sandbox="allow-scripts allow-same-origin allow-presentation"
						src="https://www.youtube-nocookie.com/embed/czTksCF6X8Y?playsinline=1"
						allow="encrypted-media; picture-in-picture"
						allowFullScreen
					/>
				</Frame>
			</section>
			<footer>
				<ConsentDialogLink>Privacy settings</ConsentDialogLink>
			</footer>
		</main>
	);
};

const root = document.getElementById('app');
if (!root) {
	throw new Error('Missing #app');
}
createRoot(root).render(
	<ConsentProvider options={{ mode, scripts, theme }}>
		<Gallery />
		<ConsentBanner />
		<ConsentDialog />
		<DevTools />
	</ConsentProvider>
);
