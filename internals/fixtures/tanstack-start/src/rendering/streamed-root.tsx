// oxlint-disable no-use-before-define -- TanStack Router's file-route shape: the component reads its own route's loader data.
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

import { scripts } from '../scripts';
import { testBackend } from '../test-backend';

const backendURL = 'https://your-project.inth.app';

// Declare the server function in your own module. Start's compiler splits
// the server code out of the browser bundle at this call site.
const getConsentState = createServerFn({ method: 'GET' }).handler(
	createConsentStateHandler({
		backendURL,
		...testBackend('backendURL'),
	})
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
					{...testBackend('backendURL')}
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
	// Not awaited: the page streams without waiting for consent, and
	// ConsentRoot accepts the pending promise.
	loader: () => ({ consent: getConsentState() }),
});
