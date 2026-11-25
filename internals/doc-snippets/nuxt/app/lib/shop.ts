import type { ShopifyScriptsI18n, ShopifyScriptsShop } from '@shopify/hydrogen';

// Type-check scaffolding for the Shopify snippets. A storefront builds these
// from its own environment and resolved market.
export const shop: ShopifyScriptsShop = {
	myshopifyDomain: 'your-shop.myshopify.com',
	shopId: '0',
	storefrontId: '0',
};

export const i18n: ShopifyScriptsI18n = { country: 'US', language: 'EN' };
