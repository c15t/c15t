import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
} from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import type { ExperimentReportEvent } from 'c15t';
import {
	IABConsentBanner,
	IABProvider,
	IABConsentDialog,
} from 'c15t/react/iab';
import {
	ConsentBanner,
	ConsentDialog,
	ConsentRoot,
	useModel,
} from 'c15t/tanstack-start';
import {
	consentLoaderOptions,
	createConsentStateHandler,
} from 'c15t/tanstack-start/server';
import { createContext, useCallback, useMemo, useState } from 'react';

import { backendURL, consentRoute } from '../consent';
import { createExampleScripts } from '../example-scripts';
import { bannerExperiment, experimentSearch } from '../experiment';
import type { ExperimentSearch } from '../experiment';

import '../consent-example.css';
import appCss from '../styles.css?url';
import iabCss from 'c15t/tanstack-start/iab/styles.css?url';

/** Events the banner experiment reported, for the page's readout. */
export const ExperimentEventsContext = createContext<
	readonly ExperimentReportEvent[] | null
>(null);

const scripts = createExampleScripts(
	import.meta.env.VITE_POSTHOG_KEY,
	import.meta.env.VITE_X_PIXEL_ID
);

/**
 * Declared here, not in the package: the Start compiler splits server code
 * out of the client bundle at this `createServerFn().handler()` call site.
 *
 * The handler reads the request's `c15t` cookie and geo headers, then
 * resolves init from the backend manifest so the first paint already knows
 * the policy, UI mode, and translations. `ConsentRoot` reads the result
 * back through loader data, which is what keeps SSR and hydration in sync.
 *
 * The server function gets the absolute `backendURL`; `ConsentRoot` gets
 * the same-origin `consentRoute`. The prefetch skips a self-referencing
 * `/api/c15t`, so the two must not be swapped.
 */
const getConsentState = createServerFn({ method: 'GET' }).handler(
	createConsentStateHandler({ backendURL })
);

const IabSurfaces = ({ cmpId }: { cmpId: number }) => {
	const model = useModel();
	if (model !== 'iab') {
		return null;
	}
	return (
		<IABProvider cmpId={cmpId}>
			<IABConsentBanner />
			<IABConsentDialog />
		</IABProvider>
	);
};

const RootComponent = () => {
	// oxlint-disable-next-line no-use-before-define -- TanStack Router's file-route shape: the component reads its own route's loader data.
	const { experiment: experimentSwitch, ...state } = Route.useLoaderData();
	// `?experiment=1` runs the banner-shape experiment; the loader resolved
	// `arm` on the server, which is where a flag provider's answer would
	// come from. Without the param the root gets no `experiment` option.
	const [events, setEvents] = useState<ExperimentReportEvent[]>([]);
	const report = useCallback((event: ExperimentReportEvent) => {
		setEvents((previous) => [...previous, event]);
	}, []);
	const experiment = useMemo(
		() =>
			experimentSwitch.enabled
				? bannerExperiment(experimentSwitch.arm, report)
				: undefined,
		[experimentSwitch.arm, experimentSwitch.enabled, report]
	);

	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				<ConsentRoot
					state={state}
					backendURL={consentRoute}
					scripts={scripts}
					options={{ experiment }}
				>
					<ConsentBanner />
					<ConsentDialog />
					<IabSurfaces cmpId={state.initialIab?.cmpId ?? 10} />
					<ExperimentEventsContext.Provider value={experiment ? events : null}>
						<Outlet />
					</ExperimentEventsContext.Provider>
				</ConsentRoot>
				<Scripts />
			</body>
		</html>
	);
};

export const Route = createRootRoute({
	...consentLoaderOptions,
	component: RootComponent,
	head: () => ({
		links: [
			{ href: appCss, rel: 'stylesheet' },
			{ href: iabCss, rel: 'stylesheet' },
		],
		meta: [
			{ charSet: 'utf-8' },
			{ content: 'width=device-width, initial-scale=1', name: 'viewport' },
			{ title: 'c15t × TanStack Start' },
		],
	}),
	loader: async ({
		location,
	}): Promise<
		Awaited<ReturnType<typeof getConsentState>> & {
			experiment: ExperimentSearch;
		}
	> => ({
		...(await getConsentState()),
		experiment: experimentSearch(location.searchStr),
	}),
});
