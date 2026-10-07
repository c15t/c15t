'use client';

import { createEventDispatcher } from '@c15t/integrations/events';
import { metaPixelEvent } from '@c15t/integrations/meta-pixel';
import { useSnapshot, useVendorAllowed } from 'c15t/next';
import { useCallback, useMemo } from 'react';

import type { Product } from './products';
import { scripts } from './scripts';

/** Where an add-to-cart event went. */
export interface TrackedAddToCart {
	/** GTM, GA4 and PostHog: sent only while measurement is allowed. */
	analytics: boolean;
	/** Meta Pixel: sent only while marketing and Meta itself are allowed. */
	meta: boolean;
}

/**
 * Sends `add_to_cart` to the vendors the visitor allows, and reports which
 * ones got it so the page can say so.
 */
export const useTrackAddToCart = () => {
	const snapshot = useSnapshot();
	// True only while marketing is allowed and the visitor hasn't switched
	// Meta off on its own.
	const metaAllowed = useVendorAllowed('meta-pixel');

	// The dispatcher drops the event while measurement is denied. Otherwise
	// it sends it to each script the visitor allows: a `dataLayer` push for
	// GTM, `gtag('event')` for GA4 and `posthog.capture` for PostHog.
	const events = useMemo(
		() => createEventDispatcher({ getSnapshot: () => snapshot, scripts }),
		[snapshot]
	);

	return useCallback(
		(product: Product): TrackedAddToCart => {
			const { measurement } = snapshot.effectivePermissions;

			events.track('add_to_cart', {
				currency: 'USD',
				item_id: product.id,
				item_name: product.name,
				value: product.price,
			});

			// Meta isn't an analytics tool, so the dispatcher skips it. After a
			// revocation `fbq` still exists until the reload, so check the
			// permission, not the global.
			if (metaAllowed) {
				metaPixelEvent('AddToCart', {
					content_ids: [product.id],
					content_type: 'product',
					currency: 'USD',
					value: product.price,
				});
			}

			return { analytics: measurement, meta: metaAllowed };
		},
		[events, metaAllowed, snapshot]
	);
};
