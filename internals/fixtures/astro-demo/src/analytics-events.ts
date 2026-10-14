import { getEventDispatcher } from 'c15t/astro/client';

// One dispatcher for the page. It sends to the scripts in consent-client.ts
// and checks consent each time an event goes out.
const events = getEventDispatcher();

export const trackSearch = function trackSearch(resultCount: number) {
	events.track('search', { resultCount });
};
