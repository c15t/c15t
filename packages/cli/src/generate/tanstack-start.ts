import {
	BACKEND_URL_ENV,
	buildOptions,
	envFile,
	integrationDependencies,
	offlineInstruction,
	openingTag,
	scriptImports,
	scriptsConstant,
	sortImports,
	vendorInstruction,
} from './source.ts';
import type { BoilerplateOptions, BoilerplateTemplate } from './types.ts';

const root = (options: BoilerplateOptions): string => {
	const offline = options.mode === 'offline';
	const scripts = scriptsConstant(options.scripts);
	return `${sortImports([
		...scriptImports(options.scripts),
		`import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
} from '@tanstack/react-router';`,
		"import { createServerFn } from '@tanstack/react-start';",
		`import {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogLink,
	ConsentRoot,${offline ? '\n\toffline,' : ''}
} from 'c15t/tanstack-start';`,
		`import {
	consentLoaderOptions,
	createConsentStateHandler,
} from 'c15t/tanstack-start/server';`,
	])}

// Start's compiler keeps the handler and the bundled policy on the server.
const getConsentState = createServerFn({ method: 'GET' }).handler(
	createConsentStateHandler(${offline ? '{ mode: offline() }' : ''})
);
${scripts ? `\n${scripts}` : ''}
const RootComponent = () => {
	const { consent } = Route.useLoaderData();
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				${openingTag('ConsentRoot', ['state={consent}', ...(scripts ? ['scripts={scripts}'] : [])], '\t\t\t\t')}
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
`;
};

/**
 * Generate the TanStack Start quickstart: `vite.config.ts` and the root
 * route, which resolves consent in its loader and renders `ConsentRoot`.
 * @param options Mode and vendor selections.
 * @returns Files relative to the project root.
 */
export const generateTanStackStartBoilerplate = (
	options: BoilerplateOptions
): BoilerplateTemplate => ({
	dependencies: ['c15t', ...integrationDependencies(options)],
	files: {
		...envFile(BACKEND_URL_ENV.vite, options),
		'src/routes/__root.tsx': root(options),
		'vite.config.ts': `import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { consentManifest } from 'c15t/tanstack-start/build';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [consentManifest(${buildOptions(options)}), tanstackStart(), viteReact()],
});
`,
	},
	instructions: [
		'Merge src/routes/__root.tsx with your root route: keep consentLoaderOptions and the consent loader, and keep your own head tags and providers. If your root loader must reload on navigation, move consent to a parent route of its own.',
		...vendorInstruction(options, 'src/routes/__root.tsx'),
		...offlineInstruction(options),
	],
	merge: {},
});
