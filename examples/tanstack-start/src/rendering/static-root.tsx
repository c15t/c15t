// #region docs:static-root title="src/routes/__root.tsx"
import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
} from '@tanstack/react-router';
import {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogLink,
	ConsentRoot,
	consentPrefetchHead,
} from 'c15t/tanstack-start';

import { scripts } from '../scripts';
// #hide docs
import { testBackend } from '../test-backend';
// #endhide docs

import consentCss from 'c15t/tanstack-start/styles.css?url';

const backendURL = 'https://your-project.inth.app';

// No loader: the HTML is built ahead of time, so the browser resolves
// consent after it loads.
const RootComponent = () => (
	<html lang="en">
		<head>
			<HeadContent />
		</head>
		<body>
			<ConsentRoot
				state={{}}
				backendURL={backendURL}
				// #hide docs
				{...testBackend('backendURL')}
				// #endhide docs
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

export const Route = createRootRoute({
	component: RootComponent,
	head: () => ({
		links: [{ href: consentCss, rel: 'stylesheet' }],
		meta: [
			{ charSet: 'utf-8' },
			{ content: 'width=device-width, initial-scale=1', name: 'viewport' },
		],
		// Optional: start the /init request while the browser parses <head>.
		...consentPrefetchHead({
			backendURL,
			// #hide docs
			...testBackend('backendURL'),
			// #endhide docs
		}),
	}),
});
// #endregion docs:static-root
