// #region docs:shopify-analytics
'use client';

import { createShopifyCustomerPrivacy } from '@c15t/integrations/shopify';
import type { ShopifyScriptsI18n, ShopifyScriptsShop } from '@shopify/hydrogen';
import { ShopifyScripts } from '@shopify/hydrogen/react';
import { useSnapshot } from 'c15t/next';
import { useEffect } from 'react';

// One bridge per page. It sends each c15t choice to Shopify's Customer
// Privacy API, and its `setup` holds Hydrogen's analytics until the visitor
// has answered the banner.
const shopifyPrivacy = createShopifyCustomerPrivacy();

export const ShopifyAnalytics = ({
	i18n,
	shop,
}: {
	i18n: ShopifyScriptsI18n;
	shop: ShopifyScriptsShop;
}) => {
	const snapshot = useSnapshot();
	useEffect(() => shopifyPrivacy.update(snapshot), [snapshot]);

	return (
		<ShopifyScripts
			analytics={{ channel: 'headless' }}
			consent={{ mode: 'custom-banner', setup: shopifyPrivacy.setup }}
			i18n={i18n}
			shop={shop}
		/>
	);
};
// #endregion docs:shopify-analytics
