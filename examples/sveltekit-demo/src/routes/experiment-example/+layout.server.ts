import { env } from '$env/dynamic/public';
import { loadConsent } from '@c15t/svelte/kit';

import type { LayoutServerLoad } from './$types';

// The `/consent-example` load, for the banner experiment route.
export const load: LayoutServerLoad = async (event) => ({
	prefetch: await loadConsent(event, {
		backendURL: env.PUBLIC_C15T_BACKEND_URL,
	}),
});
