// #region docs:shopify-analytics
'use client';

import { createShopifyCustomerPrivacy } from '@c15t/integrations/shopify';
import type { ShopifyScriptsI18n, ShopifyScriptsShop } from '@shopify/hydrogen';
import { ShopifyScripts } from '@shopify/hydrogen/react';
import { useSnapshot } from 'c15t/next';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// One bridge per page. It sends each c15t choice to Shopify's Customer
// Privacy API, and its `setup` holds Hydrogen's analytics until Shopify has
// the visitor's choice.
const shopifyPrivacy = createShopifyCustomerPrivacy();

/** Hydrogen's scripts and analytics bus. Render it in the document head. */
export const ShopifyAnalytics = ({
	i18n,
	shop,
}: {
	i18n: ShopifyScriptsI18n;
	shop: ShopifyScriptsShop;
}) => {
	const router = useRouter();
	return (
		<ShopifyScripts
			analytics={{ channel: 'headless' }}
			consent={{ mode: 'custom-banner', setup: shopifyPrivacy.setup }}
			i18n={i18n}
			// Shopify's scripts route storefront links through Next's router.
			navigate={(url) => router.push(url)}
			shop={shop}
		/>
	);
};

/** Feeds each c15t snapshot to the bridge. Render it inside `ConsentRoot`. */
export const ShopifyConsentSync = () => {
	const snapshot = useSnapshot();
	useEffect(() => shopifyPrivacy.update(snapshot), [snapshot]);
	return null;
};
// #endregion docs:shopify-analytics
