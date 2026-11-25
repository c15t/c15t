// #region docs:shopify-astro-bridge title="src/lib/shopify-privacy.ts"
import { createShopifyCustomerPrivacy } from '@c15t/integrations/shopify';

// One bridge per page. Its `setup` holds Hydrogen's analytics until Shopify
// has the visitor's choice.
export const shopifyPrivacy = createShopifyCustomerPrivacy();

// The same settings go to the server-rendered tags and the browser start.
export const shopifyConsent = {
	mode: 'custom-banner',
	setup: shopifyPrivacy.setup,
} as const;
// #endregion docs:shopify-astro-bridge
