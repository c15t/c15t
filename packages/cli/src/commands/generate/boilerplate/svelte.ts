import { DEFAULT_OFFLINE_RULES } from '../templates/shared/options';
import {
	generateScriptsArrayValue,
	generateScriptsImport,
} from '../templates/shared/scripts';
import type { BoilerplateOptions, BoilerplateTemplate } from './types';

/**
 * Generate a Svelte 5 provider and transport configuration, also for SvelteKit.
 * @param options - Framework, transport, and script selections.
 * @returns Files and wiring instructions, without replacing layouts or hooks.
 */
export const generateSvelteBoilerplate = function generateSvelteBoilerplate(
	options: BoilerplateOptions
): BoilerplateTemplate {
	if (options.mode === 'hosted' && !options.backendURL) {
		throw new Error('Svelte hosted boilerplate requires a backend URL.');
	}
	const mode =
		options.mode === 'hosted'
			? `hosted({ url: ${JSON.stringify(options.backendURL)} })`
			: `offline({ policyRules: ${DEFAULT_OFFLINE_RULES} })`;
	return {
		dependencies: [
			'@c15t/svelte',
			...(options.scripts.length ? ['@c15t/scripts'] : []),
		],
		files: {
			'consent-options.ts': `import { ${options.mode}, type ConsentManagerOptions } from '@c15t/svelte';
${generateScriptsImport(options.scripts)}

// Review offline policies and replace script vendor placeholders before deployment.
export const consentOptions = {
	mode: ${mode},
	scripts: ${options.scripts.length ? generateScriptsArrayValue(options.scripts, '\t') : '[]'},
} satisfies ConsentManagerOptions;
`,
			'consent-provider.svelte': `<script lang="ts">
	import type { Snippet } from 'svelte';
	import { ConsentManagerProvider, ConsentBanner, ConsentDialog, ConsentDialogTrigger } from '@c15t/svelte';
	import '@c15t/svelte/styles.css';
	import { consentOptions } from './consent-options';

	let { children }: { children?: Snippet } = $props();
</script>

<ConsentManagerProvider options={consentOptions}>
	{#if children}{@render children()}{/if}
	<ConsentBanner />
	<ConsentDialog />
	<ConsentDialogTrigger />
</ConsentManagerProvider>
`,
		},
		instructions: [
			options.framework === 'sveltekit'
				? "In src/routes/+layout.svelte, import ConsentProvider from '{{output}}/consent-provider.svelte' using its relative path. Wrap the existing {@render children()} in <ConsentProvider>...</ConsentProvider>; retain your existing load functions and hooks. The provider initializes in the browser after mount."
				: "In App.svelte, import ConsentProvider from '{{output}}/consent-provider.svelte' using its relative path and wrap your application content in <ConsentProvider>...</ConsentProvider>. This component requires Svelte 5.",
			...(options.scripts.length
				? [
						'Replace the vendor IDs and other placeholder settings in {{output}}/consent-options.ts before deployment.',
					]
				: []),
		],
	};
};
