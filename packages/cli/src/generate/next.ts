import {
	BACKEND_URL_ENV,
	buildOptions,
	envFile,
	integrationDependencies,
	offlineInstruction,
	scriptImports,
	scriptsProperty,
	sortImports,
	vendorInstruction,
} from './source.ts';
import type { BoilerplateOptions, BoilerplateTemplate } from './types.ts';

const nextConfig = (options: BoilerplateOptions): string => {
	const build = buildOptions(options);
	return `import { withConsentManifest } from 'c15t/next/build';
import type { NextConfig } from 'next';

const nextConfig = {} satisfies NextConfig;

export default withConsentManifest(nextConfig${build ? `, ${build}` : ''});
`;
};

const consentConfig = (
	options: BoilerplateOptions,
	routePrefix: boolean
): string => {
	const offline = options.mode === 'offline';
	const body = `${offline ? '\tmode: offline(),\n' : ''}${
		routePrefix ? "\troutePrefix: '/api/c15t',\n" : ''
	}${scriptsProperty(options.scripts, '\t')}`;
	return `${sortImports([
		...scriptImports(options.scripts),
		`import { defineConsentConfig${offline ? ', offline' : ''} } from 'c15t/next';`,
	])}

export default defineConsentConfig(${body ? `{\n${body}}` : '{}'});
`;
};

const components = `import {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogLink,
	ConsentRoot,
} from 'c15t/next';`;

const appLayout = `${components}
import { resolveConsent } from 'c15t/next/server';
import type { ReactNode } from 'react';

import './globals.css';

const RootLayout = ({ children }: { children: ReactNode }) => (
	<html lang="en">
		<body>
			{/* Not awaited: the page renders while consent resolves. */}
			<ConsentRoot state={resolveConsent()}>
				{children}
				<ConsentBanner />
				<ConsentDialog />
				<footer>
					<ConsentDialogLink>Privacy settings</ConsentDialogLink>
				</footer>
			</ConsentRoot>
		</body>
	</html>
);

export default RootLayout;
`;

const pagesApp = `${components}
import type { ConsentPageProps } from 'c15t/next/pages';
import type { AppProps } from 'next/app';

import '@/styles/globals.css';

const App = ({ Component, pageProps }: AppProps<ConsentPageProps>) => (
	// Pages without getServerSideProps resolve consent in the browser.
	<ConsentRoot state={pageProps.consent}>
		<Component {...pageProps} />
		<ConsentBanner />
		<ConsentDialog />
		<footer>
			<ConsentDialogLink>Privacy settings</ConsentDialogLink>
		</footer>
	</ConsentRoot>
);

export default App;
`;

const pagesRoute = `import { createPagesConsentRoute } from 'c15t/next/pages';

export default createPagesConsentRoute();
`;

/** The `getServerSideProps` lines a page adds to render consent on the server. */
export const NEXT_PAGES_SSR = `import { withConsentProps } from 'c15t/next/pages';

export const getServerSideProps = withConsentProps();`;

const pagesIndex = `${NEXT_PAGES_SSR}

const Page = () => (
	<main>
		<h1>Home</h1>
	</main>
);

export default Page;
`;

/**
 * Generate the Next.js quickstart: `c15t.config.ts`, `next.config.ts` and
 * the root layout (App Router) or `_app.tsx`, consent route and a page with
 * `getServerSideProps` (Pages Router).
 * @param options Router, mode and vendor selections.
 * @returns Files relative to the project root.
 */
export const generateNextBoilerplate = (
	options: BoilerplateOptions
): BoilerplateTemplate => {
	const pages = options.framework === 'next-pages';
	// Offline mode has no backend for a consent route to answer from.
	const route = pages && options.mode === 'hosted';
	const files: Record<string, string> = {
		...envFile(BACKEND_URL_ENV.next, options),
		'c15t.config.ts': consentConfig(options, route),
		'next.config.ts': nextConfig(options),
	};
	if (pages) {
		files['pages/_app.tsx'] = pagesApp;
		if (route) {
			files['pages/api/c15t/[...c15t].ts'] = pagesRoute;
		}
		files['pages/index.tsx'] = pagesIndex;
	} else {
		files['app/layout.tsx'] = appLayout;
	}
	return {
		dependencies: ['c15t', ...integrationDependencies(options)],
		files,
		instructions: [
			pages
				? 'Add `export const getServerSideProps = withConsentProps();` (from c15t/next/pages) to each page that should render the banner on the server. Pages without it resolve consent in the browser.'
				: 'app/layout.tsx imports ./globals.css. Keep your existing fonts and metadata when you merge it with your layout.',
			...vendorInstruction(options, 'c15t.config.ts'),
			...offlineInstruction(options),
		],
		merge: pages ? { 'pages/index.tsx': { type: 'keep' } } : {},
	};
};
