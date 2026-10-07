import { building } from '$app/env';
import { loadConsent } from '@c15t/svelte/kit';

import { testBackend } from '#lib/test-backend.js';

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => ({
	// A prerendered page is built once and sent to every visitor, so it must
	// not carry one visitor's consent. The browser resolves it there instead.
	prefetch: building
		? undefined
		: await loadConsent(event, {
				backendURL: 'https://your-project.inth.app',
				...testBackend('backendURL'),
			}),
});
