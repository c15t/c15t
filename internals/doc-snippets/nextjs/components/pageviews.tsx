// #region docs:analytics-events title="components/pageviews.tsx"
'use client';

import { useEventDispatcher } from 'c15t/next';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Render once inside `ConsentRoot` in the root layout, wrapped in
 * `<Suspense>` because it reads `useSearchParams()`.
 */
export const Pageviews = () => {
	const events = useEventDispatcher({ pageviews: ['posthog'] });
	const pathname = usePathname();
	const search = useSearchParams().toString();
	useEffect(() => {
		events.pageview(search ? `${pathname}?${search}` : pathname);
	}, [events, pathname, search]);
	return null;
};
// #endregion docs:analytics-events
