import {
	createShopifyRequestContext,
	createStorefrontClient,
} from '@shopify/hydrogen';
import { headers } from 'next/headers';
import { cache } from 'react';

import { cartHandlers } from './cart-handlers';
import { i18n, storeDomain } from './shop';

/** One Storefront API client per server render, built from its headers. */
export const getStorefrontClient = cache(async () => {
	const requestContext = createShopifyRequestContext({
		i18n,
		request: { headers: await headers() },
	});
	return createStorefrontClient({
		config: { publicStorefrontToken: undefined, storeDomain },
		requestContext,
		type: 'public',
	});
});

/** The visitor's cart, read with the cart cookie on this request. */
export const getCart = async () => {
	const storefrontClient = await getStorefrontClient();
	const { data } = await cartHandlers.get({ storefrontClient });
	return data;
};
