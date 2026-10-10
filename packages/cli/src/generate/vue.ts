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

const nuxtFiles = (options: BoilerplateOptions): Record<string, string> => {
	const offline = options.mode === 'offline';
	const files: Record<string, string> = {
		...envFile(BACKEND_URL_ENV.nuxt, options),
		'app/app.vue': `<template>
	<ConsentRoot />
	<NuxtPage />
	<footer>
		<ConsentDialogLink>Privacy settings</ConsentDialogLink>
	</footer>
</template>
`,
		'nuxt.config.ts': `${offline ? "import { offline } from 'c15t/vue';\n\n" : ''}export default defineNuxtConfig({
${offline ? '\tc15t: { mode: offline() },\n' : ''}	compatibilityDate: '2026-07-04',
	modules: ['c15t/vue'],
});
`,
	};
	if (options.scripts.length) {
		files['app/app.config.ts'] = `${sortImports(scriptImports(options.scripts))}

export default defineAppConfig({
	c15t: {
${scriptsProperty(options.scripts, '\t\t')}	},
});
`;
	}
	return files;
};

const vueFiles = (options: BoilerplateOptions): Record<string, string> => {
	const mode = options.mode === 'offline' ? 'offline' : 'manifest';
	const build = buildOptions(options);
	return {
		...envFile(BACKEND_URL_ENV.vite, options),
		'src/App.vue': `<script setup lang="ts">
import { ConsentDialogLink, ConsentRoot } from 'c15t/vue/vue-plugin';
</script>

<template>
	<ConsentRoot />
	<main>
		<h1>c15t with Vue</h1>
		<p>${options.scripts.includes('posthog') ? 'PostHog loads after you allow measurement.' : 'Your app goes here.'}</p>
	</main>
	<footer>
		<ConsentDialogLink>Privacy settings</ConsentDialogLink>
	</footer>
</template>
`,
		'src/main.ts': `${sortImports([
			...scriptImports(options.scripts),
			`import { c15tVue, ${mode} } from 'c15t/vue/vue-plugin';`,
			"import { createApp } from 'vue';",
		])}

import App from './App.vue';

createApp(App)
	.use(c15tVue, {
		mode: ${mode}(),
${scriptsProperty(options.scripts, '\t\t')}	})
	.mount('#app');
`,
		'vite.config.ts': `import vue from '@vitejs/plugin-vue';
import { consentManifest } from 'c15t/vue/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [vue(), consentManifest(${build})],
});
`,
	};
};

/**
 * Generate the Nuxt quickstart (`nuxt.config.ts`, `app/app.vue` and, with
 * vendors, `app/app.config.ts`) or the Vue with Vite quickstart
 * (`vite.config.ts`, `src/main.ts` and `src/App.vue`).
 * @param options Framework, mode and vendor selections.
 * @returns Files relative to the project root.
 */
export const generateVueBoilerplate = (
	options: BoilerplateOptions
): BoilerplateTemplate => {
	const nuxt = options.framework === 'nuxt';
	return {
		dependencies: ['c15t', ...integrationDependencies(options)],
		files: nuxt ? nuxtFiles(options) : vueFiles(options),
		instructions: [
			nuxt
				? 'The c15t/vue module registers ConsentRoot and ConsentDialogLink and adds a consent route at /api/c15t. Keep any other modules when you merge nuxt.config.ts.'
				: 'src/App.vue shows where ConsentRoot and ConsentDialogLink go. Move them into your own root component if you keep it.',
			...vendorInstruction(options, nuxt ? 'app/app.config.ts' : 'src/main.ts'),
			...offlineInstruction(options),
		],
		merge: {},
	};
};
