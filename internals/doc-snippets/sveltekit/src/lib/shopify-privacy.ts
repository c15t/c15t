// #region docs:shopify-sveltekit-bridge title="src/lib/shopify-privacy.ts"
import { createShopifyCustomerPrivacy } from '@c15t/integrations/shopify';

// One bridge per page. Its `setup` holds Hydrogen's analytics until Shopify
// has the visitor's choice.
export const shopifyPrivacy = createShopifyCustomerPrivacy();
// #endregion docs:shopify-sveltekit-bridge
