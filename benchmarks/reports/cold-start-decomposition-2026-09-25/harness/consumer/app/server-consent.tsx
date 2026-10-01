// The marker imports bracket the evaluation of c15t/next/server. Keep all
// three first and in this order.
import './mark-before-server';
import { resolveConsent } from 'c15t/next/server';

import './mark-after-server';

import { headers } from 'next/headers';
import { after } from 'next/server';
import type { ReactNode } from 'react';

import { mark, markSince } from './bench-timing';
import { ConsentManager } from './consent-manager';

const backendURL =
	process.env.C15T_BENCH_BACKEND_URL ?? 'http://127.0.0.1:4790';

/**
 * Resolve consent on the server from the same-origin manifest proxy, as the
 * docs site does. The harness sends `x-c15t-bench-manifest-token` to give a
 * sample its own upstream manifest URL, which is a cold SDK manifest cache in
 * an otherwise warm process.
 */
export const ServerConsent = async ({ children }: { children: ReactNode }) => {
	const requestHeaders = await headers();
	const token = requestHeaders.get('x-c15t-bench-manifest-token');
	const query = token ? `?cold=${encodeURIComponent(token)}` : '';
	// `direct` points resolveConsent at the backend itself instead of the
	// same-origin proxy route, which the option's docs also allow.
	const manifestURL =
		requestHeaders.get('x-c15t-bench-manifest-source') === 'direct'
			? `${backendURL}/manifest${query}`
			: `/c15t/manifest${query}`;
	const start = mark('resolveConsent:start');
	const state = await resolveConsent({
		backendURL,
		manifestURL,
		onError: (error: unknown) => {
			mark('resolveConsent:error', { message: String(error) });
		},
		waitUntil: (task) => after(() => task),
	});
	markSince('resolveConsent:end', start, { keys: Object.keys(state) });

	return <ConsentManager state={state}>{children}</ConsentManager>;
};
