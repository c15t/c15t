import { GET as getAdditionalConsentProviders } from '../app/api/additional-consent/route';

/**
 * Answers the backend's provider list requests with the playground's own
 * route, in process. Fetching the route over the network would need an
 * absolute URL, and building one from the request's host would let a forged
 * `Host` header point the server's fetch anywhere. The base only lets the
 * route parse the path; nothing is requested from it. The caller's abort
 * signal reaches the route's request to Google, so the backend's timeout
 * still applies.
 */
export const fetchDemoProviders = ((
	input: RequestInfo | URL,
	init?: RequestInit
) =>
	getAdditionalConsentProviders(
		new Request(new URL(String(input), 'http://playground.invalid'), {
			signal: init?.signal ?? null,
		})
	)) as typeof globalThis.fetch;
