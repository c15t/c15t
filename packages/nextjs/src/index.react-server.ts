/**
 * `@c15t/nextjs` under the `react-server` condition: what a Server
 * Component, route handler or `c15t.config.ts` gets from `c15t/next`.
 *
 * The full entry re-exports all of `@c15t/react`, whose hooks import
 * client-only React APIs that webpack rejects in the server graph. Here
 * each component comes from a `'use client'` module, so the server graph
 * holds client references and never runs component code. Hooks are not
 * here: they only run in Client Components, which get the full entry.
 */
export {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogLink,
	ConsentRoot,
} from './client-components';
export type { ConsentRootProps } from './root';
export type { ConsentClientOptions, ConsentState } from './types';
export type { ConsentConfig } from './config';
export { defineConsentConfig } from './config';
export type {
	ConsentMode,
	HostedMode,
	HostedModeOptions,
	ManifestMode,
	ManifestModeOptions,
	OfflineMode,
	OfflineModeOptions,
} from '@c15t/core/modes';
export { hosted, manifest, offline } from '@c15t/core/modes';
// More components, each its own client module, and the theme helpers,
// which render on the server.
export {
	ConsentDialogTrigger,
	ConsentDialogTriggerToolbar,
} from '@c15t/react/components/consent-dialog-trigger';
export { ConsentGate } from '@c15t/react/components/consent-gate';
export { ConsentWidget } from '@c15t/react/consent-widget';
export { ConsentDraftProvider } from '@c15t/react/draft';
export { ConsentProvider } from '@c15t/react/provider';
export { ConsentTheme, defineTheme } from '@c15t/react/theme';
