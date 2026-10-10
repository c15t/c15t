// #region docs:analytics-events
import { createEventDispatcher } from '@c15t/integrations/events';
import { getConsentClient } from 'c15t/astro/client';

import consentClient from './c15t.client';

export const trackSearch = function trackSearch(resultCount: number) {
	const client = getConsentClient();
	if (!client) {
		return;
	}
	const events = createEventDispatcher({
		getSnapshot: client.getConsent,
		scripts: consentClient.scripts ?? [],
	});
	events.track('search', { resultCount });
};
// #endregion docs:analytics-events
