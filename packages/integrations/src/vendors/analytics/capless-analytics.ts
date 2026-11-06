import type { Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId } from '../_shared/required-id';
import { resolveScriptUrl } from '../_shared/script-url';

/** Commands accepted by `window.capless`. */
export type CaplessCommand =
	| 'identify'
	| 'optin'
	| 'optout'
	| 'page'
	| 'reset'
	| 'track';

declare global {
	interface Window {
		/**
		 * Capless command function. Before `c.js` runs it is a stub that queues
		 * calls in `q`; the tracker replaces it and replays the queue.
		 */
		capless?: ((command: CaplessCommand, ...args: unknown[]) => void) & {
			q?: unknown[][];
		};
	}
}

const DEFAULT_CAPLESS_SCRIPT_URL = 'https://c.capless.sh/c.js';

/**
 * Capless vendor manifest.
 *
 * `c.js` reads its project key from the `data-key` attribute of its own
 * script element and sends events to the origin it was served from. It keeps
 * an anonymous visitor ID in localStorage, so it waits for `measurement`
 * consent. Capless stores `optout` as a localStorage flag that later page
 * loads honor, so every granted load queues `optin` before the tracker starts.
 */
export const caplessAnalyticsManifest = {
	...vendorManifestContract,
	category: 'measurement',
	install: [
		{
			ifUndefined: true,
			name: 'capless',
			queue: {
				property: 'q',
			},
			queueFormat: 'array',
			type: 'defineStubFunction',
		},
		{
			async: true,
			attributes: {
				'data-key': '{{projectKey}}',
			},
			src: '{{scriptUrl}}',
			type: 'loadScript',
		},
	],
	onBeforeLoadGranted: [
		{
			args: ['optin'],
			global: 'capless',
			type: 'callGlobal',
		},
	],
	onConsentDenied: [
		{
			args: ['optout'],
			global: 'capless',
			type: 'callGlobal',
		},
	],
	vendor: 'capless-analytics',
	vendorDetails: {
		homepageUrl: 'https://analytics.capless.sh/',
		name: 'Capless',
		privacyPolicyUrl: 'https://analytics.capless.sh/privacy',
	},
} as const satisfies VendorManifest;

export interface CaplessAnalyticsOptions {
	/**
	 * Public, write-only project key from Capless, starting with `cs_`.
	 */
	projectKey: string;

	/**
	 * Custom loader URL. `c.js` sends events and loads session replay from the
	 * origin of this URL, so a proxy must serve Capless's `/e` and `/r.js` paths
	 * as well.
	 * @default 'https://c.capless.sh/c.js'
	 */
	scriptUrl?: string;
}

/**
 * Creates a Capless analytics script that waits for measurement consent.
 *
 * The helper defines a `window.capless` queue stub only after consent, so
 * `capless('track', ...)` and `capless('identify', ...)` calls made before
 * `c.js` finishes loading are replayed. Revoking consent calls
 * `capless('optout')`, which stops sending events and replay data on the
 * current page. Every granted load, including a regrant on the same page,
 * calls `capless('optin')` before anything else. Capless cannot stop a
 * running replay recorder, which keeps buffering pointer movement after
 * `optout`, so keep c15t's default reload on revocation.
 *
 * @see https://analytics.capless.sh/docs/web-sdk
 *
 * @param options - Capless project key and optional loader URL.
 * @returns The consent-gated Capless script.
 * @remarks When `projectKey` is missing or blank, the helper logs
 *   `caplessAnalytics: missing or invalid projectKey` with `console.error`
 *   and returns a script that never loads.
 *
 * @example
 * ```ts
 * import { caplessAnalytics } from '@c15t/integrations/capless-analytics';
 *
 * caplessAnalytics({ projectKey: 'cs_your_project_key' });
 * ```
 */
export const caplessAnalytics = function caplessAnalytics(
	options: CaplessAnalyticsOptions
): Script {
	const projectKey = readId(options?.projectKey);
	if (projectKey === undefined) {
		return skipMissingId('caplessAnalytics', 'projectKey', {
			category: 'measurement',
			manifest: caplessAnalyticsManifest,
		});
	}

	return resolveManifest(caplessAnalyticsManifest, {
		projectKey,
		scriptUrl: resolveScriptUrl(options.scriptUrl, DEFAULT_CAPLESS_SCRIPT_URL),
	});
};
