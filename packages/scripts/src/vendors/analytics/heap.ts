import type { Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import {
	joinUrlPath,
	resolveScriptUrl,
	trimToUndefined,
} from '../_shared/script-url';

/**
 * Default Heap config-loader base URL.
 *
 * Heap's current web installation snippet loads account configuration from a
 * per-environment `heap_config.js` URL. That configuration then chain-loads the
 * versioned heap.js runtime selected for the environment.
 */
export const DEFAULT_HEAP_CONFIG_BASE_URL =
	'https://cdn.us.heap-api.com/config';

/**
 * Current heap.js v5 method stubs from Heap's official web snippet.
 *
 * These methods do not push `[method, args]` tuples into `window.heap`. They
 * push `{ name, fn }` records into `window.heapReadyCb`; each callback replays
 * the original call against the loaded `window.heap` runtime.
 */
export const HEAP_QUEUE_METHODS = [
	'init',
	'startTracking',
	'stopTracking',
	'track',
	'resetIdentity',
	'identify',
	'identifyHashed',
	'getSessionId',
	'getUserId',
	'getIdentity',
	'addUserProperties',
	'addEventProperties',
	'removeEventProperty',
	'clearEventProperties',
	'addAccountProperties',
	'addAdapter',
	'addTransformer',
	'addTransformerFn',
	'onReady',
	'addPageviewProperties',
	'removePageviewProperty',
	'clearPageviewProperties',
	'trackPageview',
] as const;

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
interface JsonRecord {
	[key: string]: JsonValue;
}

export interface HeapReadyCallback {
	/** Heap method name captured by the pre-load snippet stub. */
	name: (typeof HEAP_QUEUE_METHODS)[number];
	/** Callback invoked by heap.js after the runtime is ready. */
	fn: () => void;
}

/**
 * Minimal public heap.js API exposed on `window.heap`.
 *
 * Before the real SDK loads, c15t creates an array-backed stub with these
 * methods. The config loader calls `heap.init(envId, clientConfig,
 * serverConfig)`, and heap.js drains `window.heapReadyCb` by invoking each
 * stored callback.
 */
export interface HeapApi {
	/** Environment/app id selected for this Heap installation. */
	envId?: string;
	/** Legacy alias used by some Heap runtime paths. */
	appid?: string;
	/** Client configuration passed into `heap.load()`. */
	clientConfig?: JsonRecord;
	/** Server configuration assigned by `heap_config.js` before heap.js loads. */
	serverConfig?: Record<string, unknown>;
	/**
	 * Initializes the heap.js runtime.
	 *
	 * @param envId - Heap environment/app id.
	 * @param clientConfig - Client-side configuration options.
	 * @param serverConfig - Server-side configuration loaded by Heap.
	 * @returns Vendor-specific runtime result.
	 */
	init: (
		envId: string,
		clientConfig?: JsonRecord,
		serverConfig?: Record<string, unknown>
	) => unknown;
	/**
	 * Starts Heap autocapture and event delivery.
	 *
	 * @returns Vendor-specific runtime result.
	 */
	startTracking: () => unknown;
	/**
	 * Stops Heap tracking for the current runtime session.
	 *
	 * @returns Vendor-specific runtime result.
	 */
	stopTracking: () => unknown;
	/**
	 * Tracks a custom Heap event.
	 *
	 * @param event - Event name to record.
	 * @param properties - Optional event properties.
	 * @returns Vendor-specific runtime result.
	 */
	track: (event: string, properties?: Record<string, unknown>) => unknown;
	/**
	 * Clears the current Heap identity.
	 *
	 * @returns Vendor-specific runtime result.
	 */
	resetIdentity: () => unknown;
	/**
	 * Identifies the current user.
	 *
	 * @param identity - Stable user identity.
	 * @returns Vendor-specific runtime result.
	 */
	identify: (identity: string) => unknown;
	/**
	 * Identifies the current user with a hashed identity.
	 *
	 * @param identity - Hashed user identity.
	 * @returns Vendor-specific runtime result.
	 */
	identifyHashed: (identity: string) => unknown;
	/**
	 * Reads the current Heap session id.
	 *
	 * @returns Current session id when available.
	 */
	getSessionId: () => unknown;
	/**
	 * Reads the current Heap user id.
	 *
	 * @returns Current Heap user id when available.
	 */
	getUserId: () => unknown;
	/**
	 * Reads the current Heap identity.
	 *
	 * @returns Current identity when available.
	 */
	getIdentity: () => unknown;
	/**
	 * Adds properties to the current user.
	 *
	 * @param properties - User properties to merge.
	 * @returns Vendor-specific runtime result.
	 */
	addUserProperties: (properties: Record<string, unknown>) => unknown;
	/**
	 * Adds properties to every subsequent event.
	 *
	 * @param properties - Event properties to merge.
	 * @returns Vendor-specific runtime result.
	 */
	addEventProperties: (properties: Record<string, unknown>) => unknown;
	/**
	 * Removes a single persisted event property.
	 *
	 * @param property - Event property name to remove.
	 * @returns Vendor-specific runtime result.
	 */
	removeEventProperty: (property: string) => unknown;
	/**
	 * Clears persisted event properties.
	 *
	 * @returns Vendor-specific runtime result.
	 */
	clearEventProperties: () => unknown;
	/**
	 * Adds properties to the current account.
	 *
	 * @param properties - Account properties to merge.
	 * @returns Vendor-specific runtime result.
	 */
	addAccountProperties: (properties: Record<string, unknown>) => unknown;
	/**
	 * Adds a Heap adapter.
	 *
	 * @param adapter - Adapter implementation accepted by heap.js.
	 * @returns Vendor-specific runtime result.
	 */
	addAdapter: (adapter: unknown) => unknown;
	/**
	 * Adds a Heap event transformer.
	 *
	 * @param transformer - Transformer implementation accepted by heap.js.
	 * @returns Vendor-specific runtime result.
	 */
	addTransformer: (transformer: unknown) => unknown;
	/**
	 * Adds a Heap transformer function.
	 *
	 * @param transformer - Transformer callback accepted by heap.js.
	 * @returns Vendor-specific runtime result.
	 */
	addTransformerFn: (transformer: (...args: unknown[]) => unknown) => unknown;
	/**
	 * Registers a callback for Heap readiness.
	 *
	 * @param callback - Function to call once Heap is ready.
	 * @returns Vendor-specific runtime result.
	 */
	onReady: (callback: () => void) => unknown;
	/**
	 * Adds properties to subsequent pageview events.
	 *
	 * @param properties - Pageview properties to merge.
	 * @returns Vendor-specific runtime result.
	 */
	addPageviewProperties: (properties: Record<string, unknown>) => unknown;
	/**
	 * Removes a single persisted pageview property.
	 *
	 * @param property - Pageview property name to remove.
	 * @returns Vendor-specific runtime result.
	 */
	removePageviewProperty: (property: string) => unknown;
	/**
	 * Clears persisted pageview properties.
	 *
	 * @returns Vendor-specific runtime result.
	 */
	clearPageviewProperties: () => unknown;
	/**
	 * Tracks a pageview event.
	 *
	 * @param properties - Optional pageview properties.
	 * @returns Vendor-specific runtime result.
	 */
	trackPageview: (properties?: Record<string, unknown>) => unknown;
}

declare global {
	interface Window {
		heap?: HeapApi;
		heapReadyCb?: HeapReadyCallback[];
	}
}

/**
 * Heap vendor manifest.
 *
 * Reproduces the heap.js v5 snippet contract consumed by
 * `heap_config.js`: `window.heapReadyCb` receives `{ name, fn }` callback
 * records, `window.heap` stores `envId`/`appid` and `clientConfig`, and the
 * Heap configuration script chain-loads the versioned heap.js runtime.
 *
 * Heap does not document a browser opt-out API that can make an already loaded
 * runtime inert for c15t's purposes, so c15t gates the load on `measurement`
 * consent and unloads the script when that consent is revoked.
 */
export const heapManifest = {
	...vendorManifestContract,
	vendor: 'heap',
	category: 'measurement',
	install: [
		{
			type: 'setGlobal',
			name: 'heapReadyCb',
			value: [],
			ifUndefined: true,
		},
		{
			type: 'setGlobal',
			name: 'heap',
			value: [],
			ifUndefined: true,
		},
		{
			type: 'setGlobalPath',
			path: ['heap', 'envId'],
			value: '{{envId}}',
		},
		{
			type: 'setGlobalPath',
			path: ['heap', 'appid'],
			value: '{{envId}}',
		},
		{
			type: 'setGlobalPath',
			path: ['heap', 'clientConfig'],
			value: '{{clientConfig}}',
		},
		{
			type: 'defineQueueMethods',
			target: 'heap',
			queue: { global: 'heapReadyCb' },
			queueFormat: 'callback',
			methods: [...HEAP_QUEUE_METHODS],
		},
		{
			type: 'loadScript',
			src: '{{scriptUrl}}',
			async: true,
		},
	],
} as const satisfies VendorManifest;

export interface HeapOptions {
	/**
	 * Heap environment/app id.
	 *
	 * Heap's app UI commonly shows this as a numeric string. c15t validates only
	 * that the value is a non-empty string after trimming because Heap's public
	 * install docs describe it generically as `YOUR_APP_ID`.
	 */
	envId: string;
	/**
	 * Optional heap.js client configuration.
	 *
	 * Values must be JSON-serializable: plain objects, arrays, strings, finite
	 * numbers, booleans, and `null`. c15t adds `shouldFetchServerConfig: false`
	 * to match Heap's current web installation snippet.
	 */
	clientConfig?: Record<string, unknown>;
	/**
	 * Optional full Heap config-loader URL override.
	 *
	 * @default 'https://cdn.us.heap-api.com/config/{envId}/heap_config.js'
	 */
	scriptUrl?: string;
}

function validateEnvId(envId: unknown): string {
	const normalized = typeof envId === 'string' ? envId.trim() : '';

	if (normalized.length === 0) {
		throw new Error('heap: missing or invalid envId');
	}

	return normalized;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	if (value === null || typeof value !== 'object' || Array.isArray(value)) {
		return false;
	}

	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

function toJsonValue(value: unknown, path: string): JsonValue {
	if (value === null) {
		return null;
	}

	if (typeof value === 'string' || typeof value === 'boolean') {
		return value;
	}

	if (typeof value === 'number') {
		if (Number.isFinite(value)) {
			return value;
		}

		throw new TypeError(
			`heap: clientConfig${path ? `.${path}` : ''} must be a finite number`
		);
	}

	if (Array.isArray(value)) {
		return value.map((item, index) => toJsonValue(item, `${path}[${index}]`));
	}

	if (isPlainRecord(value)) {
		const result: JsonRecord = {};

		for (const [key, nestedValue] of Object.entries(value)) {
			result[key] = toJsonValue(nestedValue, path ? `${path}.${key}` : key);
		}

		return result;
	}

	throw new TypeError(
		`heap: clientConfig${path ? `.${path}` : ''} must be JSON-serializable`
	);
}

function normalizeClientConfig(
	clientConfig: Record<string, unknown> | undefined
): JsonRecord {
	const config = clientConfig ?? {};
	const normalized = toJsonValue(config, '');

	if (!isPlainRecord(normalized)) {
		throw new TypeError('heap: clientConfig must be a plain object');
	}

	return {
		...normalized,
		shouldFetchServerConfig: false,
	};
}

function resolveHeapScriptUrl(
	envId: string,
	scriptUrl: string | undefined
): string {
	return resolveScriptUrl(
		trimToUndefined(scriptUrl),
		joinUrlPath(DEFAULT_HEAP_CONFIG_BASE_URL, `${envId}/heap_config.js`)
	);
}

/**
 * Creates a Heap web analytics script.
 *
 * @see https://developers.heap.io/docs/web
 *
 * @param options - The options for the Heap script.
 * @returns The Heap script configuration.
 * @throws {Error} When `envId` is missing or only whitespace.
 * @throws {TypeError} When `clientConfig` contains non-JSON values.
 *
 * @remarks
 * Heap autocaptures interactions as soon as heap.js loads. c15t therefore
 * gates the config loader on `measurement` consent and unloads the script when
 * that consent is revoked.
 *
 * @example
 * ```ts
 * import { heap } from '@c15t/scripts/heap';
 *
 * const script = heap({
 * 	envId: '123456789',
 * 	clientConfig: {
 * 		disableTextCapture: true,
 * 	},
 * });
 * ```
 */
export function heap({ envId, clientConfig, scriptUrl }: HeapOptions): Script {
	const normalizedEnvId = validateEnvId(envId);

	return resolveManifest(heapManifest, {
		envId: normalizedEnvId,
		clientConfig: normalizeClientConfig(clientConfig),
		scriptUrl: resolveHeapScriptUrl(normalizedEnvId, scriptUrl),
	});
}
