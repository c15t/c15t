import type { StorefrontAnalytics } from '@shopify/hydrogen';

/**
 * Hydrogen's analytics bus, which `ShopifyScripts` puts on the page. Events
 * published before the visitor answers the c15t banner wait in the bus.
 */
export const getAnalytics = (): StorefrontAnalytics | null =>
	typeof window === 'undefined' ? null : (window.Shopify?.analytics ?? null);
