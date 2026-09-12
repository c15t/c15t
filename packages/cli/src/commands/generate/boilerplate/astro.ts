import { DEFAULT_OFFLINE_RULES } from '../templates/shared/options';
import {
	generateScriptsArrayValue,
	generateScriptsImport,
} from '../templates/shared/scripts';
import type { BoilerplateOptions, BoilerplateTemplate } from './types';

/** Generate the native Astro integration and layout components. */
export const generateAstroBoilerplate = (
	options: BoilerplateOptions
): BoilerplateTemplate => {
	const hosted = options.mode === 'hosted';
	if (hosted && !options.backendURL) {
		throw new Error('Hosted Astro boilerplate requires a backend URL.');
	}
	const mode = hosted
		? `hosted({ url: ${JSON.stringify(options.backendURL)} })`
		: `offline({ policyRules: ${DEFAULT_OFFLINE_RULES} })`;
	return {
		dependencies: [
			'@c15t/astro',
			'@astrojs/svelte',
			'svelte',
			...(options.scripts.length ? ['@c15t/scripts'] : []),
		],
		files: {
			'Consent.astro': `---
import ConsentBanner from '@c15t/astro/components/consent-banner.astro';
import ConsentDialog from '@c15t/astro/components/consent-dialog.astro';
import ConsentDialogTrigger from '@c15t/astro/components/consent-dialog-trigger.astro';
---
<ConsentBanner />
<ConsentDialog />
<ConsentDialogTrigger>Privacy settings</ConsentDialogTrigger>
`,
			'ConsentHead.astro': `---
import ConsentScript from '@c15t/astro/components/consent-script.astro';
import '@c15t/astro/styles.css';
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
			'Configure an Astro deployment adapter and on-demand rendering for pages using these components, for example output: "server". Do not prerender a visitor-specific consent decision into shared HTML.',
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
