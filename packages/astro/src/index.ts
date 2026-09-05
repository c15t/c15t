/**
 * `@c15t/astro` — consent management for Astro.
 *
 * The banner is a server-rendered `.astro` component with no framework
 * JavaScript; the preference centre and the IAB dialog are Svelte islands
 * mounted only when someone opens them; and because Astro islands never
 * share a component tree, the kernel is a page-level singleton created by
 * the script this integration injects rather than a provider.
 *
 * ```js
 * // astro.config.mjs
 * import { defineConfig } from 'astro/config';
 * import svelte from '@astrojs/svelte';
 * import c15t, { hosted } from '@c15t/astro';
 *
 * export default defineConfig({
 *   output: 'server',
 *   integrations: [svelte(), c15t({ mode: hosted({ url: '/api/c15t' }) })],
 * });
 * ```
 */

export { c15t, c15t as default, resolveOptions } from './integration';
export { createConsentMiddleware } from './middleware-handler';
export type { ConsentMiddlewareOptions } from './middleware-handler';
export {
	hostedMode as hosted,
	manifestMode as manifest,
	offlineMode as offline,
	resolveTransportFactory,
	custom,
} from './mode';
export type { ManifestClientEndpoints } from './mode';
export type {
	C15tAstroOptions,
	C15tClientOptionsExtension,
	C15tEndpointOptions,
	C15tHostedDescriptor,
	C15tI18nOptions,
	C15tIABOptions,
	C15tLocals,
	C15tManifestDescriptor,
	C15tMiddlewareOptions,
	C15tModeDescriptor,
	C15tOfflineDescriptor,
	C15tResolvedOptions,
	C15tUIAdapterName,
} from './types';
export type {
	ConsentDialogAdapter,
	ConsentDialogContext,
	ConsentDialogHandle,
	ConsentDialogKind,
	ConsentDialogSurfaceLoader,
} from './ui/adapter';
export { registerDialogAdapter, registerDialogSurface } from './ui/adapter';
export type { ConsentRuntime, ConsentRuntimeOptions } from '@c15t/core/runtime';

// Re-exported so an app can stay inside `@c15t/astro` for the common types.
export type {
	AllConsentNames,
	ConsentSnapshot,
	ConsentState,
	KernelConfig,
	LegalLinks,
	PolicyConfig,
	Script,
	StorageConfig,
} from '@c15t/core';
export { policyPackPresets } from '@c15t/core';
export type { Theme } from '@c15t/ui/theme';
