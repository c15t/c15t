/**
 * Entry for `experiment.html`: the example app inside the provider from
 * `experiment-consent.tsx`, which runs the banner-shape experiment.
 * `main.tsx` is the entry for the plain setup.
 */
import { createRoot } from 'react-dom/client';

import { App } from './app';
import { Consent } from './experiment-consent';
import { ExperimentReadout } from './experiment-readout';

/**
 * Stands in for a flag provider: `?arm=wall`, `?arm=control` or `?arm=off`
 * set the arm, and no `arm` lets c15t pick one.
 */
const armFromSearch = (search: string) => {
	const arm = new URLSearchParams(search).get('arm');
	if (arm === null) {
		return undefined;
	}
	return arm === 'wall' || arm === 'off' ? arm : 'control';
};

const root = document.getElementById('root');
if (!root) {
	throw new Error('Missing #root element');
}
createRoot(root).render(
	<Consent arm={armFromSearch(location.search)}>
		<ExperimentReadout />
		<App />
	</Consent>
);
