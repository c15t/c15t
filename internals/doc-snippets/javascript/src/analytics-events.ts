// #region docs:analytics-events title="src/main.ts"
import { getEventDispatcher, hosted, init } from '@c15t/browser';

import { scripts } from './scripts';

const consent = init({
	mode: hosted({ backendURL: 'https://your-project.inth.app' }),
	scripts,
});

// One dispatcher for the page. It sends to the scripts above and checks
// consent each time an event goes out.
const events = getEventDispatcher(consent.runtime, { pageviews: ['posthog'] });

export const trackSearch = (resultCount: number) => {
	events.track('search', { resultCount });
};

// Call after each client-side navigation, such as from your router's
// navigation hook. The first call records the path without sending.
export const trackPageview = () => {
	events.pageview(location.pathname + location.search);
};
// #endregion docs:analytics-events
