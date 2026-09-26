'use client';

import { useEffect } from 'react';

/**
 * Third-party endpoint the network-blocker route gates (`COMPAT_TRACKER_RULES`).
 * The suite answers it with Playwright routing, so nothing leaves the machine.
 */
const TRACKER_URL = 'http://tracker.test/collect';

const sendTrackerRequest = async function sendTrackerRequest(when: string) {
	try {
		await fetch(`${TRACKER_URL}?when=${when}`, { method: 'POST' });
	} catch {
		// Only the request leaving the browser matters to the suite.
	}
};

// Fires when this client module evaluates. With Turbopack that happens while
// rendering its first element, inside the root; webpack evaluates it earlier,
// when the route's chunk loads.
if (typeof window !== 'undefined') {
	void sendTrackerRequest('module');
}

/** Tracker requests from a provider child's mount effect, by fetch and XHR. */
export const ChildBeacon = () => {
	useEffect(() => {
		void sendTrackerRequest('child');
		const xhr = new XMLHttpRequest();
		xhr.open('POST', `${TRACKER_URL}?when=child-xhr`);
		xhr.send();
	}, []);
	return null;
};
