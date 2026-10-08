import { useRuntimeConfig } from 'nitropack/runtime';

import manifest from '#c15t/manifest-snapshot';

import { serverFetch } from './local-fetch';
import { createInitRoute } from './route-factories';

export default createInitRoute({
	fetch: serverFetch,
	manifest,
	useRuntimeConfig,
});
