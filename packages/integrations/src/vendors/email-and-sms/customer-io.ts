import type { Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId } from '../_shared/required-id';
import { createScriptReuse } from '../_shared/reuse-script';
import { resolveScriptUrl, stripTrailingSlashes } from '../_shared/script-url';

/** Customer.io's callable analytics.js queue methods. */
export const CUSTOMER_IO_METHODS = [
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
] as const;

/** Whether Customer.io is queueing calls or running the loaded SDK. */
export type CustomerIoStage = 'queue' | 'loaded';

/** Event properties, identity traits or vendor-specific event options. */
export type CustomerIoProperties = Record<string, unknown>;

/** The event context passed to completion callbacks by the loaded SDK. */
export interface CustomerIoContext {
	event: CustomerIoProperties;
	[key: string]: unknown;
}

/** Completion runs after SDK dispatch, without guaranteeing delivery. */
export type CustomerIoCallback = (context: CustomerIoContext) => unknown;

type OptionsAndCallback = [
	options?: CustomerIoProperties | CustomerIoCallback | null,
	callback?: CustomerIoCallback,
];
type IdentityArguments =
	| [
			id?: string | number | null,
			traits?: CustomerIoProperties | CustomerIoCallback | null,
			...options: OptionsAndCallback,
	  ]
	| [
			traits: CustomerIoProperties | CustomerIoCallback,
			...options: OptionsAndCallback,
	  ];
type PageArguments =
	| [
			category?: string | null,
			name?: string | null,
			properties?: CustomerIoProperties | CustomerIoCallback | null,
			...options: OptionsAndCallback,
	  ]
	| [
			name: string,
			properties?: CustomerIoProperties | CustomerIoCallback | null,
			...options: OptionsAndCallback,
	  ]
	| [
			properties?: CustomerIoProperties | CustomerIoCallback | null,
			...options: OptionsAndCallback,
	  ];
type Result<
	Stage extends CustomerIoStage,
	RuntimeResult,
> = Stage extends 'queue' ? CustomerIoQueue : RuntimeResult;

/** Stored group identity returned synchronously by the loaded SDK's group(). */
export interface CustomerIoGroup {
	id: () => string | null | undefined;
	traits: () => CustomerIoProperties;
}

/** Event facade supplied to Customer.io middleware. */
export interface CustomerIoMiddlewarePayload {
	obj: CustomerIoProperties;
	[key: string]: unknown;
}

/** Source middleware, including the vendor's next(null) drop. */
export type CustomerIoMiddleware = (input: {
	payload: CustomerIoMiddlewarePayload;
	integrations?: CustomerIoProperties;
	next: (payload: CustomerIoMiddlewarePayload | null) => void;
}) => void | Promise<void>;

/** Destination middleware receives the destination's integration name. */
export type CustomerIoDestinationMiddleware = (input: {
	payload: CustomerIoMiddlewarePayload;
	integration: string;
	next: (payload: CustomerIoMiddlewarePayload | null) => void;
}) => void | Promise<void>;

type AutoTrack<ElementType extends Element, Stage extends CustomerIoStage> = (
	elements: ElementType | ElementType[] | null,
	event: string | ((element: ElementType) => string),
	properties?:
		| CustomerIoProperties
		| ((element: ElementType) => CustomerIoProperties),
	options?: CustomerIoProperties
) => Result<Stage, Promise<CustomerIoApi>>;
type TrackLink<Stage extends CustomerIoStage> = (
	elements: Element | Element[] | { toArray: () => HTMLElement[] } | null,
	...args: Parameters<AutoTrack<Element, Stage>> extends [
		unknown,
		...infer Rest,
	]
		? Rest
		: never
) => Result<Stage, Promise<CustomerIoApi>>;

/**
 * Customer.io methods installed by this helper. Queue calls return their owner;
 * loaded methods retain the SDK's individual return contracts.
 * @see https://github.com/customerio/cdp-analytics-js
 */
export interface CustomerIoApi<Stage extends CustomerIoStage = 'loaded'> {
	/** Loader metadata is optional and need not survive SDK initialization. */
	_writeKey?: string;
	_cdn?: string;
	_loadOptions?: CustomerIoProperties;
	SNIPPET_VERSION?: string;
	[key: string]: unknown;
	/** Identify by ID, traits or both, with optional options and callback. */
	identify: (
		...args: IdentityArguments
	) => Result<Stage, Promise<CustomerIoContext>>;
	/** Read the stored group without dispatching an event. */
	group: {
		(): Result<Stage, CustomerIoGroup>;
		/** Update group identity with the same argument forms as identify. */
		(...args: IdentityArguments): Result<Stage, Promise<CustomerIoContext>>;
	};
	/** Track an event, with optional properties, options and callback. */
	track: (
		event:
			| string
			| ({
					event: string;
					properties?: CustomerIoProperties;
			  } & CustomerIoProperties),
		properties?: CustomerIoProperties | CustomerIoCallback | null,
		...options: OptionsAndCallback
	) => Result<Stage, Promise<CustomerIoContext>>;
	/** Record a page by properties, name, or category and name. */
	page: (...args: PageArguments) => Result<Stage, Promise<CustomerIoContext>>;
	/** Associate a new ID with an optional previous ID. */
	alias: (
		id: string | number,
		previousId?:
			| string
			| number
			| CustomerIoProperties
			| CustomerIoCallback
			| null,
		...options: OptionsAndCallback
	) => Result<Stage, Promise<CustomerIoContext>>;
	/** Clear identity. This does not disable collection or destination SDKs. */
	reset: () => Result<Stage, void>;
	/** Wait for destination readiness; callback receives the readiness results. */
	ready: (
		callback?: (results: unknown[]) => unknown
	) => Result<Stage, Promise<unknown[]>>;
	/** Enable or disable SDK debug output. */
	debug: (enabled: boolean) => Result<Stage, CustomerIoApi>;
	/** Subscribe to an SDK event. Its arguments depend on the event. */
	on: <Arguments extends unknown[]>(
		event: string,
		listener: (...args: Arguments) => unknown
	) => Result<Stage, CustomerIoApi>;
	/** Subscribe to one occurrence of an SDK event. */
	once: <Arguments extends unknown[]>(
		event: string,
		listener: (...args: Arguments) => unknown
	) => Result<Stage, CustomerIoApi>;
	/** Remove the specified listener. */
	off: <Arguments extends unknown[]>(
		event: string,
		listener: (...args: Arguments) => unknown
	) => Result<Stage, CustomerIoApi>;
	/** Read or replace the anonymous ID. */
	setAnonymousId: (id?: string) => Result<Stage, string | null | undefined>;
	/** Register middleware before routing events to destinations. */
	addSourceMiddleware: (
		middleware: CustomerIoMiddleware
	) => Result<Stage, Promise<CustomerIoApi>>;
	/** Register middleware for a named destination. */
	addDestinationMiddleware: (
		integration: string,
		...middleware: CustomerIoDestinationMiddleware[]
	) => Result<Stage, Promise<CustomerIoApi>>;
	/** @deprecated The loaded SDK only warns; it does not install middleware. */
	addIntegrationMiddleware: (...args: unknown[]) => Result<Stage, void>;
	/** Install click handlers. The promise does not wait for a click. */
	trackLink: TrackLink<Stage>;
	/** Alias of trackLink. */
	trackClick: TrackLink<Stage>;
	/** Install submit handlers. The promise does not wait for a submission. */
	trackForm: AutoTrack<HTMLFormElement, Stage>;
	/** Alias of trackForm. */
	trackSubmit: AutoTrack<HTMLFormElement, Stage>;
	/** @deprecated Use page({ path: url }). */
	pageview: (url: string) => Result<Stage, Promise<CustomerIoApi>>;
}

/** Pre-load tuple queue. Every installed method returns this same queue. */
export type CustomerIoQueue = [string, ...unknown[]][] & CustomerIoApi<'queue'>;

declare global {
	interface Window {
		/** Absent before consent; an array queue while the SDK downloads. */
		cioanalytics?: CustomerIoQueue | CustomerIoApi;
	}
}

/** Customer.io Data Pipelines bootstrap, installed only after consent. */
export const customerIoManifest = {
	...vendorManifestContract,
	category: 'marketing',
	install: [
		{ name: 'cioanalytics', type: 'setGlobal', value: [] },
		{
			methods: [...CUSTOMER_IO_METHODS],
			preserveExisting: true,
			returnTarget: true,
			target: 'cioanalytics',
			type: 'defineQueueMethods',
		},
		{
			ifGlobalIsQueue: true,
			path: ['cioanalytics', '_writeKey'],
			type: 'setGlobalPath',
			value: '{{writeKey}}',
		},
		{
			ifGlobalIsQueue: true,
			path: ['cioanalytics', '_cdn'],
			type: 'setGlobalPath',
			value: '{{cdnUrl}}',
		},
		{
			ifGlobalIsQueue: true,
			path: ['cioanalytics', '_loadOptions'],
			type: 'setGlobalPath',
			value: '{{loadOptions}}',
		},
		{
			ifGlobalIsQueue: true,
			path: ['cioanalytics', 'SNIPPET_VERSION'],
			type: 'setGlobalPath',
			value: '4.15.3',
		},
		{
			async: true,
			attributes: { 'data-global-customerio-analytics-key': 'cioanalytics' },
			src: '{{scriptUrl}}',
			type: 'loadScript',
		},
	],
	persistAfterConsentRevoked: true,
	vendor: 'customer-io',
	vendorDetails: {
		homepageUrl: 'https://customer.io/',
		legalName: 'Peaberry Software Inc.',
		name: 'Customer.io',
		privacyPolicyUrl: 'https://customer.io/legal/privacy-policy/',
	},
} as const satisfies VendorManifest;

export interface CustomerIoOptions {
	/** Public Data Pipelines source write key. */
	writeKey: string;
	/** Region of the Customer.io workspace. @default 'us' */
	region?: 'us' | 'eu';
	/** JSON-serializable options passed to the source loader. */
	loadOptions?: Record<string, unknown>;
	/** Consent condition required before loading. @default 'marketing' */
	category?: Script['category'];
	/**
	 * HTTP(S) CDN origin for the loader, settings and SDK assets.
	 * Defaults to the region's CDN. Collection routing uses loadOptions.
	 */
	cdnUrl?: string;
	/** Override only the initial loader URL. Use cdnUrl for a CDN proxy. */
	scriptUrl?: string;
}

const createCustomerIo = function createCustomerIo(
	options: CustomerIoOptions
): Script {
	const category = options?.category ?? 'marketing';
	const writeKey = readId(options?.writeKey);
	if (!writeKey) {
		return skipMissingId('customerIo', 'writeKey', {
			category,
			manifest: customerIoManifest,
		});
	}
	const region = options.region ?? 'us';
	if (region !== 'us' && region !== 'eu') {
		throw new Error("customerIo: region must be 'us' or 'eu'");
	}
	const host = region === 'eu' ? 'cdp-eu.customer.io' : 'cdp.customer.io';
	const cdnUrl = stripTrailingSlashes(
		resolveScriptUrl(options.cdnUrl, `https://${host}`)
	);
	let cdn: URL;
	try {
		cdn = new URL(cdnUrl);
	} catch (error) {
		if (!(error instanceof TypeError)) {
			throw error;
		}
		throw new Error('customerIo: cdnUrl must be an HTTP(S) origin', {
			cause: error,
		});
	}
	if (
		!['https:', 'http:'].includes(cdn.protocol) ||
		cdn.username ||
		cdn.password ||
		cdn.pathname !== '/' ||
		cdn.search ||
		cdn.hash
	) {
		throw new Error('customerIo: cdnUrl must be an HTTP(S) origin');
	}
	const script = resolveManifest(customerIoManifest, {
		cdnUrl: cdn.origin,
		loadOptions: options.loadOptions ?? {},
		scriptUrl: resolveScriptUrl(
			options.scriptUrl,
			`${cdn.origin}/v1/analytics-js/snippet/${encodeURIComponent(writeKey)}/analytics.min.js`
		),
		writeKey,
	});
	let hasConsent = false;
	let loaded = false;
	let generation = 0;
	let requestedGeneration = -1;
	const pageAfterLoad = (element: HTMLScriptElement | undefined): void => {
		if (
			!loaded ||
			!hasConsent ||
			!element?.isConnected ||
			requestedGeneration === generation
		) {
			return;
		}
		requestedGeneration = generation;
		window.cioanalytics?.page?.();
	};
	return {
		...script,
		category,
		onBeforeLoad(info) {
			if (hasConsent !== info.hasConsent) {
				generation += 1;
			}
			({ hasConsent } = info);
			if (hasConsent) {
				script.onBeforeLoad?.(info);
			}
		},
		onConsentChange(info) {
			const changed = hasConsent !== info.hasConsent;
			({ hasConsent } = info);
			if (!changed) {
				return;
			}
			generation += 1;
			if (hasConsent) {
				pageAfterLoad(info.element);
			} else {
				window.cioanalytics?.reset?.();
			}
		},
		onDispose() {
			hasConsent = false;
			generation += 1;
		},
		onLoad(info) {
			loaded = true;
			if (info.hasConsent) {
				pageAfterLoad(info.element);
			}
		},
		serverStart: undefined,
	};
};

const reuseCustomerIo = createScriptReuse<CustomerIoOptions>();

/**
 * Loads Customer.io once after consent and resets identity on revoke.
 * reset is not an opt-out. Keep reloadOnConsentRevoked enabled to stop the
 * running source and any destination SDKs.
 * @param options - Source write key, workspace region, CDN and loader options.
 * @returns A gated script, or an inactive script for a missing key.
 * @throws {Error} If the region or CDN origin is invalid.
 * @example customerIo({ writeKey: 'YOUR_WRITE_KEY', region: 'eu' });
 * @see https://docs.customer.io/integrations/data-in/connections/javascript/in-app/
 */
export const customerIo = function customerIo(
	options: CustomerIoOptions
): Script {
	if (!readId(options?.writeKey)) {
		return skipMissingId('customerIo', 'writeKey', {
			category: options?.category ?? 'marketing',
			manifest: customerIoManifest,
		});
	}
	return reuseCustomerIo(options, createCustomerIo);
};
