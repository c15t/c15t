import type { Script } from 'c15t';
import { resolveManifest } from '../../resolve';
import { type VendorManifest, vendorManifestContract } from '../../types';
import { buildQueuePixelInstall } from '../_shared/install-builders';
import { resolveScriptUrl } from '../_shared/script-url';

/**
 * Represents the `contents` array object property.
 */
export interface FbqContent {
	id: string | number;
	quantity: number;
	[key: string]: unknown;
}

/**
 * Base interface for all possible event parameters.
 * All properties are optional here; specific event types will make them required.
 */
export interface FbqBaseEventParams {
	content_category?: string;
	content_ids?: (string | number)[];
	content_name?: string;
	content_type?: 'product' | 'product_group';
	contents?: FbqContent[];
	currency?: string;
	delivery_category?: 'in_store' | 'curbside' | 'home_delivery';
	num_items?: number;
	predicted_ltv?: number;
	search_string?: string;
	status?: boolean;
	value?: number;
}

export type FbqCustomParams = Record<string, unknown>;
type WithCustomParams<TParams> = TParams & FbqCustomParams;

type AddPaymentInfoParams = WithCustomParams<
	Pick<FbqBaseEventParams, 'content_ids' | 'contents' | 'currency' | 'value'>
>;
type AddToCartParams = WithCustomParams<
	Pick<
		FbqBaseEventParams,
		'content_ids' | 'content_type' | 'contents' | 'currency' | 'value'
	>
>;
type AddToWishlistParams = WithCustomParams<
	Pick<FbqBaseEventParams, 'content_ids' | 'contents' | 'currency' | 'value'>
>;
type CompleteRegistrationParams = WithCustomParams<
	Pick<FbqBaseEventParams, 'currency' | 'value' | 'status'>
>;
type InitiateCheckoutParams = WithCustomParams<
	Pick<
		FbqBaseEventParams,
		'content_ids' | 'contents' | 'currency' | 'num_items' | 'value'
	>
>;
type LeadParams = WithCustomParams<
	Pick<FbqBaseEventParams, 'currency' | 'value'>
>;
type PageViewParams = FbqCustomParams;

type SearchParams = WithCustomParams<
	Pick<
		FbqBaseEventParams,
		| 'content_ids'
		| 'content_type'
		| 'contents'
		| 'currency'
		| 'search_string'
		| 'value'
	>
>;
type StartTrialParams = WithCustomParams<
	Pick<FbqBaseEventParams, 'currency' | 'predicted_ltv' | 'value'>
>;
type SubscribeParams = WithCustomParams<
	Pick<FbqBaseEventParams, 'currency' | 'predicted_ltv' | 'value'>
>;
type ViewContentParams = WithCustomParams<
	Pick<
		FbqBaseEventParams,
		'content_ids' | 'content_type' | 'contents' | 'currency' | 'value'
	>
>;

/**
 * The 'Purchase' event has required properties.
 * We use TypeScript's utility types to enforce this.
 */
type PurchaseParams = WithCustomParams<
	Pick<
		FbqBaseEventParams,
		'content_ids' | 'content_type' | 'contents' | 'num_items'
	> &
		Required<Pick<FbqBaseEventParams, 'currency' | 'value'>>
>;

/**
 * Events with no specific properties listed can accept any of the base parameters.
 */
type ContactParams = WithCustomParams<FbqBaseEventParams>;
type CustomizeProductParams = WithCustomParams<FbqBaseEventParams>;
type DonateParams = WithCustomParams<FbqBaseEventParams>;
type FindLocationParams = WithCustomParams<FbqBaseEventParams>;
type ScheduleParams = WithCustomParams<FbqBaseEventParams>;
type SubmitApplicationParams = WithCustomParams<FbqBaseEventParams>;

/**
 * A mapping of Standard Event names to their corresponding parameter types.
 * This is the core of our type-safety mechanism.
 */
export interface StandardEventParams {
	AddPaymentInfo: AddPaymentInfoParams;
	AddToCart: AddToCartParams;
	AddToWishlist: AddToWishlistParams;
	CompleteRegistration: CompleteRegistrationParams;
	Contact: ContactParams;
	CustomizeProduct: CustomizeProductParams;
	Donate: DonateParams;
	FindLocation: FindLocationParams;
	InitiateCheckout: InitiateCheckoutParams;
	Lead: LeadParams;
	PageView: PageViewParams;
	Purchase: PurchaseParams;
	Schedule: ScheduleParams;
	Search: SearchParams;
	StartTrial: StartTrialParams;
	SubmitApplication: SubmitApplicationParams;
	Subscribe: SubscribeParams;
	ViewContent: ViewContentParams;
}

export type StandardEventName = keyof StandardEventParams;

export interface MetaPixelEventOptions {
	/**
	 * Event ID used to deduplicate browser events against Conversions API events.
	 *
	 * @see https://developers.facebook.com/docs/marketing-api/conversions-api/deduplicate-pixel-and-server-events
	 */
	eventID?: string;
	[key: string]: unknown;
}

export interface MetaPixelDataProcessingOptions {
	/**
	 * Data processing flags sent to Meta before `init`.
	 *
	 * Use `['LDU']` to enable Limited Data Use, or `[]` to explicitly disable it.
	 */
	options: 'LDU'[] | [];

	/**
	 * Meta country code. Use `0` to let Meta geolocate the event or `1` for USA.
	 */
	country?: number;

	/**
	 * Meta state code. Use `0` to let Meta geolocate the event.
	 *
	 * @example `1000` for California
	 */
	state?: number;
}

// Extended Window interface to include meta pixel specific properties
declare global {
	interface Window {
		fbq: {
			(
				command: 'dataProcessingOptions',
				options: MetaPixelDataProcessingOptions['options'],
				country?: number,
				state?: number
			): void;
			(
				command: 'init',
				pixelId: string,
				options?: Record<string, unknown>
			): void;
			(
				command: 'track',
				eventName: StandardEventName,
				params?: StandardEventParams[StandardEventName],
				options?: MetaPixelEventOptions
			): void;
			(
				command: 'trackCustom',
				eventName: string,
				params?: FbqCustomParams,
				options?: MetaPixelEventOptions
			): void;
			(
				command: 'trackSingle',
				pixelId: string,
				eventName: StandardEventName,
				params?: StandardEventParams[StandardEventName],
				options?: MetaPixelEventOptions
			): void;
			(
				command: 'trackSingleCustom',
				pixelId: string,
				eventName: string,
				params?: FbqCustomParams,
				options?: MetaPixelEventOptions
			): void;
			(command: 'consent', action: 'grant' | 'revoke'): void;
			(...args: unknown[]): void;
		};
		_fbq: Window['fbq'];
	}
}

/**
 * Meta Pixel vendor manifest.
 *
 * The Meta Pixel uses structured bootstrap steps to define the standard `fbq`
 * stub and provides a consent API via `fbq('consent', 'grant'|'revoke')`.
 */
export const metaPixelManifest = {
	...vendorManifestContract,
	vendor: 'meta-pixel',
	category: 'marketing',
	persistAfterConsentRevoked: true,
	bootstrap: [
		{
			type: 'defineStubFunction',
			name: 'fbq',
			queue: {
				property: 'queue',
			},
			dispatchProperty: 'callMethod',
			selfReferences: ['push'],
			aliases: ['_fbq'],
			properties: {
				loaded: true,
				version: '2.0',
			},
			ifUndefined: true,
		},
	],
	install: [
		{
			type: 'callGlobal',
			global: 'fbq',
			args: ['consent', 'grant'],
		},
		{
			type: 'callGlobal',
			global: 'fbq',
			args: ['init', '{{pixelId}}'],
		},
		{
			type: 'callGlobal',
			global: 'fbq',
			args: ['track', 'PageView'],
		},
		{
			type: 'loadScript',
			src: '{{scriptSrc}}',
			async: true,
		},
	],
	onConsentGranted: [
		{
			type: 'callGlobal',
			global: 'fbq',
			args: ['consent', 'grant'],
		},
	],
	onConsentDenied: [
		{
			type: 'callGlobal',
			global: 'fbq',
			args: ['consent', 'revoke'],
		},
	],
} as const satisfies VendorManifest;

export interface MetaPixelOptions {
	/**
	 * Your Meta Pixel ID
	 * @example `123456789012345`
	 */
	pixelId: string;

	/** Optional payload passed as the third argument to `fbq('init', ...)`. */
	initOptions?: Record<string, unknown>;

	/**
	 * Queue the default `PageView` event during setup.
	 *
	 * @default true
	 */
	trackPageView?: boolean;

	/**
	 * Optional Meta data processing options, such as Limited Data Use.
	 *
	 * When provided, c15t queues `fbq('dataProcessingOptions', ...)` before
	 * `fbq('init', ...)`.
	 */
	dataProcessingOptions?: MetaPixelDataProcessingOptions;

	/** Meta Pixel loader URL. */
	scriptSrc?: string;
}

/**
 * Creates a Meta Pixel script.
 *
 * The manifest defines a structured `fbq` stub plus the external loader URL,
 * avoiding raw inline vendor snippets in the manifest payload.
 *
 * @param options - The options for the Meta Pixel script
 * @returns The Meta Pixel script configuration
 *
 * @example
 * ```ts
 * const metaPixelScript = metaPixel({
 *   pixelId: '123456789012345',
 * });
 * ```
 *
 * @see {@link https://developers.facebook.com/docs/meta-pixel/get-started} Meta Pixel documentation
 */
export function metaPixel({
	pixelId,
	initOptions,
	trackPageView = true,
	dataProcessingOptions,
	scriptSrc,
}: MetaPixelOptions): Script {
	const install = buildMetaPixelInstall({
		hasInitOptions: initOptions !== undefined,
		trackPageView,
		dataProcessingOptions,
	});

	const manifest = {
		...metaPixelManifest,
		install,
	} as const satisfies VendorManifest;

	const resolved = resolveManifest(manifest, {
		pixelId,
		initOptions,
		scriptSrc: resolveScriptUrl(
			scriptSrc,
			'https://connect.facebook.net/en_US/fbevents.js'
		),
	});

	return resolved;
}

function buildMetaPixelInstall({
	hasInitOptions,
	trackPageView,
	dataProcessingOptions,
}: {
	hasInitOptions: boolean;
	trackPageView: boolean;
	dataProcessingOptions?: MetaPixelDataProcessingOptions;
}): VendorManifest['install'] {
	const initArgs: unknown[] = ['init', '{{pixelId}}'];

	if (hasInitOptions) {
		initArgs.push('{{initOptions}}');
	}

	const install = buildQueuePixelInstall({
		global: 'fbq',
		initArgs,
		trackStep: getMetaPixelPageViewStep(trackPageView),
		scriptPlaceholder: '{{scriptSrc}}',
	});

	if (dataProcessingOptions !== undefined) {
		install.unshift({
			type: 'callGlobal',
			global: 'fbq',
			args: getMetaPixelDataProcessingArgs(dataProcessingOptions),
		});
	}

	install.unshift({
		type: 'callGlobal',
		global: 'fbq',
		args: ['consent', 'grant'],
	});

	return install;
}

function getMetaPixelDataProcessingArgs({
	options,
	country,
	state,
}: MetaPixelDataProcessingOptions): unknown[] {
	const args: unknown[] = ['dataProcessingOptions', options];

	if (country !== undefined || state !== undefined) {
		args.push(country ?? 0, state ?? 0);
	}

	return args;
}

function getMetaPixelPageViewStep(
	trackPageView: boolean
): { args: unknown[] } | undefined {
	if (trackPageView) {
		return {
			args: ['track', 'PageView'],
		};
	}

	return undefined;
}

function resolveMetaPixelEventOptions(
	eventOptions?: MetaPixelEventOptions | string
): MetaPixelEventOptions | undefined {
	if (typeof eventOptions === 'string') {
		return {
			eventID: eventOptions,
		};
	}

	return eventOptions;
}

/**
 * Tracks a Meta Pixel standard event.
 *
 * This is a wrapper around `fbq('track', ...)`.
 *
 * @template TEventName - The Meta `StandardEventName` being tracked.
 * @param eventName - The `StandardEventName` to track.
 * @param params - Optional `StandardEventParams[TEventName]` payload.
 * @param eventOptions - Optional `MetaPixelEventOptions` or event ID string.
 * @returns `void`; calls `window.fbq`.
 *
 * @example
 * ```ts
 * metaPixelEvent('Purchase', { value: 10.0, currency: 'USD' }, 'event-123');
 * ```
 *
 * @see {@link https://developers.facebook.com/docs/meta-pixel/reference} Meta Pixel documentation
 */
export const metaPixelEvent = <TEventName extends StandardEventName>(
	eventName: TEventName,
	params?: StandardEventParams[TEventName],
	eventOptions?: MetaPixelEventOptions | string
): void =>
	window.fbq(
		'track',
		eventName,
		params,
		resolveMetaPixelEventOptions(eventOptions)
	);

/**
 * Tracks a Meta Pixel custom event with optional custom parameters.
 *
 * @param eventName - The custom event name to track
 * @param params - Optional custom parameters to track
 * @param eventOptions - Optional event options, including Conversions API eventID
 */
export const metaPixelCustomEvent = (
	eventName: string,
	params?: FbqCustomParams,
	eventOptions?: MetaPixelEventOptions | string
): void =>
	window.fbq(
		'trackCustom',
		eventName,
		params,
		resolveMetaPixelEventOptions(eventOptions)
	);

/**
 * Tracks a standard event for a single Meta Pixel ID.
 *
 * Use this when multiple Meta Pixels are initialized on the same page and the
 * event should not fire for every initialized pixel.
 *
 * @template TEventName - The Meta `StandardEventName` being tracked.
 * @param pixelId - Meta Pixel ID that should receive the event.
 * @param eventName - The `StandardEventName` to track.
 * @param params - Optional `StandardEventParams[TEventName]` payload.
 * @param eventOptions - Optional `MetaPixelEventOptions` or event ID string.
 * @returns `void`; calls `window.fbq`.
 *
 * @example
 * ```ts
 * metaPixelSingleEvent(
 * 	'123456',
 * 	'Purchase',
 * 	{ value: 9.99, currency: 'USD' },
 * 	'event-123'
 * );
 * ```
 */
export const metaPixelSingleEvent = <TEventName extends StandardEventName>(
	pixelId: string,
	eventName: TEventName,
	params?: StandardEventParams[TEventName],
	eventOptions?: MetaPixelEventOptions | string
): void =>
	window.fbq(
		'trackSingle',
		pixelId,
		eventName,
		params,
		resolveMetaPixelEventOptions(eventOptions)
	);

/**
 * Tracks a custom event for a single Meta Pixel ID.
 *
 * Use this when multiple Meta Pixels are initialized on the same page and the
 * custom event should not fire for every initialized pixel.
 *
 * @param pixelId - Meta Pixel ID that should receive the custom event.
 * @param eventName - Custom event name to track.
 * @param params - Optional `FbqCustomParams` payload.
 * @param eventOptions - Optional `MetaPixelEventOptions` or event ID string.
 * @returns `void`; calls `window.fbq`.
 *
 * @example
 * ```ts
 * metaPixelSingleCustomEvent('123456', 'MyCustomEvent', { foo: 'bar' });
 * ```
 */
export const metaPixelSingleCustomEvent = (
	pixelId: string,
	eventName: string,
	params?: FbqCustomParams,
	eventOptions?: MetaPixelEventOptions | string
): void =>
	window.fbq(
		'trackSingleCustom',
		pixelId,
		eventName,
		params,
		resolveMetaPixelEventOptions(eventOptions)
	);
