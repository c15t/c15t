import type { Script } from 'c15t';
import { resolveManifest } from '../../resolve';
import { type VendorManifest, vendorManifestContract } from '../../types';
import { resolveScriptUrl, trimToUndefined } from '../_shared/script-url';

const DEFAULT_HIGHTOUCH_SCRIPT_URL =
	'https://cdn.hightouch-events.com/browser/release/v1-latest/events.min.js';

export const HIGHTOUCH_QUEUE_METHODS = [
	'trackSubmit',
	'trackClick',
	'trackLink',
	'trackForm',
	'pageview',
	'identify',
	'reset',
	'group',
	'track',
	'ready',
	'alias',
	'debug',
	'page',
	'once',
	'off',
	'on',
	'addSourceMiddleware',
	'addIntegrationMiddleware',
	'setAnonymousId',
	'addDestinationMiddleware',
	'load',
] as const;

/**
 * Public Hightouch Events browser API exposed on `window.htevents`.
 *
 * The official browser snippet starts as an array-backed queue and the loaded
 * SDK replaces it with an initialized runtime object. Use this interface for
 * calls made after consent has allowed the SDK to load.
 *
 * @example
 * ```ts
 * window.htevents?.track('Signup Completed', { plan: 'pro' });
 * ```
 */
export interface HightouchApi {
	/**
	 * Tracks a form submission.
	 *
	 * @param form - Form element, selector, or vendor-supported form target.
	 * @param event - Event name to record.
	 * @param properties - Optional event properties payload.
	 * @returns The Hightouch runtime or a promise-like value from the SDK.
	 */
	trackSubmit: (
		form: unknown,
		event: string,
		properties?: Record<string, unknown>
	) => unknown;
	/**
	 * Tracks a click interaction.
	 *
	 * @param element - Element, selector, or vendor-supported click target.
	 * @param event - Event name to record.
	 * @param properties - Optional event properties payload.
	 * @returns The Hightouch runtime or a promise-like value from the SDK.
	 */
	trackClick: (
		element: unknown,
		event: string,
		properties?: Record<string, unknown>
	) => unknown;
	/**
	 * Tracks link clicks before navigation.
	 *
	 * @param link - Link element, selector, or vendor-supported link target.
	 * @param event - Event name to record.
	 * @param properties - Optional event properties payload.
	 * @returns The Hightouch runtime or a promise-like value from the SDK.
	 */
	trackLink: (
		link: unknown,
		event: string,
		properties?: Record<string, unknown>
	) => unknown;
	/**
	 * Tracks form submissions with form-specific semantics.
	 *
	 * @param form - Form element, selector, or vendor-supported form target.
	 * @param event - Event name to record.
	 * @param properties - Optional event properties payload.
	 * @returns The Hightouch runtime or a promise-like value from the SDK.
	 */
	trackForm: (
		form: unknown,
		event: string,
		properties?: Record<string, unknown>
	) => unknown;
	/**
	 * Tracks a classic pageview event.
	 *
	 * @param url - Optional URL override.
	 * @returns The Hightouch runtime or a promise-like value from the SDK.
	 */
	pageview: (url?: string) => unknown;
	/**
	 * Identifies a user and associates traits with that identity.
	 *
	 * @param userId - Stable user identifier.
	 * @param traits - Optional trait map associated with the user.
	 * @param context - Optional event context overrides.
	 * @param callback - Optional callback after processing.
	 * @returns The Hightouch runtime or a promise-like value from the SDK.
	 */
	identify: (
		userId: string,
		traits?: Record<string, unknown>,
		context?: Record<string, unknown>,
		callback?: () => void
	) => unknown;
	/**
	 * Clears the current user identity state.
	 *
	 * @returns The Hightouch runtime or a promise-like value from the SDK.
	 */
	reset: () => unknown;
	/**
	 * Associates the current user with a group or account.
	 *
	 * @param groupId - Group or account identifier.
	 * @param traits - Optional group trait map.
	 * @param context - Optional event context overrides.
	 * @param callback - Optional callback after processing.
	 * @returns The Hightouch runtime or a promise-like value from the SDK.
	 */
	group: (
		groupId: string,
		traits?: Record<string, unknown>,
		context?: Record<string, unknown>,
		callback?: () => void
	) => unknown;
	/**
	 * Tracks a named event.
	 *
	 * @param event - Event name to record.
	 * @param properties - Optional event properties payload.
	 * @param context - Optional event context overrides.
	 * @param callback - Optional callback after processing.
	 * @returns The Hightouch runtime or a promise-like value from the SDK.
	 */
	track: (
		event: string,
		properties?: Record<string, unknown>,
		context?: Record<string, unknown>,
		callback?: () => void
	) => unknown;
	/**
	 * Registers a callback that fires when the SDK is ready.
	 *
	 * @param callback - Function to run once the SDK is ready.
	 * @returns The Hightouch runtime or a promise-like value from the SDK.
	 */
	ready: (callback: () => void) => unknown;
	/**
	 * Aliases one user identifier to another.
	 *
	 * @param userId - New canonical user identifier.
	 * @param previousId - Optional previous identifier.
	 * @param context - Optional event context overrides.
	 * @param callback - Optional callback after processing.
	 * @returns The Hightouch runtime or a promise-like value from the SDK.
	 */
	alias: (
		userId: string,
		previousId?: string,
		context?: Record<string, unknown>,
		callback?: () => void
	) => unknown;
	/**
	 * Enables or disables debug logging in the SDK.
	 *
	 * @param enabled - Whether debug logging should be enabled.
	 * @returns The Hightouch runtime or a promise-like value from the SDK.
	 */
	debug: (enabled?: boolean) => unknown;
	/**
	 * Tracks a page view with optional category, name, properties, and context.
	 *
	 * @param category - Optional page category or page name.
	 * @param name - Optional page name or properties payload.
	 * @param properties - Optional page metadata payload.
	 * @param context - Optional event context overrides.
	 * @param callback - Optional callback after processing.
	 * @returns The Hightouch runtime or a promise-like value from the SDK.
	 */
	page: (
		category?: string,
		name?: string | Record<string, unknown>,
		properties?: Record<string, unknown>,
		context?: Record<string, unknown>,
		callback?: () => void
	) => unknown;
	/**
	 * Registers a one-time event listener on the SDK emitter.
	 *
	 * @param event - Event name to listen for.
	 * @param callback - Listener callback.
	 * @returns The Hightouch runtime or a promise-like value from the SDK.
	 */
	once: (event: string, callback: (...args: unknown[]) => void) => unknown;
	/**
	 * Removes an SDK event listener.
	 *
	 * @param event - Event name to stop listening for.
	 * @param callback - Listener callback to remove.
	 * @returns The Hightouch runtime or a promise-like value from the SDK.
	 */
	off: (event: string, callback?: (...args: unknown[]) => void) => unknown;
	/**
	 * Registers an SDK event listener.
	 *
	 * @param event - Event name to listen for.
	 * @param callback - Listener callback.
	 * @returns The Hightouch runtime or a promise-like value from the SDK.
	 */
	on: (event: string, callback: (...args: unknown[]) => void) => unknown;
	/**
	 * Adds source middleware before events are dispatched.
	 *
	 * @param middleware - Middleware function or vendor-supported middleware.
	 * @returns The Hightouch runtime or a promise-like value from the SDK.
	 */
	addSourceMiddleware: (middleware: unknown) => unknown;
	/**
	 * Adds integration middleware for destination-specific event transforms.
	 *
	 * @param integration - Integration name.
	 * @param middleware - Middleware function or vendor-supported middleware.
	 * @returns The Hightouch runtime or a promise-like value from the SDK.
	 */
	addIntegrationMiddleware: (
		integration: string,
		middleware: unknown
	) => unknown;
	/**
	 * Sets the anonymous ID used for subsequent events.
	 *
	 * @param anonymousId - Anonymous identifier to assign.
	 * @returns The Hightouch runtime or a promise-like value from the SDK.
	 */
	setAnonymousId: (anonymousId: string) => unknown;
	/**
	 * Adds destination middleware for event delivery.
	 *
	 * @param destination - Destination name.
	 * @param middleware - Middleware function or vendor-supported middleware.
	 * @returns The Hightouch runtime or a promise-like value from the SDK.
	 */
	addDestinationMiddleware: (
		destination: string,
		middleware: unknown
	) => unknown;
}

declare global {
	interface Window {
		htevents?: HightouchApi;
	}
}

/**
 * Hightouch Events vendor manifest.
 *
 * Creates Hightouch's analytics.js-style `window.htevents` queue, records the
 * write key/load options expected by the standalone loader, queues the
 * `load()` and optional `page()` calls, then lets c15t own the script element.
 */
export const hightouchManifest = {
	...vendorManifestContract,
	vendor: 'hightouch',
	category: 'measurement',
	bootstrap: [
		{
			type: 'setGlobal',
			name: 'htevents',
			value: [],
			ifUndefined: true,
		},
		{
			type: 'defineQueueMethods',
			target: 'htevents',
			methods: [...HIGHTOUCH_QUEUE_METHODS],
		},
		{
			type: 'setGlobalPath',
			path: ['htevents', '_writeKey'],
			value: '{{writeKey}}',
		},
		{
			type: 'setGlobalPath',
			path: ['htevents', '_loadOptions'],
			value: '{{loadOptions}}',
		},
	],
	install: [
		{
			type: 'callGlobal',
			global: 'htevents',
			method: 'load',
			args: ['{{writeKey}}', '{{loadOptions}}'],
		},
		{
			type: 'callGlobal',
			global: 'htevents',
			method: 'page',
		},
		{
			type: 'loadScript',
			src: '{{scriptUrl}}',
			async: true,
		},
	],
} as const satisfies VendorManifest;

export interface HightouchOptions {
	/**
	 * Hightouch Events write key from your Event Source.
	 */
	writeKey: string;

	/**
	 * Optional Hightouch Events API host.
	 *
	 * Hightouch's browser SDK defaults to `us-east-1.hightouch-events.com`.
	 * Pass this only when your Event Source uses another region or a first-party
	 * tracking host.
	 */
	apiHost?: string;

	/**
	 * Queue the initial `htevents.page()` call during setup.
	 *
	 * @default true
	 */
	trackPageView?: boolean;

	/**
	 * Optional full loader URL override.
	 *
	 * @default 'https://cdn.hightouch-events.com/browser/release/v1-latest/events.min.js'
	 */
	scriptUrl?: string;
}

function validateWriteKey(writeKey: unknown): string {
	const normalized = typeof writeKey === 'string' ? writeKey.trim() : '';

	if (normalized.length === 0) {
		throw new Error('hightouch: missing or invalid writeKey');
	}

	return normalized;
}

function normalizeApiHost(apiHost: string | undefined): string | undefined {
	return trimToUndefined(apiHost);
}

/**
 * Creates a Hightouch Events browser SDK script.
 *
 * @see https://hightouch.com/docs/events/sdks/browser
 *
 * @param options - The options for the Hightouch script.
 * @returns The Hightouch script configuration.
 * @throws {Error} When `writeKey` is missing or only whitespace.
 *
 * @remarks
 * Hightouch Events collects customer behavior and sends it to the configured
 * Event Source. c15t gates the browser SDK on `measurement` consent and does
 * not allowlist collection endpoints in live probes beyond the CDN loader.
 *
 * @example
 * ```ts
 * import { hightouch } from '@c15t/scripts/hightouch';
 *
 * hightouch({
 * 	writeKey: 'WRITE_KEY',
 * 	apiHost: 'us-east-1.hightouch-events.com',
 * });
 * ```
 */
export function hightouch({
	writeKey,
	apiHost,
	trackPageView = true,
	scriptUrl,
}: HightouchOptions): Script {
	const normalizedWriteKey = validateWriteKey(writeKey);
	const loadOptions = {
		apiHost: normalizeApiHost(apiHost),
	};

	let manifest: VendorManifest = hightouchManifest;

	if (!trackPageView) {
		manifest = {
			...hightouchManifest,
			install: hightouchManifest.install.filter(
				(step) =>
					!(
						step.type === 'callGlobal' &&
						step.global === 'htevents' &&
						step.method === 'page'
					)
			),
		} satisfies VendorManifest;
	}

	return resolveManifest(manifest, {
		loadOptions,
		writeKey: normalizedWriteKey,
		scriptUrl: resolveScriptUrl(
			trimToUndefined(scriptUrl),
			DEFAULT_HIGHTOUCH_SCRIPT_URL
		),
	});
}
