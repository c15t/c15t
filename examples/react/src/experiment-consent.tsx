/**
 * The `Consent` wrapper from `consent.tsx` with the banner-shape experiment
 * and its event log added. Only `experiment.html` uses it.
 */
import {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogLink,
	ConsentProvider,
	hosted,
} from 'c15t/react';
import { useMemo } from 'react';
import type { ReactNode } from 'react';

import { experimentFromSearch } from './experiment';
import { ExperimentReadout, useExperimentLog } from './experiment-readout';
import { scripts } from './scripts';

import 'c15t/react/styles.css';

const backendURL = import.meta.env.VITE_C15T_BACKEND_URL;
if (!backendURL) {
	throw new Error('Set VITE_C15T_BACKEND_URL to your Inth backend URL');
}
const mode = hosted({ url: backendURL });

export const ExperimentConsent = ({ children }: { children: ReactNode }) => {
	// `?experiment=1` runs the experiment and `&arm=wall` sets the arm the way
	// a flag provider would. Without `arm`, c15t picks one.
	const experiment = useMemo(() => experimentFromSearch(location.search), []);
	const { callbacks, events } = useExperimentLog();
	return (
		<ConsentProvider
			options={{
				callbacks: experiment ? callbacks : undefined,
				experiment,
				mode,
				scripts,
			}}
		>
			{experiment && <ExperimentReadout events={events} />}
			{children}
			<ConsentBanner />
			<ConsentDialog />
			<footer>
				<ConsentDialogLink>Privacy settings</ConsentDialogLink>
			</footer>
		</ConsentProvider>
	);
};
