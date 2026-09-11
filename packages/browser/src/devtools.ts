/**
 * `@c15t/browser/devtools` — the c15t DevTools panel for the script-tag
 * client, the way `@c15t/react/devtools` mounts it for a React provider.
 *
 * The panel inspects consents, scripts, policy and events, and its
 * Location tab changes country, region, language and GPC and re-runs
 * init, so a geo-keyed policy can be tried without spoofing headers.
 *
 * @example
 * ```ts
 * import { init } from '@c15t/browser';
 * import { mountDevTools } from '@c15t/browser/devtools';
 *
 * const client = init({ backendURL: 'https://your-instance.c15t.dev' });
 * if (import.meta.env.DEV) {
 *   mountDevTools(client, { defaultOpen: true, defaultTab: 'location' });
 * }
 * ```
 */

import { createDevTools } from '@c15t/dev-tools';
import type { DevToolsInstance, DevToolsOptions } from '@c15t/dev-tools';

import type { ConsentClient } from './types';

/** Presentation options; the kernel and categories come from the client. */
export type BrowserDevToolsOptions = Omit<
	DevToolsOptions,
	'getConsentCategories' | 'kernel'
>;

/**
 * Mount the DevTools panel against a client.
 *
 * @param client - The page's client.
 * @param options - Panel placement and initial state.
 * @returns The panel; call `destroy()` to remove it.
 */
export const mountDevTools = function mountDevTools(
	client: ConsentClient,
	options: BrowserDevToolsOptions = {}
): DevToolsInstance {
	return createDevTools({
		...options,
		clearRecords: options.clearRecords ?? client.runtime.clearRecords,
		getConsentCategories: () => client.consentCategories,
		getPresentation:
			options.getPresentation ?? (() => client.options.presentation),
		kernel: client.kernel,
	});
};

export type {
	DevToolsActions,
	DevToolsInstance,
	DevToolsPosition,
	DevToolsTab,
} from '@c15t/dev-tools';
