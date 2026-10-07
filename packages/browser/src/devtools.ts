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

import type { DevToolsInstance } from '@c15t/dev-tools';
import { publishDevToolsLauncher } from '@c15t/ui/utils/devtools-launcher';

import { createBrowserDevTools } from './devtools-mount';
import type { BrowserDevToolsOptions } from './devtools-mount';
import type { ConsentClient } from './types';

export type { BrowserDevToolsOptions } from './devtools-mount';

/**
 * Mount the DevTools panel against a client.
 *
 * When the client's stock UI shows the floating trigger, the trigger
 * carries the DevTools button and the panel opens beside it; the panel's
 * own launcher returns while the trigger is hidden.
 *
 * @param client - The page's client.
 * @param options - Panel placement and initial state.
 * @returns The panel; call `destroy()` to remove it.
 */
export const mountDevTools = function mountDevTools(
	client: ConsentClient,
	options: BrowserDevToolsOptions = {}
): DevToolsInstance {
	return createBrowserDevTools(client, options, publishDevToolsLauncher);
};

export type {
	DevToolsActions,
	DevToolsInstance,
	DevToolsPosition,
	DevToolsTab,
} from '@c15t/dev-tools';
