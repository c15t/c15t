import type { Script } from 'c15t';

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

export interface MetaPixelOptions {
	/**
	 * Your Meta Pixel ID
	 * @example `123456789012345`
	 */
	pixelId: string;

	/**
	 * Override or extend the default script values.
	 *
	 * Default values:
	 * - `id`: 'meta-pixel'
	 * - `src`: `https://connect.facebook.net/en_US/fbevents.js`
	 * - `category`: 'marketing'
	 */
	script?: Partial<Script>;
}

/**
 * Creates a Meta Pixel script with inline JavaScript code.
 *
 * This script uses textContent to inject the Meta Pixel tracking code directly
 * into the page, which is the recommended approach for Meta Pixel implementation.
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
export function metaPixel({ pixelId, script }: MetaPixelOptions): Script {
	return {
		id: script?.id ?? 'meta-pixel',
		category: script?.category ?? 'marketing',
		textContent: `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'${script?.src ?? 'https://connect.facebook.net/en_US/fbevents.js'}');
fbq('consent', 'grant');
fbq('init', '${pixelId}');
fbq('track', 'PageView');
		`.trim(),
		// This is a persistent script because it has an API to manage the consent state
		persistAfterConsentRevoked: true,

		// This will run before the script is deleted
		onDelete: (payload) => {
			window.fbq('consent', 'revoke');

			if (script?.onDelete) {
				script.onDelete(payload);
			}
		},
	};
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
