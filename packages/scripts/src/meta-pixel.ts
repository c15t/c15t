import type { Script } from 'c15t';
import { resolveManifest } from './resolve';
import { type VendorManifest, vendorManifestContract } from './types';

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
	num_items?: number;
	predicted_ltv?: number;
	search_string?: string;
	status?: boolean;
	value?: number;
}

type AddPaymentInfoParams = Pick<
	FbqBaseEventParams,
	'content_ids' | 'contents' | 'currency' | 'value'
>;
type AddToCartParams = Pick<
	FbqBaseEventParams,
	'content_ids' | 'content_type' | 'contents' | 'currency' | 'value'
>;
type AddToWishlistParams = Pick<
	FbqBaseEventParams,
	'content_ids' | 'contents' | 'currency' | 'value'
>;
type CompleteRegistrationParams = Pick<
	FbqBaseEventParams,
	'currency' | 'value' | 'status'
>;
type InitiateCheckoutParams = Pick<
	FbqBaseEventParams,
	'content_ids' | 'contents' | 'currency' | 'num_items' | 'value'
>;
type LeadParams = Pick<FbqBaseEventParams, 'currency' | 'value'>;

type SearchParams = Pick<
	FbqBaseEventParams,
	| 'content_ids'
	| 'content_type'
	| 'contents'
	| 'currency'
	| 'search_string'
	| 'value'
>;
type StartTrialParams = Pick<
	FbqBaseEventParams,
	'currency' | 'predicted_ltv' | 'value'
>;
type SubscribeParams = Pick<
	FbqBaseEventParams,
	'currency' | 'predicted_ltv' | 'value'
>;
type ViewContentParams = Pick<
	FbqBaseEventParams,
	'content_ids' | 'content_type' | 'contents' | 'currency' | 'value'
>;

/**
 * The 'Purchase' event has required properties.
 * We use TypeScript's utility types to enforce this.
 */
type PurchaseParams = Pick<
	FbqBaseEventParams,
	'content_ids' | 'content_type' | 'contents' | 'num_items'
> &
	Required<Pick<FbqBaseEventParams, 'currency' | 'value'>>;

/**
 * Events with no specific properties listed can accept any of the base parameters.
 */
type ContactParams = FbqBaseEventParams;
type CustomizeProductParams = FbqBaseEventParams;
type DonateParams = FbqBaseEventParams;
type FindLocationParams = FbqBaseEventParams;
type ScheduleParams = FbqBaseEventParams;
type SubmitApplicationParams = FbqBaseEventParams;

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
	Purchase: PurchaseParams;
	Schedule: ScheduleParams;
	Search: SearchParams;
	StartTrial: StartTrialParams;
	SubmitApplication: SubmitApplicationParams;
	Subscribe: SubscribeParams;
	ViewContent: ViewContentParams;
}

export type StandardEventName = keyof StandardEventParams;

// Extended Window interface to include meta pixel specific properties
declare global {
	interface Window {
		fbq: {
			(command: 'init', pixelId: string): void;
			(
				command: 'track',
				eventName: StandardEventName,
				params?: StandardEventParams[StandardEventName],
				eventId?: string
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
export function metaPixel({ pixelId, scriptSrc }: MetaPixelOptions): Script {
	const resolved = resolveManifest(metaPixelManifest, {
		pixelId,
		scriptSrc: scriptSrc ?? 'https://connect.facebook.net/en_US/fbevents.js',
	});

	return resolved;
}

/**
 * Meta Pixel Event
 * This is a wrapper around the `fbq` function that the Meta Pixel script uses.
 *
 * @param eventName - The event name to track
 * @param params - Optional parameters to track
 * @param eventId - Optional event ID to track (If using Conversion API)
 *
 * @usage
 * ```ts
 * metaPixelEvent('Purchase', { value: 10.0, currency: 'USD' });
 * ```
 *
 * @see {@link https://developers.facebook.com/docs/meta-pixel/reference} Meta Pixel documentation
 */
export const metaPixelEvent = <TEventName extends StandardEventName>(
	eventName: TEventName,
	params?: StandardEventParams[TEventName],
	eventId?: string
) => window.fbq('track', eventName, params, eventId);
