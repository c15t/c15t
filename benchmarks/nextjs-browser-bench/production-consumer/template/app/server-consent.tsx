import { resolveConsent } from 'c15t/next/server';
import { headers } from 'next/headers';
import { after } from 'next/server';
import type { ReactNode } from 'react';

import { ConsentManager } from './consent-manager';

const backendURL = '/api/bench-consent';

/**
 * Resolve consent on the server from the manifest the same-origin proxy
 * route serves, read at its source through the shared in-process cache: a
 * render never fetches the app's own `/api/c15t` routes. The harness sends
 * `x-c15t-bench-manifest-token` to give a sample its own upstream manifest
 * URL, which is a cold SDK manifest cache in an otherwise warm process.
 */
export const ServerConsent = async ({ children }: { children: ReactNode }) => {
	const requestHeaders = await headers();
	const token = requestHeaders.get('x-c15t-bench-manifest-token');
	const manifestURL = token
		? `${backendURL}/manifest?cold=${encodeURIComponent(token)}`
		: `${backendURL}/manifest`;
	const state = await resolveConsent({
		backendURL,
		manifestURL,
		waitUntil: (task) => after(() => task),
	});

	return <ConsentManager state={state}>{children}</ConsentManager>;
};
