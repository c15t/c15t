// #region docs:analytics-events title="src/components/pageviews.tsx"
import { useLocation } from '@tanstack/react-router';
import { useEventDispatcher } from 'c15t/tanstack-start';
import { useEffect } from 'react';

/** Render once inside `ConsentRoot`, such as in the root route. */
export const Pageviews = () => {
	const events = useEventDispatcher({ pageviews: ['posthog'] });
	const pathname = useLocation({ select: (location) => location.pathname });
	useEffect(() => {
		events.pageview(pathname);
	}, [events, pathname]);
	return null;
};
// #endregion docs:analytics-events
