import type { ShopifyScriptsShop } from '@shopify/hydrogen';

// mock.shop, Shopify's public demo store. Replace these with your shop's
// domain and IDs, and add a Storefront API token for a real shop.
export const storeDomain = 'mock.shop';

export const shop: ShopifyScriptsShop = {
	myshopifyDomain: storeDomain,
	shopId: 'gid://shopify/Shop/68817551382',
	storefrontId: '0',
};

// mock.shop sells only in Canada. Use your shop's market and currency.
export const i18n = { country: 'CA', language: 'EN' } as const;

export const currency = 'CAD';
