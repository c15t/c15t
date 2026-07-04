/**
 * Canonical event/callback contract for @c15t prebuilt UI.
 *
 * Every framework binding (react, svelte, vue, solid) must emit the same
 * events with the same payload shape at the same lifecycle point. The
 * `runEventContractConformance(driver)` suite asserts against this contract.
 */

import type { ConsentStoreState } from 'c15t';

/** All public event names. Keep in sync with provider prop types across frameworks. */
export const EVENT_NAMES = [
	'onConsentChanged',
	'onConsentSet',
	'onBannerFetched',
	'onConsentBannerFetched',
	'onBeforeConsentRevocationReload',
	'onCookieAccess',
	'onError',
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

/**
 * Expected payload shape for each event. Each framework's provider is asserted
 * to invoke the callback with a payload matching the shape here. Drivers
 * produce a typed payload via ducktype against this map.
 */
export type EventPayloads = {
	onConsentChanged: {
		consent: ConsentStoreState['consents'];
		categories: readonly string[];
	};
	onConsentSet: {
		consent: ConsentStoreState['consents'];
	};
	onBannerFetched: {
		source: 'network' | 'cache' | 'ssr';
	};
	onConsentBannerFetched: {
		source: 'network' | 'cache' | 'ssr';
	};
	onBeforeConsentRevocationReload: Record<string, never>;
	onCookieAccess: {
		name: string;
		operation: 'read' | 'write' | 'delete';
	};
	onError: {
		code: string;
		message: string;
	};
};

/**
 * Lifecycle ordering contract: each pair asserts that `before` fires before
 * `after` in any framework. Matched against the recorded event log in
 * `runEventContractConformance`.
 */
export const EVENT_ORDERING: ReadonlyArray<{
	before: EventName;
	after: EventName;
}> = [
	{ before: 'onBannerFetched', after: 'onConsentChanged' },
	{ before: 'onConsentChanged', after: 'onConsentSet' },
];
