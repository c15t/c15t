import type { ConsentRuntime } from '@c15t/core/runtime';
// oxlint-disable oxc/no-barrel-file -- Public framework entry point intentionally re-exports the supported API.
import { getCurrentInstance } from 'vue';
import type { App, Plugin } from 'vue';

import { applyColorScheme } from './runtime/color-scheme';
import { consentConfigKey } from './runtime/composables/config';
import {
	createVueConsentKernelContext,
	provideVueConsentContext,
} from './runtime/kernel';
import type { RuntimeConsentConfig } from './runtime/kernel';
import { mountTokensStyle } from './runtime/theme-tokens';

export type { AllConsentNames, ClearOnRevocationConfig } from '@c15t/core';
export type * from '@c15t/schema/config';
export { defineTheme, type Theme } from '@c15t/ui/theme';
export * from './runtime/composables';
export type {
	ConsentConfig,
	ConsentConfig as VueConsentConfig,
} from './runtime/config';
export type {
	RuntimeConsentConfig,
	UseNetworkBlockerOptions,
} from './runtime/kernel';
export {
	generateTokensCSS,
	type TokensCSSOptions,
} from './runtime/theme-tokens';

/**
 * Options accepted by the {@link c15tVue} plugin: the consent config plus
 * the browser modules the plugin starts on mount (`scripts`,
 * `networkBlocker`, `iframeBlocker`, `gpp`, `storageConfig`, `nonce`).
 */
export type C15tVuePluginOptions = Partial<RuntimeConsentConfig> & {
	/**
	 * A runtime this app should render instead of building its own kernel.
	 *
	 * Hosts without a single component tree — an Astro page whose islands
	 * cannot see each other, a SvelteKit layout — create one runtime with
	 * `createConsentRuntime()` and hand it to whatever renders. The plugin
	 * then neither starts nor disposes it, and mounts none of the modules
	 * the runtime already owns.
	 *
	 * @example
	 * ```ts
	 * import { createApp } from 'vue';
	 * import { c15tVue } from '@c15t/vue/vue-plugin';
	 *
	 * createApp(Dialog).use(c15tVue, { runtime }).mount(target);
	 * ```
	 */
	runtime?: ConsentRuntime;
};

/**
 * Plain Vue has no Nuxt server to host the init route that server manifest
 * mode calls. A `manifestURL` without an explicit `manifest` mode therefore
 * means the browser fetches and resolves that manifest itself.
 */
const resolvePlainVueOptions = function resolvePlainVueOptions(
	options: C15tVuePluginOptions | undefined
): C15tVuePluginOptions | undefined {
	if (options?.manifestURL && options.manifest === undefined) {
		return { ...options, manifest: 'client' };
	}
	// Client mode without a snapshot, as a dev build that could not fetch
	// one generates, reads the backend's own `/manifest`. The same-origin
	// default route only exists in Nuxt.
	if (
		options?.manifest === 'client' &&
		!options.manifestSnapshot &&
		!options.manifestURL
	) {
		if (options.backendURL) {
			return {
				...options,
				manifestURL: `${options.backendURL.replace(/\/+$/u, '')}/manifest`,
			};
		}
		console.warn(
			"[c15t] c15tVue: `manifest: 'client'` has no `manifestSnapshot`, `manifestURL` or `backendURL`, so it requests /api/c15t/manifest on this origin. Pass `backendURL`, for example from import.meta.env.VITE_C15T_BACKEND_URL."
		);
	}
	return options;
};

export const c15tVue: Plugin<[C15tVuePluginOptions?]> = {
	install(app: App, pluginOptions?: C15tVuePluginOptions) {
		const options = resolvePlainVueOptions(pluginOptions);
		if (options) {
			app.provide(consentConfigKey, options);
		}

		const { runtime, ...rest } = options ?? {};
		const config = rest as RuntimeConsentConfig;
		// One runtime per app, shared through `provide`/`inject`.
		const context = createVueConsentKernelContext({ config, runtime });
		provideVueConsentContext(app, context);
		// Tokens and the color scheme apply from install, before the first
		// render, so every surface is styled whether or not a ConsentRoot
		// mounts. A borrowed runtime's host renders its own theme and owns
		// the `c15t-dark` class.
		const removeTokensStyle = runtime
			? () => undefined
			: mountTokensStyle(config);
		const releaseColorScheme = runtime
			? () => undefined
			: applyColorScheme(config.colorScheme);
		app.mixin({
			mounted() {
				// The app may hydrate server markup, so the runtime starts once
				// the root has mounted. Exposed roots have a different public
				// proxy from lifecycle `this`.
				if (getCurrentInstance()?.parent === null) {
					context.start();
				}
			},
		});
		// `app.onUnmount` is Vue 3.5+. On older runtimes skip cleanup
		// registration rather than throwing during plugin install.
		if (typeof app.onUnmount === 'function') {
			app.onUnmount(() => {
				context.dispose();
				removeTokensStyle();
				releaseColorScheme();
			});
		}
	},
};
