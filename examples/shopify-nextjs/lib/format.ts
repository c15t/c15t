import { formatMoney } from '@shopify/hydrogen';
import type { MoneyV2 } from '@shopify/hydrogen';

export const money = (amount: MoneyV2): string =>
	formatMoney(amount, { locale: 'en-US' }).toString();

const shopifyImageHosts = ['cdn.shopify.com', 'mock.shop'];

/** Ask Shopify's CDN for an image at the width it will be shown. */
export const imageUrl = (url: string, width: number): string => {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return url;
	}
	const isShopify = shopifyImageHosts.some(
		(host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
	);
	if (!isShopify) {
		return url;
	}
	parsed.searchParams.set('width', String(width));
	return parsed.toString();
};
