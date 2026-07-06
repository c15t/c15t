import type { Script } from 'c15t';
import { resolveManifest } from '../../resolve';
import { type VendorManifest, vendorManifestContract } from '../../types';
import { resolveScriptUrl, trimToUndefined } from '../_shared/script-url';

const DEFAULT_RUDDERSTACK_SCRIPT_URL =
	'https://cdn.rudderlabs.com/v3/modern/rsa.min.js';

export const RUDDERSTACK_QUEUE_METHODS = [
	'setDefaultInstanceKey',
	'load',
	'ready',
	'page',
	'track',
	'identify',
	'alias',
	'group',
	'reset',
	'setAnonymousId',
	'startSession',
	'endSession',
	'consent',
	'addCustomIntegration',
] as const;

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

/**
 * JSON-serializable object passed to RudderStack's `load()` API.
 */
export interface JsonObject {
	[key: string]: JsonValue;
}

/**
 * RudderStack JavaScript SDK `load()` options.
 *
 * The options are interpolated into a script manifest and passed as the third
 * `rudderanalytics.load(writeKey, dataPlaneUrl, options)` argument. Keep values
 * JSON-serializable: plain objects, arrays, strings, numbers, booleans, and
 * `null`. Functions, class instances, Dates, Maps, Sets, and symbols are not
 * supported.
 */
export type RudderStackLoadOptions = JsonObject;

/**
 * Public RudderStack JavaScript SDK API exposed on `window.rudderanalytics`.
 *
 * The official v3 CDN snippet starts as an array-backed queue and the loaded
 * SDK replaces it with an initialized runtime object. Use this interface for
 * calls made after consent has allowed the SDK to load.
 *
 * @example
 * ```ts
 * window.rudderanalytics?.track('Signup Completed', { plan: 'pro' });
 * ```
 */
export interface RudderStackApi {
	/**
	 * Sets the default instance key for multi-instance setups.
	 *
	 * @param key - Instance key to use for subsequent calls.
	 * @returns The RudderStack runtime or a promise-like value from the SDK.
	 */
	setDefaultInstanceKey: (key: string) => unknown;
	/**
	 * Loads and initializes the RudderStack JavaScript SDK.
	 *
	 * @param writeKey - Source write key from RudderStack.
	 * @param dataPlaneUrl - HTTPS data plane URL for the source.
	 * @param options - Optional JSON-serializable load options.
	 * @returns The RudderStack runtime or a promise-like value from the SDK.
	 */
	load: (
		writeKey: string,
		dataPlaneUrl: string,
		options?: RudderStackLoadOptions
	) => unknown;
	/**
	 * Registers a callback that fires when the SDK is ready.
	 *
	 * @param callback - Function to run once the SDK is ready.
	 * @returns The RudderStack runtime or a promise-like value from the SDK.
	 */
	ready: (callback: () => void) => unknown;
	/**
	 * Tracks a page view with optional category, name, properties, and options.
	 *
	 * @param category - Optional page category.
	 * @param name - Optional page name.
	 * @param properties - Optional page metadata payload.
	 * @param options - Optional event context or integrations options.
	 * @param callback - Optional callback after processing.
	 * @returns The RudderStack runtime or a promise-like value from the SDK.
	 */
	page: (
		category?: string,
		name?: string,
		properties?: Record<string, unknown>,
		options?: Record<string, unknown>,
		callback?: () => void
	) => unknown;
	/**
	 * Tracks a named event.
	 *
	 * @param event - Event name to record.
	 * @param properties - Optional event properties payload.
	 * @param options - Optional event context or integrations options.
	 * @param callback - Optional callback after processing.
	 * @returns The RudderStack runtime or a promise-like value from the SDK.
	 */
	track: (
		event: string,
		properties?: Record<string, unknown>,
		options?: Record<string, unknown>,
		callback?: () => void
	) => unknown;
	/**
	 * Identifies a user and associates traits with that identity.
	 *
	 * @param userId - Stable user identifier.
	 * @param traits - Optional trait map associated with the user.
	 * @param options - Optional event context or integrations options.
	 * @param callback - Optional callback after processing.
	 * @returns The RudderStack runtime or a promise-like value from the SDK.
	 */
	identify: (
		userId: string,
		traits?: Record<string, unknown>,
		options?: Record<string, unknown>,
		callback?: () => void
	) => unknown;
	/**
	 * Aliases one user identifier to another.
	 *
	 * @param userId - New canonical user identifier.
	 * @param previousId - Optional previous identifier.
	 * @param options - Optional event context or integrations options.
	 * @param callback - Optional callback after processing.
	 * @returns The RudderStack runtime or a promise-like value from the SDK.
	 */
	alias: (
		userId: string,
		previousId?: string,
		options?: Record<string, unknown>,
		callback?: () => void
	) => unknown;
	/**
	 * Associates the current user with a group or account.
	 *
	 * @param groupId - Group or account identifier.
	 * @param traits - Optional group trait map.
	 * @param options - Optional event context or integrations options.
	 * @param callback - Optional callback after processing.
	 * @returns The RudderStack runtime or a promise-like value from the SDK.
	 */
	group: (
		groupId: string,
		traits?: Record<string, unknown>,
		options?: Record<string, unknown>,
		callback?: () => void
	) => unknown;
	/**
	 * Clears the current user identity state.
	 *
	 * @returns The RudderStack runtime or a promise-like value from the SDK.
	 */
	reset: () => unknown;
	/**
	 * Sets the anonymous ID used for subsequent events.
	 *
	 * @param anonymousId - Anonymous identifier to assign.
	 * @returns The RudderStack runtime or a promise-like value from the SDK.
	 */
	setAnonymousId: (anonymousId: string) => unknown;
	/**
	 * Starts a session with an optional session identifier.
	 *
	 * @param sessionId - Optional session identifier.
	 * @returns The RudderStack runtime or a promise-like value from the SDK.
	 */
	startSession: (sessionId?: string) => unknown;
	/**
	 * Ends the current session.
	 *
	 * @returns The RudderStack runtime or a promise-like value from the SDK.
	 */
	endSession: () => unknown;
	/**
	 * Transitions the SDK from pre-consent to post-consent behavior.
	 *
	 * @param consentOptions - Vendor-supported consent options.
	 * @returns The RudderStack runtime or a promise-like value from the SDK.
	 *
	 * @remarks
	 * This API is for RudderStack's consent-management flow. It is not treated
	 * as a c15t revocation hook; c15t unloads the SDK when measurement consent
	 * is revoked.
	 */
	consent: (consentOptions?: Record<string, unknown>) => unknown;
	/**
	 * Registers a custom device-mode integration. RudderStack only accepts
	 * registrations made before `load()` completes, which is why this is part
	 * of the pre-load queue.
	 *
	 * @param name - Integration name.
	 * @param integration - Integration implementation object.
	 * @returns The RudderStack runtime or a promise-like value from the SDK.
	 */
	addCustomIntegration: (name: string, integration: unknown) => unknown;
}

declare global {
	interface Window {
		rudderanalytics?: RudderStackApi;
		rudderAnalyticsBuildType?: string;
		RudderSnippetVersion?: string;
	}
}

/**
 * RudderStack vendor manifest.
 *
 * Creates RudderStack's v3 `window.rudderanalytics` queue, marks the snippet as
 * seeded, queues the required `load()` call and optional `page()` call, then
 * lets c15t own the script element.
 */
export const rudderstackManifest = {
	...vendorManifestContract,
	vendor: 'rudderstack',
	category: 'measurement',
	bootstrap: [
		{
			type: 'setGlobal',
			name: 'rudderanalytics',
			value: [],
			ifUndefined: true,
		},
		{
			type: 'setGlobal',
			name: 'RudderSnippetVersion',
			value: '3.0.32',
		},
		{
			type: 'setGlobal',
			name: 'rudderAnalyticsBuildType',
			value: 'modern',
		},
		{
			type: 'setGlobalPath',
			path: ['rudderanalytics', 'snippetExecuted'],
			value: true,
		},
		{
			type: 'defineQueueMethods',
			target: 'rudderanalytics',
			methods: [...RUDDERSTACK_QUEUE_METHODS],
		},
	],
	install: [
		{
			type: 'callGlobal',
			global: 'rudderanalytics',
			method: 'load',
			args: ['{{writeKey}}', '{{dataPlaneUrl}}', '{{loadOptions}}'],
		},
		{
			type: 'callGlobal',
			global: 'rudderanalytics',
			method: 'page',
		},
		{
			type: 'loadScript',
			src: '{{scriptUrl}}',
			async: true,
			attributes: {
				'data-loader': 'RS_JS_SDK',
				'data-rsa-write-key': '{{writeKey}}',
			},
		},
	],
} as const satisfies VendorManifest;

export interface RudderStackOptions {
	/**
	 * RudderStack source write key.
	 */
	writeKey: string;

	/**
	 * RudderStack HTTPS data plane URL.
	 */
	dataPlaneUrl: string;

	/**
	 * Optional JSON-serializable RudderStack `load()` options.
	 *
	 * Values must be JSON-serializable because c15t resolves the manifest into
	 * script lifecycle callbacks. Do not pass functions, Dates, Maps, Sets,
	 * class instances, symbols, or other non-JSON values.
	 */
	loadOptions?: RudderStackLoadOptions;

	/**
	 * Queue the initial `rudderanalytics.page()` call during setup.
	 *
	 * @default true
	 */
	trackPageView?: boolean;

	/**
	 * Optional full loader URL override.
	 *
	 * @default 'https://cdn.rudderlabs.com/v3/modern/rsa.min.js'
	 */
	scriptUrl?: string;
}

function validateRequiredString(value: unknown, label: string): string {
	const normalized = typeof value === 'string' ? value.trim() : '';

	if (normalized.length === 0) {
		throw new Error(`rudderstack: missing or invalid ${label}`);
	}

	return normalized;
}

function validateOptionalHttpsScriptUrl(
	scriptUrl: string | undefined
): string | undefined {
	if (scriptUrl === undefined) {
		return undefined;
	}

	let parsed: URL;
	try {
		parsed = new URL(scriptUrl);
	} catch {
		throw new Error('rudderstack: scriptUrl must be a valid https URL');
	}

	if (parsed.protocol !== 'https:') {
		throw new Error('rudderstack: scriptUrl must be a valid https URL');
	}

	return scriptUrl;
}

function validateDataPlaneUrl(dataPlaneUrl: unknown): string {
	const normalized = validateRequiredString(dataPlaneUrl, 'dataPlaneUrl');
	let parsed: URL;

	try {
		parsed = new URL(normalized);
	} catch {
		throw new Error('rudderstack: dataPlaneUrl must be a valid https URL');
	}

	if (parsed.protocol !== 'https:') {
		throw new Error('rudderstack: dataPlaneUrl must be a valid https URL');
	}

	return normalized;
}

/**
 * Creates a RudderStack JavaScript SDK script.
 *
 * @see https://www.rudderstack.com/docs/sources/event-streams/sdks/rudderstack-javascript-sdk/quickstart/
 *
 * @param options - The options for the RudderStack script.
 * @returns The RudderStack script configuration.
 * @throws {Error} When `writeKey` is missing or only whitespace.
 * @throws {Error} When `dataPlaneUrl` is missing, invalid, or not HTTPS.
 *
 * @remarks
 * RudderStack collects customer behavior and sends it to destinations through
 * your configured data plane. c15t gates the browser SDK on `measurement`
 * consent and unloads it when that consent is revoked. `loadOptions` is passed
 * directly as the third `load()` argument and must be JSON-serializable.
 *
 * @example
 * ```ts
 * import { rudderstack } from '@c15t/scripts/rudderstack';
 *
 * rudderstack({
 * 	writeKey: 'WRITE_KEY',
 * 	dataPlaneUrl: 'https://example.dataplane.rudderstack.com',
 * 	loadOptions: {
 * 		useBeacon: true,
 * 	},
 * });
 * ```
 */
export function rudderstack({
	writeKey,
	dataPlaneUrl,
	loadOptions = {},
	trackPageView = true,
	scriptUrl,
}: RudderStackOptions): Script {
	const normalizedWriteKey = validateRequiredString(writeKey, 'writeKey');
	const normalizedDataPlaneUrl = validateDataPlaneUrl(dataPlaneUrl);

	let manifest: VendorManifest = rudderstackManifest;

	if (!trackPageView) {
		manifest = {
			...rudderstackManifest,
			install: rudderstackManifest.install.filter(
				(step) =>
					!(
						step.type === 'callGlobal' &&
						step.global === 'rudderanalytics' &&
						step.method === 'page'
					)
			),
		} satisfies VendorManifest;
	}

	return resolveManifest(manifest, {
		dataPlaneUrl: normalizedDataPlaneUrl,
		loadOptions,
		writeKey: normalizedWriteKey,
		scriptUrl: resolveScriptUrl(
			validateOptionalHttpsScriptUrl(trimToUndefined(scriptUrl)),
			DEFAULT_RUDDERSTACK_SCRIPT_URL
		),
	});
}
