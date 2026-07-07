import { prefetchInitialConsent } from '@c15t/svelte/server';
import type { LayoutServerLoad } from './$types';

/**
 * Server-side consent prefetch — @c15t/svelte's SSR entry point.
 *
 * Reads the consent cookie + geo/language/GPC headers, then resolves the
 * policy through `/api/c15t/init` (which itself resolves from the static
 * manifest fixture). The resulting KernelConfig is serialized to the
 * client and passed to <ConsentManagerProvider> as `prefetch`.
 */
export const load: LayoutServerLoad = async ({ request, fetch }) => {
	const consentPrefetch = await prefetchInitialConsent({
		headers: request.headers,
		backendURL: '/api/c15t',
		fetch,
		forwardHeaders: [
			'accept-language',
			'sec-gpc',
			'x-c15t-country',
			'x-c15t-region',
		],
	});
	return { consentPrefetch };
};
