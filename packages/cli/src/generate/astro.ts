import {
	BACKEND_URL_ENV,
	envFile,
	integrationDependencies,
	offlineInstruction,
	scriptImports,
	scriptsProperty,
	sortImports,
	vendorInstruction,
} from './source.ts';
import type { BoilerplateOptions, BoilerplateTemplate } from './types.ts';

const layout = `---
import { ClientRouter } from 'astro:transitions';
import {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogLink,
	ConsentScript,
} from 'c15t/astro/components';

interface Props {
	title: string;
}

const { title } = Astro.props;
---

<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta content="width=device-width, initial-scale=1" name="viewport" />
		<title>{title}</title>
		<ConsentScript />
		<ClientRouter />
	</head>
	<body>
		<slot />
		<footer>
			<ConsentDialogLink>Privacy settings</ConsentDialogLink>
		</footer>
		<ConsentBanner />
		<ConsentDialog />
	</body>
</html>
`;

/**
 * The mode a static site passes to `c15t()`. A static host has no server
 * to resolve the policy per visitor, so it asks the backend's `/init`.
 */
const integrationCall = (options: BoilerplateOptions, server: boolean) => {
	if (options.mode === 'offline') {
		return { call: 'c15t({ mode: offline() })', factory: 'offline' };
	}
	return server
		? { call: 'c15t()', factory: '' }
		: { call: 'c15t({ mode: hosted() })', factory: 'hosted' };
};

const astroConfig = (options: BoilerplateOptions, server: boolean): string => {
	const { call, factory } = integrationCall(options, server);
	return `${sortImports([
		...(server ? ["import node from '@astrojs/node';"] : []),
		"import svelte from '@astrojs/svelte';",
		"import { defineConfig } from 'astro/config';",
		factory
			? `import c15t, { ${factory} } from 'c15t/astro';`
			: "import c15t from 'c15t/astro';",
	])}

export default defineConfig({
${server ? "\tadapter: node({ mode: 'standalone' }),\n" : ''}	integrations: [svelte(), ${call}],
${server ? "\toutput: 'server',\n" : ''}});
`;
};

/**
 * Generate the Astro quickstart for server output (`astro`, resolved per
 * request) or static output (`astro-static`, `hosted()`): `astro.config.mjs`,
 * `src/layouts/base.astro` and, with vendors, `src/c15t.client.ts`.
 * @param options Output, mode and vendor selections.
 * @returns Files relative to the project root.
 */
export const generateAstroBoilerplate = (
	options: BoilerplateOptions
): BoilerplateTemplate => {
	const server = options.framework === 'astro';
	const files: Record<string, string> = {
		...envFile(BACKEND_URL_ENV.astro, options),
		'astro.config.mjs': astroConfig(options, server),
		'src/layouts/base.astro': layout,
	};
	if (options.scripts.length) {
		files['src/c15t.client.ts'] = `${sortImports([
			...scriptImports(options.scripts),
			"import type { C15tClientOptionsExtension } from 'c15t/astro';",
		])}

export default {
${scriptsProperty(options.scripts, '\t')}} satisfies C15tClientOptionsExtension;
`;
	}
	return {
		dependencies: [
			'c15t',
			...(server ? ['@astrojs/node'] : []),
			'@astrojs/svelte',
			'svelte',
			...integrationDependencies(options),
		],
		files,
		instructions: [
			'Use src/layouts/base.astro as the layout of every page, or move ConsentScript into your own layout head and the banner, dialog and link into its body.',
			server
				? 'Server output resolves each visitor on the server and adds a consent route at /api/c15t. Keep your adapter if the project already has one.'
				: 'Static output asks your backend for each visitor’s policy from the browser, so it needs no adapter.',
			...vendorInstruction(options, 'src/c15t.client.ts'),
			...offlineInstruction(options),
		],
		merge: {},
	};
};
