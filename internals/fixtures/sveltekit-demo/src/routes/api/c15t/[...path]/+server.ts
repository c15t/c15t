import { createConsentRoute } from '@c15t/svelte/kit';

import { testBackend } from '#lib/test-backend.js';

// GET /api/c15t/init resolves the visitor from the cached policy manifest.
// GET /api/c15t/manifest serves that manifest. Other methods are not handled:
// the browser saves consent to the backend URL directly.
export const { GET } = createConsentRoute({
	backendURL: 'https://your-project.inth.app',
	...testBackend('backendURL'),
});
