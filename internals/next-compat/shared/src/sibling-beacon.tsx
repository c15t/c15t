'use client';

import { useEffect } from 'react';

const sendSiblingRequest = async function sendSiblingRequest() {
	try {
		await fetch('http://tracker.test/collect?when=sibling', { method: 'POST' });
	} catch {
		// Only the request leaving the browser matters to the suite.
	}
};

/**
 * A tracker request from a component rendered next to the root, not inside
 * it. Kept apart from `network-beacons.tsx` so importing it does not
 * evaluate that module before the root renders.
 */
export const SiblingBeacon = () => {
	useEffect(() => {
		void sendSiblingRequest();
	}, []);
	return null;
};
