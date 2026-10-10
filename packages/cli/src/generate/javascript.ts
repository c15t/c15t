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

/** The link that opens the preference dialog, without any script. */
export const PREFERENCES_LINK =
	'<a href="#c15t-preferences">Privacy settings</a>';

/**
 * A minimal page for a project without an `index.html`.
 * @param title Page title.
 * @param head Extra lines inside `<head>`, already indented by two tabs.
 * @param body Extra lines after the footer, already indented by two tabs.
 * @returns The page.
 */
export const htmlPage = (title: string, head: string, body: string): string =>
	`<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta
			name="viewport"
			content="width=device-width, initial-scale=1"
		/>
		<title>${title}</title>
${head}	</head>
	<body>
		<footer>
			${PREFERENCES_LINK}
		</footer>
${body}	</body>
</html>
`;

/**
 * Generate the JavaScript (ESM) quickstart: `vite.config.ts`, `src/main.ts`
 * and a privacy settings link in `index.html`.
 * @param options Mode and vendor selections.
 * @returns Files relative to the project root.
 */
export const generateJavaScriptBoilerplate = (
	options: BoilerplateOptions
): BoilerplateTemplate => {
	const mode = options.mode === 'offline' ? 'offline' : 'manifest';
	return {
		dependencies: [
			'@c15t/browser',
			'c15t',
			...integrationDependencies(options),
		],
		files: {
			...envFile(BACKEND_URL_ENV.vite, options),
			'index.html': htmlPage(
				'c15t with JavaScript',
				'',
				'\t\t<script\n\t\t\ttype="module"\n\t\t\tsrc="/src/main.ts"\n\t\t></script>\n'
			),
			'src/main.ts': `${sortImports([
				`import { init, ${mode} } from '@c15t/browser';`,
				...scriptImports(options.scripts),
			])}

init({
	mode: ${mode}(),
${scriptsProperty(options.scripts, '\t')}});
`,
			'vite.config.ts': `import { consentManifest } from 'c15t/build';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [consentManifest(${buildOptions(options)})],
});
`,
		},
		instructions: [
			'Call init() once from the script your page loads. The client opens the preference dialog for any link to #c15t-preferences.',
			...vendorInstruction(options, 'src/main.ts'),
			...offlineInstruction(options),
		],
		merge: {
			'index.html': {
				inserts: [{ before: '</body>', content: PREFERENCES_LINK }],
				marker: '#c15t-preferences',
				type: 'insert',
			},
		},
	};
};
