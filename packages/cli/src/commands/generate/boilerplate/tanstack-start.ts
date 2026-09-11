import { DEFAULT_OFFLINE_RULES } from '../templates/shared/options';
import {
	generateScriptsArrayValue,
	generateScriptsImport,
} from '../templates/shared/scripts';
import type { BoilerplateOptions, BoilerplateTemplate } from './types';

/** Generate a request-scoped TanStack Start loader and consent boundary. */
export const generateTanStackStartBoilerplate = (
	options: BoilerplateOptions
): BoilerplateTemplate => {
	const hosted = options.mode === 'hosted';
	if (hosted && !options.backendURL) {
		throw new Error(
			'Hosted TanStack Start boilerplate requires a backend URL.'
		);
	}
	return {
		dependencies: [
			'@c15t/tanstack-start',
			...(options.scripts.length ? ['@c15t/scripts'] : []),
		],
		files: {
			'Consent.tsx': `import { ConsentBanner, ConsentBoundary, ConsentDialog, ConsentDialogTrigger${hosted ? '' : ', offline'} } from '@c15t/tanstack-start';
import type { ConsentBoundaryProps } from '@c15t/tanstack-start';
import type { ReactNode } from 'react';
import '@c15t/tanstack-start/styles.css';
${generateScriptsImport(options.scripts)}

export function Consent(props: { config: ConsentBoundaryProps['config']; children: ReactNode }) {
	return (
		<ConsentBoundary
			config={props.config}
			${hosted ? `backendURL={${JSON.stringify(options.backendURL)}}\n\t\t\tinitRoute={false}` : `options={{ mode: offline({ policyRules: ${DEFAULT_OFFLINE_RULES} }) }}`}
			scripts={${generateScriptsArrayValue(options.scripts)}}
		>
			{props.children}
			<ConsentBanner />
			<ConsentDialog />
			<ConsentDialogTrigger />
		</ConsentBoundary>
	);
}
`,
			'consent-server.ts': `import { createServerFn } from '@tanstack/react-start';
import { createConsentConfigHandler, consentLoaderOptions } from '@c15t/tanstack-start/server';

// Keep this call in application code so Start assigns its server-function ID.
export const getConsentConfig = createServerFn({ method: 'GET' }).handler(
	createConsentConfigHandler(${hosted ? `{ backendURL: ${JSON.stringify(options.backendURL)} }` : ''})
);

export { consentLoaderOptions };
`,
		},
		instructions: [
			'In src/routes/__root.tsx, import { getConsentConfig, consentLoaderOptions } from "{{output}}/consent-server", adjusting the relative path. Merge consentLoaderOptions into createRootRoute and load consent per request: loader: async () => ({ consent: await getConsentConfig() }). Preserve existing loader results when merging.',
			'Import { Consent } from "{{output}}/Consent". Inside the existing root component read const { consent } = Route.useLoaderData() and wrap its <Outlet /> and existing application providers in <Consent config={consent}>. Preserve the existing document shell, HeadContent, and Scripts.',
			"Keep consent configuration in loader data. Do not cache a consent runtime or a visitor's config at module scope. consentLoaderOptions keeps this root loader from re-running on client navigation. If your existing root loader must reload, move consent to a dedicated parent route instead of applying those options to unrelated data.",
			...(hosted
				? [
						'This template sends browser initialization and saves directly to the supplied backend using initRoute={false}. Configure that backend to allow the application origin. It does not require an /api/c15t route.',
					]
				: []),
			...(options.scripts.length
				? [
						'Replace vendor placeholders in {{output}}/Consent.tsx before loading analytics in the application.',
					]
				: []),
		],
	};
};
