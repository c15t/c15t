import { resolveConsent } from 'c15t/next/server';
import { headers } from 'next/headers';
import { after } from 'next/server';
import type { ReactNode } from 'react';

import { ConsentManager } from './consent-manager';

const backendURL = '/api/bench-consent';

/**
 * Resolve consent on the server from the manifest served by the cached
 * same-origin proxy route. The harness sends `x-c15t-bench-manifest-token`
 * to give a sample its own upstream manifest URL, which is a cold SDK
 * manifest cache in an otherwise warm process.
 */
export const ServerConsent = async ({ children }: { children: ReactNode }) => {
	const requestHeaders = await headers();
	const token = requestHeaders.get('x-c15t-bench-manifest-token');
	const manifestURL = token
		? `/api/c15t/manifest?cold=${encodeURIComponent(token)}`
		: '/api/c15t/manifest';
	const state = await resolveConsent({
		backendURL,
		manifestURL,
		waitUntil: (task) => after(() => task),
	});

	return <ConsentManager state={state}>{children}</ConsentManager>;
};
