import { DEFAULT_OFFLINE_RULES } from '../templates/shared/options';
import {
	generateScriptsArrayValue,
	generateScriptsImport,
} from '../templates/shared/scripts';
import type { BoilerplateOptions, BoilerplateTemplate } from './types';

const runtimeSource = function runtimeSource(
	options: BoilerplateOptions
): string {
	if (options.mode === 'hosted' && !options.backendURL) {
		throw new Error('Vue hosted boilerplate requires a backend URL.');
	}
	const mode =
		options.mode === 'hosted'
			? `const mode = hosted({ url: ${JSON.stringify(options.backendURL)} });`
			: `// Review this starting policy for your site before deployment.
const mode: ProviderTransportFactory = Object.assign(
	(context: Parameters<ProviderTransportFactory>[0]) => createOfflineTransport({
		translations: context.translations,
		policyRules: ${DEFAULT_OFFLINE_RULES},
	}),
	{ kind: 'offline' as const },
);`;
	return `${options.mode === 'hosted' ? "import { hosted } from '@c15t/core';" : "import { createOfflineTransport, type ProviderTransportFactory } from '@c15t/core';"}
import { createConsentRuntime } from '@c15t/core/runtime';
${generateScriptsImport(options.scripts)}

${mode}

// Each app owns its runtime; never share consent state between SSR requests.
export const createRuntime = () => createConsentRuntime({
	mode,
	pkg: '@c15t/vue',
	scripts: ${options.scripts.length ? generateScriptsArrayValue(options.scripts, '\t') : '[]'},
});
`;
};

/**
 * Generate a Vue or Nuxt integration using the shared v3 runtime.
 * @param options - Framework, transport, and script selections.
 * @returns Files and wiring instructions, without editing the host application.
 */
export const generateVueBoilerplate = function generateVueBoilerplate(
	options: BoilerplateOptions
): BoilerplateTemplate {
	const nuxt = options.framework === 'nuxt';
	const files: Record<string, string> = {
		'consent-runtime.ts': runtimeSource(options),
		'consent-ui.vue': `<script setup lang="ts">
import ConsentRoot from '@c15t/vue/consent-root';
</script>

<template>
	<ConsentRoot />
</template>
`,
		'install-consent.ts': `import type { App } from 'vue';
import { c15tVue } from '@c15t/vue/vue-plugin';
import { createRuntime } from './consent-runtime';
import '@c15t/ui/styles.css';

export const installConsent = (app: App) => {
	const runtime = createRuntime();
	app.use(c15tVue, { runtime, showTrigger: true });
	app.mixin({
		mounted() {
			if (this.$root === this) runtime.start();
		},
	});
	app.onUnmount(() => runtime.dispose());
	return runtime;
};
`,
	};
	if (nuxt) {
		files['consent-plugin.client.ts'] =
			`import { defineNuxtPlugin } from '#app';
import { installConsent } from './install-consent';

export default defineNuxtPlugin((nuxtApp) => {
	installConsent(nuxtApp.vueApp);
});
`;
	}
	const instructions = nuxt
		? [
				"Add '{{output}}/consent-plugin.client.ts' to plugins in nuxt.config.ts (use a path relative to that config). This client plugin owns the runtime; remove an existing @c15t/vue entry from modules to avoid installing a second runtime.",
				"In nuxt.config.ts, import { fileURLToPath } from 'node:url' and merge alias: { '#c15t/composables': fileURLToPath(import.meta.resolve('@c15t/vue/vue-plugin')) }. Nuxt supplies #imports itself.",
				"In app.vue, import ConsentUI from '{{output}}/consent-ui.vue' using its relative path, then render <ClientOnly><ConsentUI /></ClientOnly> once alongside <NuxtPage /> or <NuxtLayout>. Keep the page outside ClientOnly.",
			]
		: [
				"In vite.config.ts, import c15tVue from '@c15t/vue/vite' and add c15tVue() alongside vue() in plugins.",
				"In your entry file, import { installConsent } from '{{output}}/install-consent' using its relative path; call installConsent(app) after createApp(App) and before app.mount(...).",
				"In App.vue, import ConsentUI from '{{output}}/consent-ui.vue' using its relative path and render <ConsentUI /> once alongside your application content.",
			];
	if (options.scripts.length) {
		instructions.push(
			'Replace the vendor IDs and other placeholder settings in {{output}}/consent-runtime.ts before deployment.'
		);
	}
	return {
		dependencies: [
			'@c15t/vue',
			'@c15t/core',
			'@c15t/ui',
			...(options.scripts.length ? ['@c15t/scripts'] : []),
		],
		files,
		instructions,
	};
};
