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

/** The line SvelteKit's `src/app.d.ts` adds for the consent locals type. */
export const SVELTEKIT_LOCALS_REFERENCE =
	'/// <reference types="@c15t/svelte/kit/locals" />';

/** Indent each non-empty line of a block by one tab. */
const indent = (block: string): string =>
	block
		.split('\n')
		.map((line) => (line ? `\t${line}` : line))
		.join('\n');

/** The `<script>` body: imports, then the vendor list. */
const scriptBlock = (
	options: BoilerplateOptions,
	imports: string[],
	declarations: string
): string => {
	const constants = [declarations, scriptsConstant(options.scripts)]
		.filter(Boolean)
		.join('\n');
	return `<script lang="ts">
${indent(sortImports([...scriptImports(options.scripts), ...imports]))}
${constants ? `\n${indent(constants)}` : ''}</script>`;
};

const viteConfig = (
	options: BoilerplateOptions,
	kit: boolean
): string => `${sortImports([
	"import { consentManifest } from '@c15t/svelte/vite';",
	kit
		? "import adapter from '@sveltejs/adapter-auto';"
		: "import { svelte } from '@sveltejs/vite-plugin-svelte';",
	...(kit ? ["import { sveltekit } from '@sveltejs/kit/vite';"] : []),
	"import { defineConfig } from 'vite';",
])}

export default defineConfig({
	plugins: [consentManifest(${buildOptions(options)}), ${kit ? 'sveltekit({ adapter: adapter() })' : 'svelte()'}],
});
`;

const withScripts = (
	options: BoilerplateOptions,
	attributes: string[]
): string[] =>
	options.scripts.length ? [...attributes, '{scripts}'] : attributes;

const svelteFiles = (options: BoilerplateOptions): Record<string, string> => {
	const mode = options.mode === 'offline' ? 'offline' : 'manifest';
	return {
		...envFile(BACKEND_URL_ENV.vite, options),
		'src/App.svelte': `${scriptBlock(
			options,
			[
				`import {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogLink,
	ConsentProvider,
	${mode},
} from '@c15t/svelte';`,
			],
			''
		)}

${openingTag('ConsentProvider', withScripts(options, [`mode={${mode}()}`]), '')}
	<main>
		<h1>c15t + Svelte</h1>
		<p>Your app goes here.</p>
	</main>
	<footer>
		<ConsentDialogLink>Privacy settings</ConsentDialogLink>
	</footer>
	<ConsentBanner />
	<ConsentDialog />
</ConsentProvider>
`,
		'vite.config.ts': viteConfig(options, false),
	};
};

const svelteKitFiles = (
	options: BoilerplateOptions
): Record<string, string> => {
	const offline = options.mode === 'offline';
	return {
		...envFile(BACKEND_URL_ENV.sveltekit, options),
		'src/app.d.ts': `${SVELTEKIT_LOCALS_REFERENCE}

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
`,
		'src/hooks.server.ts': `import { c15tHandle${offline ? ', offline' : ''} } from '@c15t/svelte/kit';

export const handle = c15tHandle(${offline ? '{ mode: offline() }' : ''});
`,
		'src/routes/+layout.server.ts':
			"export { loadConsent as load } from '@c15t/svelte/kit';\n",
		'src/routes/+layout.svelte': `${scriptBlock(
			options,
			[
				`import {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogLink,
	ConsentRoot,
} from '@c15t/svelte';`,
			],
			'let { children, data } = $props();\n'
		)}

${openingTag('ConsentRoot', withScripts(options, ['state={data.consent}']), '')}
	{@render children()}
	<footer>
		<ConsentDialogLink>Privacy settings</ConsentDialogLink>
	</footer>
	<ConsentBanner />
	<ConsentDialog />
</ConsentRoot>
`,
		'vite.config.ts': viteConfig(options, true),
	};
};

/**
 * Generate the Svelte with Vite quickstart (`vite.config.ts` and
 * `src/App.svelte`) or the SvelteKit quickstart (`vite.config.ts`, the
 * `src/app.d.ts` locals reference, `src/hooks.server.ts` and the root
 * layout's load and component).
 * @param options Framework, mode and vendor selections.
 * @returns Files relative to the project root.
 */
export const generateSvelteBoilerplate = (
	options: BoilerplateOptions
): BoilerplateTemplate => {
	const kit = options.framework === 'sveltekit';
	return {
		dependencies: ['@c15t/svelte', ...integrationDependencies(options)],
		files: kit ? svelteKitFiles(options) : svelteFiles(options),
		instructions: [
			kit
				? 'The root layout renders ConsentRoot with the state loadConsent resolved on the server. Keep your own layout markup around {@render children()}.'
				: 'src/App.svelte shows where ConsentProvider goes. Move your app inside it if you keep your own root component. It requires Svelte 5.',
			...vendorInstruction(
				options,
				kit ? 'src/routes/+layout.svelte' : 'src/App.svelte'
			),
			...offlineInstruction(options),
		],
		merge: kit
			? {
					'src/app.d.ts': {
						inserts: [{ before: '', content: SVELTEKIT_LOCALS_REFERENCE }],
						marker: '@c15t/svelte/kit/locals',
						type: 'insert',
					},
				}
			: {},
	};
};
