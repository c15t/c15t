// #region docs:analytics-events title="src/analytics-events.tsx"
import { useEventDispatcher } from 'c15t/react';
import { useEffect } from 'react';

/**
 * Sends a PostHog pageview for each new path. Call it once, inside
 * `ConsentProvider`, with your router's current path, such as
 * `useLocation().pathname` from React Router.
 */
export const usePageviews = (path: string) => {
	const events = useEventDispatcher({ pageviews: ['posthog'] });
	useEffect(() => {
		events.pageview(path);
	}, [events, path]);
};

export const SearchButton = ({ resultCount }: { resultCount: number }) => {
	const events = useEventDispatcher();
	return (
		<button
			type="button"
			onClick={() => {
				events.track('search', { resultCount });
			}}
		>
			Search
		</button>
	);
};
// #endregion docs:analytics-events
