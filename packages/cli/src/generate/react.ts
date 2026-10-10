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

const consent = (options: BoilerplateOptions): string => {
	const offline = options.mode === 'offline';
	const mode = offline ? 'offline' : 'manifest';
	return `${sortImports([
		...scriptImports(options.scripts),
		`import {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogLink,
	ConsentProvider,
	${mode},
} from 'c15t/react';`,
		"import type { ReactNode } from 'react';",
	])}

const options = {
	// ${offline ? 'The recommended policy, resolved in the browser.' : `The policy the build downloaded from ${BACKEND_URL_ENV.vite}.`}
	mode: ${mode}(),
${scriptsProperty(options.scripts, '\t')}};

export const Consent = ({ children }: { children: ReactNode }) => (
	<ConsentProvider options={options}>
		{children}
		<ConsentBanner />
		<ConsentDialog />
		<footer>
			<ConsentDialogLink>Privacy settings</ConsentDialogLink>
		</footer>
	</ConsentProvider>
);
`;
};

const main = `import { createRoot } from 'react-dom/client';

import { App } from './app';
import { Consent } from './consent';

const root = document.getElementById('root');
if (!root) {
	throw new Error('Missing #root element');
}
createRoot(root).render(
	<Consent>
		<App />
	</Consent>
);
`;

/**
 * Generate the React with Vite quickstart: `vite.config.ts`,
 * `src/consent.tsx` and `src/main.tsx`.
 * @param options Mode and vendor selections.
 * @returns Files relative to the project root.
 */
export const generateReactBoilerplate = (
	options: BoilerplateOptions
): BoilerplateTemplate => ({
	dependencies: ['c15t', ...integrationDependencies(options)],
	files: {
		...envFile(BACKEND_URL_ENV.vite, options),
		'src/consent.tsx': consent(options),
		'src/main.tsx': main,
		'vite.config.ts': `import react from '@vitejs/plugin-react';
import { consentManifest } from 'c15t/build';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [react(), consentManifest(${buildOptions(options)})],
});
`,
	},
	instructions: [
		'src/main.tsx renders the named App export of src/app.tsx inside <Consent>. Point it at your own root component if yours differs.',
		...vendorInstruction(options, 'src/consent.tsx'),
		...offlineInstruction(options),
	],
	merge: {},
});
