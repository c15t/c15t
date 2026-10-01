import { testBackend } from '$lib/test-backend';
import { loadConsent } from '@c15t/svelte/kit';

import type { LayoutServerLoad } from './$types';

// The `/consent-example` load, for the banner experiment route.
export const load: LayoutServerLoad = async (event) => ({
	prefetch: await loadConsent(event, {
		backendURL: 'https://your-project.inth.app',
		...testBackend('backendURL'),
	}),
});
