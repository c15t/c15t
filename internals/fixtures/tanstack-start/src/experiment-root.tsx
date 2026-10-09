// oxlint-disable no-use-before-define -- TanStack Router's file-route shape: the component reads its own route's loader data.
/**
 * `src/routes/__root.tsx` with the banner-shape experiment. `vite.config.ts`
 * swaps it in for `C15T_EXPERIMENT=1`, so the default root stays as it is.
 *
 * `?experiment=1` runs the experiment and lets c15t pick the arm in the
 * browser. `&arm=wall` is the arm a flag provider would resolve: the server
 * passes it to `resolveConsent({ experiment })`, which counts it through
 * `/init` and returns the experiment in the state, so `ConsentRoot` needs no
 * `experiment` option for it.
 */
import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
} from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogLink,
	ConsentRoot,
} from 'c15t/tanstack-start';
import {
	consentLoaderOptions,
	resolveConsent,
} from 'c15t/tanstack-start/server';
import { useMemo } from 'react';

import {
	bannerExperiment,
	ExperimentReadoutContext,
	experimentSearch,
	useExperimentLog,
} from './experiment';
import type { ExperimentSearch } from './experiment';
import { scripts } from './scripts';
import { testBackend } from './test-backend';

import consentCss from 'c15t/tanstack-start/styles.css?url';

const backendURL = 'https://your-project.inth.app';

const getConsentState = createServerFn({ method: 'GET' })
	.validator((data: ExperimentSearch) => data)
	.handler(({ data }) =>
		resolveConsent({
			backendURL,
			...testBackend('backendURL'),
			experiment: data.arm ? { ...bannerExperiment, arm: data.arm } : undefined,
		})
	);

const loader = async ({ location }: { location: { searchStr: string } }) => {
	const experimentSwitch = experimentSearch(location.searchStr);
	return {
		consent: await getConsentState({ data: experimentSwitch }),
		experimentSwitch,
	};
};

const RootComponent = () => {
	// The registered route tree types the root as `src/routes/__root.tsx`,
	// which this file replaces at build time, so name this loader's shape.
	const { consent, experimentSwitch } = Route.useLoaderData() as Awaited<
		ReturnType<typeof loader>
	>;
	// The log belongs to one run: a client navigation to another arm starts
	// a fresh list instead of mixing the two.
	const run = experimentSwitch.enabled
		? `exp:${experimentSwitch.arm ?? ''}`
		: '';
	const { callbacks, events } = useExperimentLog(run);
	const readout = useMemo(
		() => ({ events, running: experimentSwitch.enabled }),
		[events, experimentSwitch.enabled]
	);
	const options = useMemo(
		() =>
			experimentSwitch.enabled
				? {
						callbacks,
						// With no server arm, c15t picks one in the browser.
						experiment: experimentSwitch.arm ? undefined : bannerExperiment,
					}
				: undefined,
		[callbacks, experimentSwitch.arm, experimentSwitch.enabled]
	);
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				<ConsentRoot
					state={consent}
					backendURL={backendURL}
					{...testBackend('backendURL')}
					options={options}
					scripts={scripts}
				>
					<ExperimentReadoutContext.Provider value={readout}>
						<Outlet />
					</ExperimentReadoutContext.Provider>
					<ConsentBanner />
					<ConsentDialog />
					<footer>
						<ConsentDialogLink>Privacy settings</ConsentDialogLink>
					</footer>
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
		links: [{ href: consentCss, rel: 'stylesheet' }],
		meta: [
			{ charSet: 'utf-8' },
			{ content: 'width=device-width, initial-scale=1', name: 'viewport' },
		],
	}),
	loader,
});
