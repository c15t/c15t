import type { Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { resolveScriptUrl } from '../_shared/script-url';

/** User matching fields accepted by OpenAI. Hash identifiers before passing them. */
export interface OpenAIPixelUser {
	/** SHA-256 of the trimmed, lowercase email address. */
	email_sha256?: string;
	/** SHA-256 of the normalized phone number, including its country code. */
	phone_number_sha256?: string;
	/** SHA-256 of the trimmed external ID, preserving case. */
	external_id_sha256?: string;
	/** SHA-256 of the lowercase first name without whitespace or ASCII punctuation. */
	first_name_sha256?: string;
	/** SHA-256 of the lowercase last name without whitespace or ASCII punctuation. */
	last_name_sha256?: string;
	/** Two-letter ISO 3166-1 country code. */
	country?: string;
	/** City name, up to 128 characters. */
	city?: string;
	/** State, province, or region, up to 128 characters. */
	region?: string;
	/** Postal or ZIP code, up to 32 characters. */
	postal_code?: string;
}

/** Documented options for `oaiq('init', ...)`, including subsequent user updates. */
export interface OpenAIPixelInitOptions {
	/** Required on first initialization; include for updates with multiple pixels. */
	pixelId?: string;
	/** Log SDK activity to the browser console. */
	debug?: boolean;
	/** Complete user matching payload. Raw identifiers must not be sent. */
	user?: OpenAIPixelUser;
}

/** An item attached to a browser conversion event. */
export interface OpenAIPixelContent {
	id?: string;
	name?: string;
	content_type?: string;
	/** Integer item quantity. */
	quantity?: number;
	/** Integer amount in the currency's minor unit. */
	amount?: number;
	/** ISO 4217 code; may inherit the event currency. */
	currency?: string;
}

/** Event-level amounts require an ISO 4217 currency code. */
type OpenAIPixelValue =
	| { amount: number; currency: string }
	| { amount?: never; currency?: string };

/** Payload for page views and commerce events. */
export type OpenAIPixelContentsData = OpenAIPixelValue & {
	type: 'contents';
	contents?: OpenAIPixelContent[];
};

/** Payload for leads, registrations, and appointments. */
export type OpenAIPixelCustomerActionData = OpenAIPixelValue & {
	type: 'customer_action';
};

/** Payload for subscriptions and trials. */
export type OpenAIPixelPlanData = OpenAIPixelValue & {
	type: 'plan_enrollment';
	plan_id?: string;
	contents?: OpenAIPixelContent[];
};

/** Payload for a custom conversion. */
export type OpenAIPixelCustomData = OpenAIPixelValue & {
	type: 'custom';
	plan_id?: string;
	contents?: OpenAIPixelContent[];
};

/** Browser event names and their required payload shapes. */
export interface OpenAIPixelEventData {
	appointment_scheduled: OpenAIPixelCustomerActionData;
	checkout_started: OpenAIPixelContentsData;
	contents_viewed: OpenAIPixelContentsData;
	items_added: OpenAIPixelContentsData;
	lead_created: OpenAIPixelCustomerActionData;
	order_created: OpenAIPixelContentsData;
	page_viewed: OpenAIPixelContentsData;
	registration_completed: OpenAIPixelCustomerActionData;
	subscription_created: OpenAIPixelPlanData;
	trial_started: OpenAIPixelPlanData;
}

/** Options passed separately from event data to the Measurement Pixel. */
export interface OpenAIPixelEventOptions {
	/** Reuse the same ID for browser/server event deduplication. */
	event_id?: string;
	/** Opt this event out of future user-level personalization. */
	opt_out?: boolean;
}

/** Custom events require a name in addition to their event data. */
export interface OpenAIPixelCustomEventOptions extends OpenAIPixelEventOptions {
	/** A 1–64 character name using letters, numbers, underscores, or dashes. */
	custom_event_name: string;
}

/** Arguments accepted by the event helper and the SDK's measure commands. */
export type OpenAIPixelEventArgs =
	| {
			[EventName in keyof OpenAIPixelEventData]: [
				eventName: EventName,
				data: OpenAIPixelEventData[EventName],
				options?: OpenAIPixelEventOptions,
			];
	  }[keyof OpenAIPixelEventData]
	| [
			eventName: 'custom',
			data: OpenAIPixelCustomData,
			options: OpenAIPixelCustomEventOptions,
	  ];

/** The documented OpenAI browser command API and its pre-load queue. */
export interface OpenAIPixelFunction {
	(command: 'consent', granted: boolean): void;
	(command: 'init', options: OpenAIPixelInitOptions): void;
	(command: 'measure', ...args: OpenAIPixelEventArgs): void;
	(
		command: 'measureSingle',
		pixelId: string,
		...args: OpenAIPixelEventArgs
	): void;
	/** Commands queued before the SDK replaces the stub. */
	q?: IArguments[];
}

declare global {
	interface Window {
		oaiq?: OpenAIPixelFunction;
	}
}

/** Options for the ChatGPT Ads Measurement Pixel. */
export interface OpenAIPixelOptions extends OpenAIPixelInitOptions {
	/** Pixel ID from the conversions tab in OpenAI Ads Manager. */
	pixelId: string;
	/** Log SDK activity in the browser console. @default false */
	debug?: boolean;
	/** Override the Measurement Pixel SDK URL. */
	scriptSrc?: string;
}

/**
 * ChatGPT Ads Measurement Pixel manifest.
 *
 * Loads after marketing consent. Denies measurement before initialization,
 * then applies the current consent state before the SDK executes.
 *
 * @see https://developers.openai.com/ads/measurement-pixel
 */
export const openaiPixelManifest = {
	...vendorManifestContract,
	bootstrap: [
		{
			ifUndefined: true,
			name: 'oaiq',
			queue: { property: 'q' },
			type: 'defineStubFunction',
		},
		{
			args: ['consent', false],
			global: 'oaiq',
			type: 'callGlobal',
		},
	],
	category: 'marketing',
	install: [
		{
			args: ['init', '{{initOptions}}'],
			global: 'oaiq',
			type: 'callGlobal',
		},
		{
			async: true,
			src: '{{scriptSrc}}',
			type: 'loadScript',
		},
	],
	onBeforeLoadGranted: [
		{
			args: ['consent', true],
			global: 'oaiq',
			type: 'callGlobal',
		},
	],
	onConsentDenied: [
		{
			args: ['consent', false],
			global: 'oaiq',
			type: 'callGlobal',
		},
	],
	onConsentGranted: [
		{
			args: ['consent', true],
			global: 'oaiq',
			type: 'callGlobal',
		},
	],
	persistAfterConsentRevoked: true,
	vendor: 'openai-pixel',
} as const satisfies VendorManifest;

/**
 * Creates a consent-aware ChatGPT Ads Measurement Pixel script.
 *
 * @param options - Pixel ID, debug logging, and optional SDK URL.
 * @returns A script gated on marketing consent, with SDK consent updates.
 * @example
 * ```ts
 * openaiPixel({ pixelId: 'YOUR_PIXEL_ID', debug: true });
 * ```
 */
export const openaiPixel = function openaiPixel({
	pixelId,
	debug = false,
	user,
	scriptSrc,
}: OpenAIPixelOptions): Script {
	const initOptions: OpenAIPixelInitOptions = { debug, pixelId };
	if (user !== undefined) {
		initOptions.user = user;
	}
	return resolveManifest(openaiPixelManifest, {
		initOptions,
		scriptSrc: resolveScriptUrl(
			scriptSrc,
			'https://bzrcdn.openai.com/sdk/oaiq.min.js'
		),
	});
};

/**
 * Sends a conversion to every initialized OpenAI pixel.
 *
 * Calls before the queue exists are dropped. Once loaded, the SDK applies
 * c15t's consent signal. Use `window.oaiq('measureSingle', ...)` to target one pixel.
 *
 * @param args - Event name, matching data, and event options.
 * @returns Nothing.
 * @example
 * ```ts
 * openaiPixelEvent('order_created', {
 *   type: 'contents', amount: 2599, currency: 'USD',
 * }, { event_id: 'order_123' });
 * ```
 */
export const openaiPixelEvent = function openaiPixelEvent(
	...args: OpenAIPixelEventArgs
): void {
	if (typeof window === 'undefined' || typeof window.oaiq !== 'function') {
		return;
	}
	window.oaiq('measure', ...args);
};
