/**
 * Props for the Svelte dialog island.
 *
 * The page runtime owns the kernel and every side-effecting module, so the
 * provider is handed it through `runtime` and neither starts nor disposes
 * it. Everything else it gets here is presentation: categories, legal links
 * and theme tokens the banner and dialog both read.
 */

import type { ConsentRuntime } from '@c15t/core/runtime';

import type { C15tResolvedOptions } from '../types';

/**
 * The slice of the integration options a dialog island renders with.
 *
 * Named so every framework surface can state the same shape instead of
 * widening to `Record<string, unknown>` and casting it back.
 */
export interface DialogPresentationOptions {
	consentCategories?: C15tResolvedOptions['consentCategories'];
	legalLinks?: C15tResolvedOptions['legalLinks'];
	theme?: C15tResolvedOptions['theme'];
}

/** Props handed to `ConsentManagerProvider` by the Svelte dialog surface. */
export interface DialogProviderProps {
	/** The page-level runtime. The provider borrows it, it does not own it. */
	runtime: ConsentRuntime;
	/** Presentation options forwarded to the provider. */
	options: DialogPresentationOptions;
}

/**
 * Build the provider props for a dialog island.
 *
 * @param runtime - The page runtime that owns the kernel.
 * @param options - The resolved integration options.
 * @returns Props for `ConsentManagerProvider`.
 */
export const buildProviderProps = function buildProviderProps(
	runtime: ConsentRuntime,
	options: C15tResolvedOptions
): DialogProviderProps {
	return {
		options: {
			consentCategories: options.consentCategories,
			legalLinks: options.legalLinks,
			theme: options.theme,
		},
		runtime,
	};
};
