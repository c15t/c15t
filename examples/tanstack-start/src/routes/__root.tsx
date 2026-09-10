import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
} from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import {
	IABConsentBanner,
	IABProvider,
	IABConsentDialog,
} from 'c15t/react/iab';
import {
	ConsentBanner,
	ConsentBoundary,
	ConsentDialog,
	useModel,
} from 'c15t/tanstack-start';
import {
	consentLoaderOptions,
	createConsentConfigHandler,
} from 'c15t/tanstack-start/server';

import { backendURL, consentRoute } from '../consent';
import { createExampleScripts } from '../example-scripts';

import '../consent-example.css';
import appCss from '../styles.css?url';
import iabCss from 'c15t/tanstack-start/iab/styles.css?url';

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
 * the policy, UI mode, and translations. `ConsentBoundary` reads the result
 * back through loader data, which is what keeps SSR and hydration in sync.
 *
 * The server function gets the absolute `backendURL`; `ConsentBoundary` gets
 * the same-origin `consentRoute`. The prefetch skips a self-referencing
 * `/api/c15t`, so the two must not be swapped.
 */
const getConsentConfig = createServerFn({ method: 'GET' }).handler(
	createConsentConfigHandler({ backendURL })
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
	const config = Route.useLoaderData();

	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				<ConsentBoundary
					config={config}
					backendURL={consentRoute}
					scripts={scripts}
				>
					<ConsentBanner />
					<ConsentDialog />
					<IabSurfaces cmpId={config.initialIab?.cmpId ?? 10} />
					<Outlet />
				</ConsentBoundary>
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
	loader: () => getConsentConfig(),
});
