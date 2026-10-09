import { DEFAULT_OFFLINE_RULES } from './options.ts';
import { generateScriptsArrayValue, generateScriptsImport } from './scripts.ts';
import type { BoilerplateOptions, BoilerplateTemplate } from './types.ts';

/** Generate the native Astro integration and layout components. */
export const generateAstroBoilerplate = (
	options: BoilerplateOptions
): BoilerplateTemplate => {
	const hosted = options.mode === 'hosted';
	if (hosted && !options.backendURL) {
		throw new Error('Hosted Astro boilerplate requires a backend URL.');
	}
	const mode = hosted
		? `hosted({ backendURL: ${JSON.stringify(options.backendURL)} })`
		: `offline({ policyRules: ${DEFAULT_OFFLINE_RULES} })`;
	return {
		dependencies: [
			'@c15t/astro',
			'@astrojs/svelte',
			'svelte',
			...(options.scripts.length ? ['@c15t/integrations'] : []),
		],
		files: {
			'Consent.astro': `---
import ConsentBanner from '@c15t/astro/components/consent-banner.astro';
import ConsentDialog from '@c15t/astro/components/consent-dialog.astro';
import ConsentDialogLink from '@c15t/astro/components/consent-dialog-link.astro';
---
<ConsentBanner />
<ConsentDialog />
<ConsentDialogLink>Privacy settings</ConsentDialogLink>
`,
			'ConsentHead.astro': `---
import ConsentScript from '@c15t/astro/components/consent-script.astro';
---
<ConsentScript />
`,
			'consent-client.ts': `${generateScriptsImport(options.scripts)}
import type { C15tClientOptionsExtension } from '@c15t/astro';

export default {
	scripts: ${generateScriptsArrayValue(options.scripts)},
} satisfies C15tClientOptionsExtension;
`,
			'consent-integration.ts': `import { fileURLToPath } from 'node:url';
import c15t, { ${hosted ? 'hosted' : 'offline'} } from '@c15t/astro';

export const consentIntegration = c15t({
	mode: ${mode},
	ui: 'svelte',
	clientEntrypoint: fileURLToPath(new URL('./consent-client.ts', import.meta.url)),
});
`,
		},
		instructions: [
			'In astro.config, import { consentIntegration } from "./{{output}}/consent-integration" and add it after the Svelte integration in integrations. Import svelte from "@astrojs/svelte" and add svelte() only if the site does not already use it.',
			"Prerendered and on-demand pages both work. A prerendered page is built once for every visitor, and the browser applies each visitor's stored choice. Render on demand, with an Astro adapter, when the server should read each visitor's geo and cookie before the page reaches them.",
			'In the shared Astro layout, import ConsentHead from "{{output}}/ConsentHead.astro" and Consent from "{{output}}/Consent.astro", adjusting relative imports. Render <ConsentHead /> inside <head> and <Consent /> inside <body>. The native integration owns middleware, browser boot, and ClientRouter navigation.',
			'The preference dialog uses the native Svelte adapter. Reuse an existing React or Vue island runtime instead only after changing the integration ui option and installing its matching Astro integration.',
			...(options.scripts.length
				? [
						'Replace vendor placeholders in {{output}}/consent-client.ts. Keep script callbacks in this client module; Astro configuration serialization cannot preserve functions.',
					]
				: []),
		],
	};
};
