// #region docs:shopify-config
import { defineConsentConfig } from 'c15t/next';

export default defineConsentConfig({
	options: {
		// The categories the Shopify bridge maps. Shopify's scripts load through
		// Hydrogen's `ShopifyScripts`, not `scripts`, so c15t can't discover them.
		consentCategories: ['measurement', 'marketing', 'functionality'],
	},
});
// #endregion docs:shopify-config
