'use client';

import { AnalyticsEvent } from '@shopify/hydrogen';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { getAnalytics } from '@/lib/analytics';

/** Publishes a page view for each route. Render it inside `<Suspense>`. */
export const PageViewTracker = () => {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const pageKey = `${pathname}?${searchParams.toString()}`;
	const viewed = useRef<string | null>(null);

	useEffect(() => {
		if (viewed.current === pageKey) {
			return;
		}
		viewed.current = pageKey;
		getAnalytics()?.publish(AnalyticsEvent.PAGE_VIEWED);
	}, [pageKey]);

	return null;
};
