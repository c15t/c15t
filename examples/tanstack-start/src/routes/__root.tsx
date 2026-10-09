// oxlint-disable no-use-before-define -- TanStack Router's file-route shape: the component reads its own route's loader data.
// #region docs:root
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
	createConsentStateHandler,
} from 'c15t/tanstack-start/server';

import { consentOptions } from '../consent-options.server';
import { scripts } from '../scripts';

// Where the browser saves consent: the project the build read the manifest
// from.
const backendURL =
	import.meta.env.VITE_C15T_BACKEND_URL ?? 'https://benchmarks-inth.inth.app';

// Declare the server function in your own module. Start's compiler splits
// the server code, and the bundled manifest, out of the browser bundle at
// this call site.
const getConsentState = createServerFn({ method: 'GET' }).handler(
	createConsentStateHandler(consentOptions)
);

const RootComponent = () => {
	const { consent } = Route.useLoaderData();
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				<ConsentRoot
					state={consent}
					backendURL={backendURL}
					initRoute={false}
					scripts={scripts}
				>
					<Outlet />
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
		meta: [
			{ charSet: 'utf-8' },
			{ content: 'width=device-width, initial-scale=1', name: 'viewport' },
		],
	}),
	loader: async () => ({ consent: await getConsentState() }),
});
// #endregion docs:root
