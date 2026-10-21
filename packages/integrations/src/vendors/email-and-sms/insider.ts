import type { AllConsentNames, HasCondition, Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId } from '../_shared/required-id';

/** Product data required by Insider's product page push. */
export interface InsiderProduct {
	/** Unique product ID. */
	id: string;
	/** Product name. */
	name: string;
	/** Product category hierarchy. */
	taxonomy: string[];
	/** Price before discounts. */
	unit_price: number;
	/** Current unit price. */
	unit_sale_price: number;
	/** Product page URL. */
	url: string;
	/** Product image URL. */
	product_image_url: string;
	/** Available stock. */
	stock?: number;
	/** Selected color. */
	color?: string;
	/** Selected size. */
	size?: string;
	/** Identifier shared by product variants. */
	groupcode?: string;
	/** Product description. */
	description?: string;
	/** Global Trade Item Number. */
	gtin?: string;
	/** Stock keeping unit. */
	sku?: string;
	/** Product brand. */
	brand?: string;
	/** Whether a unique product identifier exists, expressed as a string. */
	identifier_exists?: string;
	/** Product locale. */
	locale?: string;
	/** Product title used for Google feeds. */
	google_title?: string;
	/** Product gender. */
	gender?: string;
	/** Omnibus price, expressed as a string in the Web SDK guide. */
	omnibus_price?: string;
	/** Account-specific event parameters. */
	custom?: Record<string, unknown>;
}

/** Product data required for Insider cart and purchase items. */
export interface InsiderCartItem extends InsiderProduct {
	/** Number of units. */
	quantity: number;
}

/**
 * Insider's documented page definitions, including their required payloads.
 *
 * `home` and `other` need no payload. The SDK uses `category` for listing
 * pages, `cart` for baskets, and `purchase` for order confirmation pages.
 * A purchase requires an application-owned, durable per-order guard. The
 * helper does not deduplicate order IDs across reloads or reinitialization.
 *
 * @see https://academy.insiderone.com/docs/insider-web-sdk-integration-guide
 */
export type InsiderPageType =
	| {
			type: 'home';
			value?: { custom?: Record<string, unknown> };
	  }
	| {
			type: 'other';
			value?: { name?: string; custom?: Record<string, unknown> };
	  }
	| {
			type: 'category';
			value: { breadcrumb: string[] };
	  }
	| {
			type: 'product';
			value: InsiderProduct;
	  }
	| {
			type: 'cart';
			value: {
				total: number;
				items: InsiderCartItem[];
				shipping_cost?: number;
			};
	  }
	| {
			type: 'purchase';
			value: {
				order_id: string;
				total: number;
				items: InsiderCartItem[];
				shipping_cost?: number;
			};
	  };

declare global {
	interface Window {
		InsiderQueue?: { push: (...entries: unknown[]) => unknown };
	}
}

/** Insider tag and consent updates through its documented Web SDK queue. */
export const insiderManifest = {
	...vendorManifestContract,
	bootstrap: [{ name: 'InsiderQueue', type: 'setGlobal', value: [] }],
	category: '{{category}}',
	install: [
		{
			args: [{ type: 'user', value: { gdpr_optin: true } }],
			global: 'InsiderQueue',
			method: 'push',
			type: 'callGlobal',
		},
		{
			args: ['{{pageType}}'],
			global: 'InsiderQueue',
			method: 'push',
			type: 'callGlobal',
		},
		{
			args: [{ type: 'init' }],
			global: 'InsiderQueue',
			method: 'push',
			type: 'callGlobal',
		},
		{
			async: true,
			src: '{{scriptSrc}}',
			type: 'loadScript',
		},
	],
	onConsentDenied: [
		{
			args: [{ type: 'user', value: { gdpr_optin: false } }],
			global: 'InsiderQueue',
			method: 'push',
			type: 'callGlobal',
		},
		{
			args: [{ type: 'init' }],
			global: 'InsiderQueue',
			method: 'push',
			type: 'callGlobal',
		},
	],
	vendor: 'insider',
	vendorDetails: {
		homepageUrl: 'https://insiderone.com/',
		legalName: 'Insider PTE LTD',
		name: 'Insider One',
		privacyPolicyUrl: 'https://insiderone.com/privacy-policy/',
	},
} as const satisfies VendorManifest;

/** Account, page context, and consent condition for the Insider tag. */
export interface InsiderTagOptions {
	/** Public partner name supplied by Insider. Trimmed and lowercased. */
	partnerName: string;
	/** Public partner ID supplied by Insider. Surrounding spaces are trimmed. */
	partnerId: string;
	/**
	 * Complete page definition pushed between `user` and `init`.
	 * Only use `purchase` after a durable per-order guard permits the attempt.
	 * Use `other` on confirmation-page revisits and keep reload on revocation.
	 * @default { type: 'other' }
	 */
	pageType?: InsiderPageType;
	/**
	 * Consent condition required before any Insider globals or requests.
	 * @default 'marketing'
	 */
	category?: HasCondition<AllConsentNames>;
}

const PARTNER_NAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u;

/**
 * Creates an Insider tag gated on marketing consent by default.
 *
 * The helper always pushes `user.gdpr_optin: true`, page context, and `init`
 * before inserting the loader. Revocation pushes `user.gdpr_optin: false`
 * followed by `init`. Keep reload-on-revocation enabled: Insider can still
 * show cookieless campaigns, and removing a loader does not unload its SDK.
 *
 * @param options - Insider account, page context, and consent configuration.
 * @returns The consent-gated Insider script configuration.
 * @remarks A missing or blank required ID, or an invalid partner hostname,
 *   logs `insiderTag: missing or invalid <option>` with `console.error` and
 *   returns a script that never loads. Insider must enable Web SDK support
 *   for the account. Do not install it on pages containing payment card data.
 * @example
 * insiderTag({
 * 	partnerName: 'yourpartner',
 * 	partnerId: '123456',
 * 	pageType: { type: 'home' },
 * });
 * @see https://academy.insiderone.com/docs/integrate-insider-tag-into-your-website
 * @see https://academy.insiderone.com/docs/insider-web-sdk-integration-guide
 */
export const insiderTag = function insiderTag(
	options: InsiderTagOptions
): Script {
	const category = options?.category ?? 'marketing';
	const partnerName = readId(options?.partnerName)?.toLowerCase();
	if (partnerName === undefined || !PARTNER_NAME_PATTERN.test(partnerName)) {
		return skipMissingId('insiderTag', 'partnerName', {
			category,
			manifest: insiderManifest,
		});
	}
	const partnerId = readId(options?.partnerId);
	if (partnerId === undefined) {
		return skipMissingId('insiderTag', 'partnerId', {
			category,
			manifest: insiderManifest,
		});
	}

	return resolveManifest(insiderManifest, {
		category,
		pageType: options.pageType ?? { type: 'other' },
		scriptSrc: `https://${partnerName}.api.useinsider.com/ins.js?id=${encodeURIComponent(partnerId)}`,
	});
};
