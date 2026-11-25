import { useRuntimeConfig } from 'nitropack/runtime';

import manifest from '#c15t/manifest-snapshot';

import { serverFetch } from './local-fetch';
import { createConsentRoute } from './route-factories';

export default createConsentRoute({
	fetch: serverFetch,
	manifest,
	useRuntimeConfig,
});
