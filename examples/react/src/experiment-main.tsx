/**
 * Entry for `experiment.html`: the example app inside a provider that runs
 * the banner-shape experiment. `main.tsx` is the entry readers copy.
 */
import { createRoot } from 'react-dom/client';

import { App } from './app';
import { ExperimentConsent } from './experiment-consent';

const root = document.getElementById('root');
if (!root) {
	throw new Error('Missing #root element');
}
createRoot(root).render(
	<ExperimentConsent>
		<App />
	</ExperimentConsent>
);
