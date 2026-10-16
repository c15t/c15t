'use client';

import { metaPixelEvent } from '@c15t/integrations/meta-pixel';
import { useEventDispatcher, useSnapshot, useVendorAllowed } from 'c15t/next';
import { useCallback } from 'react';

import type { Product } from './products';

/** Tracking permissions at the time of an add-to-cart action. */
export interface TrackedAddToCart {
	/** Whether measurement allows analytics for this action. */
	analytics: boolean;
	/** Whether marketing and Meta's vendor permission allow this action. */
	meta: boolean;
}

/**
 * Attempts to send `add_to_cart` to the vendors the visitor allows and reports
 * the current permissions. The result does not confirm SDK or event delivery.
 */
export const useTrackAddToCart = () => {
	const snapshot = useSnapshot();
	// True only while marketing is allowed and the visitor hasn't switched
	// Meta off on its own.
	const metaAllowed = useVendorAllowed('meta-pixel');

	// The dispatcher uses the scripts registered on the provider and reads
	// consent when an event is sent. It drops the event while measurement is
	// denied. Otherwise it sends it to each script the visitor allows: a
	// `dataLayer` push for GTM, `gtag('event')` for GA4 and `posthog.capture`
	// for PostHog.
	const events = useEventDispatcher();

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
