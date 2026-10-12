/**
 * `@c15t/astro` — consent management for Astro.
 *
 * The banner is a server-rendered `.astro` component with no framework
 * JavaScript; the preference centre and the IAB dialog are Svelte, React or
 * Vue islands mounted only when someone opens them; and because Astro
 * islands never share a component tree, the kernel is a page-level
 * singleton created by the script this integration injects rather than a
 * provider. The components are in `c15t/astro/components`.
 *
 * ```js
 * // astro.config.mjs, with PUBLIC_C15T_BACKEND_URL in .env
 * import svelte from '@astrojs/svelte';
 * import { defineConfig } from 'astro/config';
 * import c15t, { hosted } from 'c15t/astro';
 *
 * export default defineConfig({
 *   integrations: [svelte(), c15t({ mode: hosted() })],
 * });
 * ```
 */

export { c15t, c15t as default, resolveOptions } from './integration';
export { createConsentMiddleware } from './middleware-handler';
export type { ConsentMiddlewareOptions } from './middleware-handler';
export { hosted, manifest, offline } from './mode';
export type {
	ConsentMode,
	HostedMode,
	HostedModeOptions,
	ManifestMode,
	ManifestModeOptions,
	OfflineMode,
	OfflineModeOptions,
} from '@c15t/core/modes';
export type {
	C15tAstroOptions,
	C15tClientOptionsExtension,
	C15tColorScheme,
	C15tI18nOptions,
	C15tIABOptions,
	C15tLocals,
	C15tMiddlewareOptions,
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
	ClearOnRevocationConfig,
	ConsentSnapshot,
	ConsentState,
	KernelConfig,
	LegalLinks,
	PolicyRule,
	ResolvedVendor,
	Script,
	StorageConfig,
	Vendor,
	VendorChoice,
} from '@c15t/core';
export { policyRulePresets } from '@c15t/core';
export type { Theme } from '@c15t/ui/theme';
