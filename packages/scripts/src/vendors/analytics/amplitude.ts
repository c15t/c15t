import type { Script } from 'c15t';
import { resolveManifest } from '../../resolve';
import { type VendorManifest, vendorManifestContract } from '../../types';
import { resolveScriptUrl, trimToUndefined } from '../_shared/script-url';

/**
 * Browser SDK 2 version used by the default Amplitude CDN loader URL.
 *
 * The Amplitude Browser SDK 2 public bundle path is versioned. A
 * `analytics-browser-latest-min.js.gz` path is not publicly available, so c15t
 * pins a known Browser SDK 2 version by default and lets callers override the
 * loader through `scriptUrl`.
 */
export const DEFAULT_AMPLITUDE_BROWSER_SDK_VERSION = '2.44.4';

/**
 * Default Amplitude Browser SDK 2 loader URL.
 */
export const DEFAULT_AMPLITUDE_SCRIPT_URL = `https://cdn.amplitude.com/libs/analytics-browser-${DEFAULT_AMPLITUDE_BROWSER_SDK_VERSION}-min.js.gz`;

/**
 * Core Amplitude Browser SDK 2 methods queued before the real SDK loads.
 *
 * These methods use Amplitude's Browser SDK 2 snippet queue contract:
 * `window.amplitude._q` receives `{ name, args, resolve }` records, and the
 * loaded SDK drains that queue when `window.amplitude.invoked` is true.
 */
export const AMPLITUDE_QUEUE_METHODS = [
	'init',
	'track',
	'identify',
	'setUserId',
	'setOptOut',
	'flush',
] as const;

/**
 * Amplitude Identify helper methods queued before the real SDK loads.
 */
export const AMPLITUDE_IDENTIFY_METHODS = [
	'set',
	'setOnce',
	'add',
	'append',
	'prepend',
	'preInsert',
	'postInsert',
	'remove',
	'unset',
	'clearAll',
] as const;

/**
 * Queue entry consumed by Amplitude Browser SDK 2 at load time.
 */
export interface AmplitudeQueueEntry {
	/** Name of the Amplitude method to invoke after the SDK loads. */
	name: (typeof AMPLITUDE_QUEUE_METHODS)[number];
	/** Arguments originally passed to the queued method. */
	args: unknown[];
	/** Promise resolver called by the SDK after the queued method runs. */
	resolve: (value: unknown) => void;
}

/**
 * Queue entry stored by an Amplitude Identify helper created before load.
 */
export interface AmplitudeIdentifyQueueEntry {
	/** Identify helper method to replay after the SDK loads. */
	name: (typeof AMPLITUDE_IDENTIFY_METHODS)[number];
	/** Arguments originally passed to the helper method. */
	args: unknown[];
}

/**
 * Pre-load Amplitude Identify helper.
 */
export interface AmplitudeIdentify {
	/** Queued Identify helper operations. */
	_q?: AmplitudeIdentifyQueueEntry[];
	/** Queue a `$set` identify operation. */
	set: (property: string, value: unknown) => this;
	/** Queue a `$setOnce` identify operation. */
	setOnce: (property: string, value: unknown) => this;
	/** Queue an `$add` identify operation. */
	add: (property: string, value: number) => this;
	/** Queue an `$append` identify operation. */
	append: (property: string, value: unknown) => this;
	/** Queue a `$prepend` identify operation. */
	prepend: (property: string, value: unknown) => this;
	/** Queue a `$preInsert` identify operation. */
	preInsert: (property: string, value: unknown) => this;
	/** Queue a `$postInsert` identify operation. */
	postInsert: (property: string, value: unknown) => this;
	/** Queue a `$remove` identify operation. */
	remove: (property: string, value: unknown) => this;
	/** Queue an `$unset` identify operation. */
	unset: (property: string) => this;
	/** Queue a `$clearAll` identify operation. */
	clearAll: () => this;
}

/**
 * Minimal public Amplitude Browser SDK 2 API exposed on `window.amplitude`.
 *
 * The real SDK replaces the pre-load stub with these methods after the loader
 * executes. Calls made before load return promises that resolve once the SDK
 * replays them.
 */
export interface AmplitudeApi {
	/** Amplitude Browser SDK 2 pre-load queue. */
	_q?: AmplitudeQueueEntry[];
	/** Named-instance queue registry used by the official snippet contract. */
	_iq?: Record<string, unknown>;
	/** Marker that tells the SDK to replay snippet-queued calls. */
	invoked?: boolean;
	/** Pre-load Identify helper constructor. */
	Identify?: new () => AmplitudeIdentify;
	/** Initialize the default Amplitude instance. */
	init: (
		apiKey: string,
		options?: Record<string, unknown>
	) => Promise<unknown> | unknown;
	/** Track an event with optional event properties. */
	track: (
		eventInput: string | Record<string, unknown>,
		eventProperties?: Record<string, unknown>
	) => Promise<unknown> | unknown;
	/** Send an identify call. */
	identify: (
		identifyPayload: AmplitudeIdentify,
		eventOptions?: Record<string, unknown>
	) => Promise<unknown> | unknown;
	/** Set the current user identifier. */
	setUserId: (userId: string | undefined) => Promise<unknown> | unknown;
	/** Toggle runtime opt-out. */
	setOptOut: (optOut: boolean) => Promise<unknown> | unknown;
	/** Flush pending events. */
	flush: () => Promise<unknown> | unknown;
}

declare global {
	interface Window {
		amplitude?: AmplitudeApi;
	}
}

/**
 * Amplitude vendor manifest.
 *
 * Implements the essential Browser SDK 2 script-loader contract with
 * `window.amplitude.invoked`, an `_q` method-call queue, and an `_iq` registry
 * for named instances. It also defines the `Identify` queued helper used by
 * pre-load `identify()` calls. c15t gates the loader on `measurement` consent,
 * queues `init(apiKey, initOptions)` before the bundle loads, and uses
 * `setOptOut(false)` / `setOptOut(true)` for runtime consent changes after the
 * SDK has loaded.
 */
export const amplitudeManifest = {
	...vendorManifestContract,
	vendor: 'amplitude',
	category: 'measurement',
	install: [
		{
			type: 'setGlobal',
			name: 'amplitude',
			value: {
				_q: [],
				_iq: {},
				invoked: true,
			},
			ifUndefined: true,
		},
		{
			type: 'setGlobalPath',
			path: ['amplitude', 'invoked'],
			value: true,
		},
		{
			type: 'setGlobalPath',
			path: ['amplitude', '_q'],
			value: [],
		},
		{
			type: 'setGlobalPath',
			path: ['amplitude', '_iq'],
			value: {},
		},
		{
			type: 'defineQueueClass',
			target: 'amplitude',
			name: 'Identify',
			queueProperty: '_q',
			methods: [...AMPLITUDE_IDENTIFY_METHODS],
		},
		{
			type: 'defineQueueMethods',
			target: 'amplitude',
			queue: { property: '_q' },
			queueFormat: 'methodCall',
			methods: [...AMPLITUDE_QUEUE_METHODS],
		},
		{
			type: 'callGlobal',
			global: 'amplitude',
			method: 'init',
			args: ['{{apiKey}}', '{{initOptions}}'],
		},
		{
			type: 'loadScript',
			src: '{{scriptUrl}}',
			async: true,
		},
	],
	onLoadDenied: [
		{
			type: 'callGlobal',
			global: 'amplitude',
			method: 'setOptOut',
			args: [true],
		},
	],
	onConsentGranted: [
		{
			type: 'callGlobal',
			global: 'amplitude',
			method: 'setOptOut',
			args: [false],
		},
	],
	onConsentDenied: [
		{
			type: 'callGlobal',
			global: 'amplitude',
			method: 'setOptOut',
			args: [true],
		},
	],
} as const satisfies VendorManifest;

export interface AmplitudeOptions {
	/** Amplitude project API key. */
	apiKey: string;
	/**
	 * Amplitude Browser SDK 2 initialization options.
	 *
	 * Values are serialized into the manifest, so use JSON-serializable values
	 * only: plain objects, arrays, strings, numbers, booleans, and `null`.
	 */
	initOptions?: Record<string, unknown>;
	/**
	 * Optional Amplitude loader URL override.
	 *
	 * @default 'https://cdn.amplitude.com/libs/analytics-browser-2.44.4-min.js.gz'
	 */
	scriptUrl?: string;
}

/**
 * Creates an Amplitude Browser SDK 2 script.
 *
 * @param options - The options for the Amplitude script.
 * @returns The Amplitude script configuration.
 * @throws {Error} When `apiKey` is missing or only whitespace.
 *
 * @remarks
 * The generated script is gated on `measurement` consent. It does not load the
 * Amplitude SDK until measurement consent is granted; after the SDK is loaded,
 * later consent changes call `amplitude.setOptOut(false)` or
 * `amplitude.setOptOut(true)`.
 *
 * @example
 * ```ts
 * import { amplitude } from '@c15t/scripts/amplitude';
 *
 * const script = amplitude({
 * 	apiKey: 'AMPLITUDE_API_KEY',
 * 	initOptions: {
 * 		autocapture: false,
 * 	},
 * });
 * ```
 */
export function amplitude({
	apiKey,
	initOptions = {},
	scriptUrl,
}: AmplitudeOptions): Script {
	const normalizedApiKey = typeof apiKey === 'string' ? apiKey.trim() : '';

	if (normalizedApiKey.length === 0) {
		throw new Error('amplitude: missing or invalid apiKey');
	}

	return resolveManifest(amplitudeManifest, {
		apiKey: normalizedApiKey,
		initOptions,
		scriptUrl: resolveScriptUrl(
			trimToUndefined(scriptUrl),
			DEFAULT_AMPLITUDE_SCRIPT_URL
		),
	});
}
